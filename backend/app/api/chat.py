"""
Chat API.

Prompt endpoints:
    POST /chat               run a RAG turn, return the full answer + citations
    GET  /chat/history       messages for a session (?sessionId=...)
    POST /chat/new-session   start a new conversation

Frontend (conversation-oriented) endpoints — same handlers, REST shape:
    GET    /conversations
    POST   /conversations
    DELETE /conversations/{id}
    GET    /conversations/{id}/messages
    GET    /conversations/{id}/suggestions
    POST   /conversations/{id}/messages/stream     ← Server-Sent Events

RAG flow (per turn): question → embedding → similarity search (tenant-scoped)
→ retrieve top-k chunks → build grounded prompt → LLM → answer + citations,
persisted to the messages table and logged to analytics.
"""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant
from app.db.session import get_db
from app.schemas.base import CamelModel
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationOut,
    MessageOut,
    NewSessionRequest,
)
from app.schemas.document import Paginated
from app.services import chat_service

router = APIRouter(tags=["chat"])


class StreamMessageRequest(CamelModel):
    content: str


# ── Prompt-style endpoints ────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.chat(db, ctx, payload)


@router.get("/chat/history", response_model=list[MessageOut])
async def chat_history(
    session_id: uuid.UUID = Query(..., alias="sessionId"),
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.get_chat_history(db, ctx, session_id)


@router.post(
    "/chat/new-session",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
async def new_session(
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.create_session(db, ctx)


# ── Conversation REST endpoints (frontend) ────────────────────────────────────
@router.get("/conversations", response_model=Paginated[ConversationOut])
async def list_conversations(
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.list_sessions(db, ctx)


@router.post(
    "/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: NewSessionRequest | None = None,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.create_session(
        db, ctx, payload.document_ids if payload else None
    )


@router.delete("/conversations/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    session_id: uuid.UUID,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    await chat_service.delete_session(db, ctx, session_id)
    return None


@router.get(
    "/conversations/{session_id}/messages", response_model=list[MessageOut]
)
async def conversation_messages(
    session_id: uuid.UUID,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.get_chat_history(db, ctx, session_id)


@router.get("/conversations/{session_id}/suggestions", response_model=list[str])
async def conversation_suggestions(
    session_id: uuid.UUID,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.suggested_questions(db, ctx, session_id)


@router.post("/conversations/{session_id}/messages/stream")
async def stream_message(
    session_id: uuid.UUID,
    payload: StreamMessageRequest,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Stream the assistant's answer as Server-Sent Events."""

    async def event_source():
        try:
            async for event_name, data in chat_service.stream_chat(
                db, ctx, session_id, payload.content
            ):
                yield f"event: {event_name}\ndata: {json.dumps(data)}\n\n"
        except Exception:  # noqa: BLE001 — error frame already emitted by service
            yield (
                "event: error\n"
                'data: {"message": "Stream terminated unexpectedly."}\n\n'
            )

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
        },
    )
