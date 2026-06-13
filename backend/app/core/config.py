"""
Purpose
-------
Single source of truth for all runtime configuration. Reads from environment
variables (and a local `.env` file) and exposes a typed, validated `settings`
singleton that every other module imports.

Why a settings object?
    - No `os.getenv` scattered across the codebase.
    - Pydantic validates types at startup, so a misconfigured deployment fails
      fast instead of at the first request.

Dependencies: pydantic-settings.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Cortex API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    # CORS — the Next.js frontend origin(s). Comma-separated in .env.
    CORS_ORIGINS: str = "http://localhost:3000"

    # ── Database ─────────────────────────────────────────────────────────────
    # Local dev default: a SQLite file (no server needed).
    # Production: set DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
    # in .env to use PostgreSQL + pgvector — the code adapts automatically.
    DATABASE_URL: str = "sqlite+aiosqlite:///./cortex.db"

    # ── JWT / Auth ───────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth (token exchange from the frontend's NextAuth flow)
    GOOGLE_CLIENT_ID: str = ""

    # ── File uploads ─────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 50
    ALLOWED_MIME_TYPES: str = (
        "application/pdf,"
        "text/plain,"
        "text/markdown,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    # ── Embeddings ───────────────────────────────────────────────────────────
    # all-MiniLM-L6-v2 → 384-dim vectors. If you change the model, change the
    # dimension too AND re-embed existing chunks (the pgvector column is fixed).
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    # ── RAG / LLM ────────────────────────────────────────────────────────────
    # Groq has a generous FREE tier with an OpenAI-compatible API and very fast
    # inference. Get a key at https://console.groq.com (no credit card needed).
    LLM_PROVIDER: Literal["groq", "openai", "mock"] = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    RAG_TOP_K: int = 5             # how many chunks to retrieve per question
    CHUNK_SIZE: int = 1000         # characters per chunk
    CHUNK_OVERLAP: int = 150       # character overlap between adjacent chunks

    # ── Derived helpers ──────────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_mime_list(self) -> list[str]:
        return [m.strip() for m in self.ALLOWED_MIME_TYPES.split(",") if m.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Cached so the .env file is parsed exactly once per process."""
    return Settings()


settings = get_settings()
