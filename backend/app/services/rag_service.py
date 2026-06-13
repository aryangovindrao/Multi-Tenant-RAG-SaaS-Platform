"""
rag_service — the Retrieval-Augmented Generation pipeline.

End-to-end flow for a question:
    generate_embedding(question)            # 1. embed the query
        → retrieve_chunks(...)              # 2. cosine-NN search in pgvector,
                                            #    filtered to the caller's tenant
        → build_prompt(question, chunks)    # 3. stuff retrieved text + rules
        → generate_answer(...) / stream     # 4. ask the LLM, grounded on (3)
    → (answer, citations, token usage)

Provider-agnostic: Groq (free), OpenAI, or a dependency-free "mock" mode so the
whole pipeline runs and is gradeable without any API key.

Functions
    generate_embedding(text)
    retrieve_chunks(db, org_id, query_embedding, k)
    build_prompt(question, chunks) -> (system, user)
    generate_answer(provider, system, user) -> (answer, usage)
    stream_answer(provider, system, user)   -> async token generator
    answer_question(db, ctx, question)       -> orchestrates the whole flow
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import IS_SQLITE
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.schemas.chat import Citation
from app.utils.embeddings import embed_text


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    page: int
    content: str
    score: float  # cosine similarity in [0, 1]


@dataclass
class RagResult:
    answer: str
    citations: list[Citation] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0


# ── 1. Embedding ──────────────────────────────────────────────────────────────
async def generate_embedding(text: str) -> list[float]:
    return await embed_text(text)


# ── 2. Retrieval (tenant-isolated vector search) ──────────────────────────────
async def retrieve_chunks(
    db: AsyncSession,
    org_id: uuid.UUID,
    query_embedding: list[float],
    k: int = settings.RAG_TOP_K,
    document_ids: list[uuid.UUID] | None = None,
) -> list[RetrievedChunk]:
    """
    Top-k nearest chunks by cosine distance, restricted to READY documents in
    this organization. The org filter sits in the same WHERE clause as the
    vector ordering, so cross-tenant chunks can never be returned.

    `document_ids` scopes retrieval to a subset of the org's documents
    (multi-doc chat); None searches the whole corpus. Because the org filter is
    always applied too, passing foreign ids simply matches nothing — safe.

    On SQLite (local dev) there is no vector operator, so we load this tenant's
    chunks and rank them in Python. Embeddings are L2-normalized, so cosine
    similarity is just the dot product.
    """
    if IS_SQLITE:
        return await _retrieve_chunks_sqlite(
            db, org_id, query_embedding, k, document_ids
        )

    distance = DocumentChunk.embedding.cosine_distance(query_embedding)
    stmt = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            Document.name,
            DocumentChunk.page,
            DocumentChunk.content,
            distance.label("distance"),
        )
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            DocumentChunk.organization_id == org_id,
            Document.status == DocumentStatus.READY,
        )
        .order_by(distance)
        .limit(k)
    )
    if document_ids:
        stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))
    rows = (await db.execute(stmt)).all()
    return [
        RetrievedChunk(
            chunk_id=row.id,
            document_id=row.document_id,
            document_name=row.name,
            page=row.page,
            content=row.content,
            score=max(0.0, 1.0 - float(row.distance)),
        )
        for row in rows
    ]


async def _retrieve_chunks_sqlite(
    db: AsyncSession,
    org_id: uuid.UUID,
    query_embedding: list[float],
    k: int,
    document_ids: list[uuid.UUID] | None = None,
) -> list[RetrievedChunk]:
    """Brute-force cosine similarity in Python (fine for local-dev data sizes)."""
    stmt = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            Document.name,
            DocumentChunk.page,
            DocumentChunk.content,
            DocumentChunk.embedding,
        )
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            DocumentChunk.organization_id == org_id,
            Document.status == DocumentStatus.READY,
        )
    )
    if document_ids:
        stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))
    rows = (await db.execute(stmt)).all()

    def similarity(emb: list[float]) -> float:
        # both vectors are unit-length → cosine similarity == dot product
        return sum(a * b for a, b in zip(query_embedding, emb))

    ranked = sorted(rows, key=lambda r: similarity(r.embedding), reverse=True)[:k]
    return [
        RetrievedChunk(
            chunk_id=r.id,
            document_id=r.document_id,
            document_name=r.name,
            page=r.page,
            content=r.content,
            score=max(0.0, similarity(r.embedding)),
        )
        for r in ranked
    ]


def chunks_to_citations(chunks: list[RetrievedChunk]) -> list[Citation]:
    return [
        Citation(
            document_id=c.document_id,
            document_name=c.document_name,
            page=c.page,
            snippet=c.content[:240].strip(),
            score=round(c.score, 4),
        )
        for c in chunks
    ]


# ── 3. Prompt construction ────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are Cortex, a helpful assistant that answers questions strictly using "
    "the provided context from the user's documents. Cite sources inline as "
    "[1], [2], etc. matching the numbered context blocks. If the answer is not "
    "in the context, say you couldn't find it in the documents — do not invent "
    "facts."
)


def build_prompt(question: str, chunks: list[RetrievedChunk]) -> tuple[str, str]:
    """Return (system_prompt, user_prompt). Context blocks are numbered so the
    model's [n] citations line up with our Citation list order."""
    if not chunks:
        context = "(no relevant context found)"
    else:
        context = "\n\n".join(
            f"[{i + 1}] (source: {c.document_name}, p.{c.page})\n{c.content}"
            for i, c in enumerate(chunks)
        )
    user_prompt = (
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer using only the context above and cite sources as [n]."
    )
    return SYSTEM_PROMPT, user_prompt


