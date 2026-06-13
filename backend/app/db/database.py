"""
Purpose
-------
Owns the SQLAlchemy 2.0 async engine, the session factory, the declarative
`Base` that every model inherits, and a one-time `init_db()` that prepares the
PostgreSQL database (pgvector extension + tables + the vector index).

Responsibilities
    - Create a single async engine for the whole app (connection pooling).
    - Provide `Base` for the ORM models.
    - Bootstrap the schema on startup (dev convenience; use Alembic in prod).

Dependencies: sqlalchemy[asyncio], asyncpg, pgvector.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


# SQLite (local dev) and PostgreSQL (prod) need different engine options.
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_engine_kwargs: dict = {"echo": settings.DEBUG, "pool_pre_ping": True}
if _is_sqlite:
    # aiosqlite runs in a worker thread; relax thread check + add a busy timeout
    # so the upload + background-ingestion writes don't trip "database is locked".
    _engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
else:
    _engine_kwargs.update(pool_size=10, max_overflow=20)

# echo=DEBUG prints SQL — handy while learning, noisy in prod.
engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Exposed so the RAG layer can pick pgvector SQL vs in-Python similarity.
IS_SQLITE = engine.dialect.name == "sqlite"

# expire_on_commit=False keeps ORM objects usable after commit (we return them
# from request handlers, so their attributes must stay loaded).
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """
    Idempotent startup bootstrap:
      1. enable the pgvector extension,
      2. create all tables from the ORM metadata,
      3. create an HNSW index for fast cosine similarity search.

    In a real deployment you'd do (2) and (3) with Alembic migrations instead,
    but for a student project create_all keeps the feedback loop short.
    """
    # Import models so they are registered on Base.metadata before create_all.
    from app import models  # noqa: F401  (side-effect import)

    async with engine.begin() as conn:
        if not IS_SQLITE:
            # pgvector extension must exist before the embedding column is created.
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        await conn.run_sync(Base.metadata.create_all)

        if not IS_SQLITE:
            # HNSW index for approximate-nearest-neighbour cosine search.
            # (SQLite has no vector index; we do similarity in Python instead.)
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw "
                    "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
                )
            )


async def dispose_db() -> None:
    """Cleanly close the connection pool on shutdown."""
    await engine.dispose()
