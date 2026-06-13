"""
Application entrypoint.

Responsibilities
    - Build the FastAPI app + OpenAPI docs.
    - Configure CORS for the Next.js frontend (incl. the X-Organization-Id header).
    - Bootstrap the database on startup (pgvector + tables + index) and dispose
      the pool on shutdown, via the lifespan handler.
    - Mount every API router under /api/v1.

Run locally:  uvicorn app.main:app --reload
Docs:         http://localhost:8000/api/v1/docs
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    analytics,
    auth,
    chat,
    documents,
    members,
    organizations,
    settings as settings_api,
)
from app.core.config import settings
from app.db.database import dispose_db, init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    # ── startup ──
    await init_db()
    yield
    # ── shutdown ──
    await dispose_db()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Multi-tenant AI RAG backend for the Cortex platform.",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  # includes Authorization and X-Organization-Id
    expose_headers=["*"],
)

# ── Routers (all under /api/v1) ───────────────────────────────────────────────
api_prefix = settings.API_V1_PREFIX
for module in (
    auth,
    organizations,
    documents,
    chat,
    analytics,
    members,
    settings_api,
):
    app.include_router(module.router, prefix=api_prefix)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {"service": settings.APP_NAME, "status": "ok", "docs": app.docs_url}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