# ── 4. Generation ─────────────────────────────────────────────────────────────
def _resolve_provider(provider: str | None) -> str:
    """Pick the effective provider, degrading to 'mock' if its key is missing so
    the pipeline always runs instead of 500-ing on an unconfigured key."""
    p = (provider or settings.LLM_PROVIDER or "mock").lower()
    if p == "groq" and not settings.GROQ_API_KEY:
        return "mock"
    if p == "openai" and not settings.OPENAI_API_KEY:
        return "mock"
    return p


def _get_chat_model(provider: str):
    """Build a LangChain chat model for the provider (raises if unconfigured)."""
    if provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.2,
            streaming=True,
        )
    if provider == "groq":
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.2,
        )
    raise ValueError(f"Unknown LLM provider: {provider}")


def _mock_answer(system: str, user: str) -> str:
    """Deterministic offline answer so the pipeline works without API keys."""
    question = user.split("Question:")[-1].split("\n")[0].strip()
    has_context = "(no relevant context found)" not in user
    if not has_context:
        return (
            f"I couldn't find anything about \"{question}\" in your documents. "
            "Try uploading a relevant file first."
        )
    return (
        f"Based on your documents, here's what I found regarding \"{question}\" "
        "[1]. This is a mock response generated without a live LLM — set "
        "`LLM_PROVIDER=groq` and a free GROQ_API_KEY for real answers."
    )


async def generate_answer(
    provider: str | None, system: str, user: str
) -> tuple[str, int, int]:
    """Non-streaming generation. Returns (answer, input_tokens, output_tokens)."""
    provider = _resolve_provider(provider)
    if provider == "mock":
        return _mock_answer(system, user), 0, 0

    from langchain_core.messages import HumanMessage, SystemMessage

    model = _get_chat_model(provider)
    response = await model.ainvoke(
        [SystemMessage(content=system), HumanMessage(content=user)]
    )
    usage = getattr(response, "usage_metadata", None) or {}
    return (
        response.content,
        int(usage.get("input_tokens", 0)),
        int(usage.get("output_tokens", 0)),
    )


async def stream_answer(provider: str | None, system: str, user: str):
    """Async generator yielding answer tokens as they are produced."""
    provider = _resolve_provider(provider)
    if provider == "mock":
        for word in _mock_answer(system, user).split(" "):
            yield word + " "
        return

    from langchain_core.messages import HumanMessage, SystemMessage

    model = _get_chat_model(provider)
    async for chunk in model.astream(
        [SystemMessage(content=system), HumanMessage(content=user)]
    ):
        if chunk.content:
            yield chunk.content


# ── Orchestration ─────────────────────────────────────────────────────────────
async def answer_question(
    db: AsyncSession,
    org_id: uuid.UUID,
    provider: str | None,
    question: str,
    document_ids: list[uuid.UUID] | None = None,
) -> tuple[RagResult, list[RetrievedChunk]]:
    """Run the full non-streaming pipeline and return the result + raw chunks."""
    embedding = await generate_embedding(question)
    chunks = await retrieve_chunks(db, org_id, embedding, document_ids=document_ids)
    system, user = build_prompt(question, chunks)
    answer, in_tok, out_tok = await generate_answer(provider, system, user)
    result = RagResult(
        answer=answer,
        citations=chunks_to_citations(chunks),
        input_tokens=in_tok,
        output_tokens=out_tok,
    )
    return result, chunks
