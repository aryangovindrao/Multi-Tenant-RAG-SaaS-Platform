"""
chat_service — conversation sessions, message persistence, and the two ways to
run a RAG turn (blocking `chat()` and streaming `stream_chat()`).

Chat flow (POST /chat):
    ensure session → save user message → rag_service.answer_question
    → save assistant message (with citations) → track QUERY_EXECUTED → respond

Functions
    create_session / list_sessions / delete_session
    get_chat_history(db, ctx, session_id)
    save_message(db, session_id, role, content, citations)
    suggested_questions(db, ctx, session_id)
    chat(db, ctx, request)             -> ChatResponse   (blocking)
    stream_chat(db, ctx, session_id, content)            -> SSE event generator
"""

from __future__ import annotations

import time
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext
from app.models.analytics import EventType
from app.models.chat import ChatSession, Message, MessageRole
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    Citation,
    ConversationOut,
    MessageOut,
)
from app.schemas.document import Paginated
from app.services import analytics_service, rag_service


# ── Sessions ──────────────────────────────────────────────────────────────────
async def _message_count(db: AsyncSession, session_id: uuid.UUID) -> int:
    return (
        await db.scalar(
            select(func.count(Message.id)).where(Message.session_id == session_id)
        )
    ) or 0


def _to_conversation_out(session: ChatSession, count: int) -> ConversationOut:
    return ConversationOut(
        id=session.id,
        title=session.title,
        document_ids=session.document_ids or [],
        message_count=count,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


async def create_session(
    db: AsyncSession,
    ctx: TenantContext,
    document_ids: list[uuid.UUID] | None = None,
) -> ConversationOut:
    session = ChatSession(
        organization_id=ctx.org_id,
        user_id=ctx.user.id,
        # store as strings so the JSON column round-trips cleanly on SQLite + PG
        document_ids=[str(d) for d in document_ids] if document_ids else None,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _to_conversation_out(session, 0)


def _session_doc_ids(session: ChatSession) -> list[uuid.UUID] | None:
    """Parse the stored scope back into UUIDs (None = whole-corpus search)."""
    if not session.document_ids:
        return None
    return [uuid.UUID(str(d)) for d in session.document_ids]


async def list_sessions(
    db: AsyncSession, ctx: TenantContext, page_size: int = 50
) -> Paginated[ConversationOut]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.organization_id == ctx.org_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(page_size)
    )
    sessions = result.scalars().all()
    items = [_to_conversation_out(s, await _message_count(db, s.id)) for s in sessions]
    return Paginated(items=items, total=len(items), page=1, page_size=page_size)


async def _get_owned_session(
    db: AsyncSession, ctx: TenantContext, session_id: uuid.UUID
) -> ChatSession:
    """Fetch a session, enforcing it belongs to the caller's organization."""
    session = await db.scalar(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.organization_id == ctx.org_id,  # tenant isolation
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return session


async def delete_session(
    db: AsyncSession, ctx: TenantContext, session_id: uuid.UUID
) -> None:
    session = await _get_owned_session(db, ctx, session_id)
    await db.delete(session)
    await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────────
def _to_message_out(m: Message) -> MessageOut:
    citations = [Citation(**c) for c in (m.citations or [])] if m.citations else None
    return MessageOut(
        id=m.id,
        conversation_id=m.session_id,
        role=m.role,
        content=m.content,
        citations=citations,
        created_at=m.created_at,
    )


async def get_chat_history(
    db: AsyncSession, ctx: TenantContext, session_id: uuid.UUID
) -> list[MessageOut]:
    await _get_owned_session(db, ctx, session_id)
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    return [_to_message_out(m) for m in result.scalars().all()]


async def save_message(
    db: AsyncSession,
    session_id: uuid.UUID,
    role: MessageRole,
    content: str,
    citations: list[Citation] | None = None,
) -> Message:
    message = Message(
        session_id=session_id,
        role=role,
        content=content,
        citations=(
            [c.model_dump(by_alias=True, mode="json") for c in citations]
            if citations
            else None
        ),
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


def _maybe_title(session: ChatSession, first_question: str) -> None:
    """Name an untitled session after its first question."""
    if session.title in ("", "New chat"):
        session.title = first_question[:60] + ("…" if len(first_question) > 60 else "")


def _analytics_meta(
    chunks, input_tokens: int, output_tokens: int, latency_ms: int
) -> dict:
    return {
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "latencyMs": latency_ms,
        "documentIds": list({str(c.document_id) for c in chunks}),
        "documentNames": {str(c.document_id): c.document_name for c in chunks},
    }


# ── Blocking RAG turn (POST /chat) ────────────────────────────────────────────
async def chat(
    db: AsyncSession, ctx: TenantContext, request: ChatRequest
) -> ChatResponse:
    # 1. resolve or create the session
    if request.session_id:
        session = await _get_owned_session(db, ctx, request.session_id)
    else:
        session = ChatSession(organization_id=ctx.org_id, user_id=ctx.user.id)
        db.add(session)
        await db.flush()

    # 2. persist the user's question
    db.add(Message(session_id=session.id, role=MessageRole.USER, content=request.content))
    _maybe_title(session, request.content)
    await db.commit()

    # 3. run the RAG pipeline (scoped to the session's documents, if any)
    started = time.perf_counter()
    result, chunks = await rag_service.answer_question(
        db,
        ctx.org_id,
        ctx.organization.llm_provider,
        request.content,
        document_ids=_session_doc_ids(session),
    )
    latency_ms = int((time.perf_counter() - started) * 1000)

    # 4. persist the answer + citations
    assistant = await save_message(
        db, session.id, MessageRole.ASSISTANT, result.answer, result.citations
    )

    # 5. record analytics (tokens, latency, referenced docs)
    await analytics_service.track_event(
        db,
        ctx.org_id,
        ctx.user.id,
        EventType.QUERY_EXECUTED,
        _analytics_meta(chunks, result.input_tokens, result.output_tokens, latency_ms),
        commit=True,
    )

    return ChatResponse(
        session_id=session.id,
        message_id=assistant.id,
        answer=result.answer,
        citations=result.citations,
    )


# ── Streaming RAG turn (POST /conversations/{id}/messages/stream) ──────────────
async def stream_chat(
    db: AsyncSession, ctx: TenantContext, session_id: uuid.UUID, content: str
):
    """
    Async generator yielding (event_name, payload) tuples. The API layer turns
    these into Server-Sent Events. Order: citations → token* → done (or error).
    """
    session = await _get_owned_session(db, ctx, session_id)

    # persist the question + title first
    db.add(Message(session_id=session.id, role=MessageRole.USER, content=content))
    _maybe_title(session, content)
    await db.commit()

    started = time.perf_counter()
    try:
        # retrieve up-front so we can emit citations immediately
        embedding = await rag_service.generate_embedding(content)
        chunks = await rag_service.retrieve_chunks(
            db, ctx.org_id, embedding, document_ids=_session_doc_ids(session)
        )
        citations = rag_service.chunks_to_citations(chunks)
        system, user = rag_service.build_prompt(content, chunks)

        yield ("citations", [c.model_dump(by_alias=True, mode="json") for c in citations])

        # stream the answer token by token
        answer_parts: list[str] = []
        async for token in rag_service.stream_answer(
            ctx.organization.llm_provider, system, user
        ):
            answer_parts.append(token)
            yield ("token", {"delta": token})

        answer = "".join(answer_parts)
        assistant = await save_message(
            db, session.id, MessageRole.ASSISTANT, answer, citations
        )

        latency_ms = int((time.perf_counter() - started) * 1000)
        await analytics_service.track_event(
            db,
            ctx.org_id,
            ctx.user.id,
            EventType.QUERY_EXECUTED,
            _analytics_meta(
                chunks,
                input_tokens=len(user.split()),
                output_tokens=len(answer.split()),
                latency_ms=latency_ms,
            ),
            commit=True,
        )

        yield ("done", {"messageId": str(assistant.id)})
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        yield ("error", {"message": "Failed to generate a response. Please try again."})
        raise exc from None


# ── Suggested questions ───────────────────────────────────────────────────────
async def suggested_questions(
    db: AsyncSession, ctx: TenantContext, session_id: uuid.UUID
) -> list[str]:
    """Lightweight starter prompts (tailored if the org has documents)."""
    from app.models.document import Document, DocumentStatus

    recent = await db.scalar(
        select(Document.name)
        .where(
            Document.organization_id == ctx.org_id,
            Document.status == DocumentStatus.READY,
        )
        .order_by(Document.created_at.desc())
        .limit(1)
    )
    if recent:
        return [
            f"Summarize the key points of {recent}",
            f"What are the main conclusions in {recent}?",
            "What topics do my documents cover?",
            "List any action items mentioned in my documents.",
        ]
    return [
        "What can you help me with?",
        "How do I get better answers?",
        "What kinds of documents can I upload?",
        "Summarize my knowledge base.",
    ]
