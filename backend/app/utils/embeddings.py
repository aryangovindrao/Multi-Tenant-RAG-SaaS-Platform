"""
Purpose
-------
Wraps the SentenceTransformer model used to turn text into 384-dim vectors.

Two important real-world details:
  1. The model is heavy (~90 MB) and slow to load, so it is loaded **once**
     (lazy singleton) and reused for the process lifetime.
  2. `model.encode(...)` is synchronous and CPU-bound. Calling it directly in an
     async handler would block the event loop, so we run it in a worker thread
     via `anyio.to_thread.run_sync`.

Functions
    get_model()                       -> SentenceTransformer  (cached)
    embed_text(text)        (async)   -> list[float]
    embed_texts(texts)      (async)   -> list[list[float]]

Dependencies: sentence-transformers, anyio.
"""

from __future__ import annotations

import anyio

from app.core.config import settings

# Imported lazily inside get_model() so importing this module (e.g. in tests)
# doesn't trigger the multi-second model download.
_model = None


def get_model():
    """Return the process-wide SentenceTransformer, loading it on first use."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def _encode(texts: list[str]) -> list[list[float]]:
    model = get_model()
    # normalize_embeddings=True → unit vectors, so cosine distance behaves well.
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return vectors.tolist()


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of strings without blocking the event loop."""
    if not texts:
        return []
    return await anyio.to_thread.run_sync(_encode, texts)


async def embed_text(text: str) -> list[float]:
    """Embed a single string (e.g. a user's question)."""
    [vector] = await embed_texts([text])
    return vector
