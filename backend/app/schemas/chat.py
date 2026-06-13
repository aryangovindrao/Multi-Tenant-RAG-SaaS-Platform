"""
Chat schemas covering the RAG request/response cycle.

Citation         — one retrieved source (document + page + snippet + score)
ChatRequest      — the user's question, optionally targeting an existing session
ChatResponse     — the assistant's answer plus the citations it was grounded on
MessageOut       — a stored message (used by GET /history)
ConversationOut  — a session summary (used by the sidebar)
"""

from __future__ import annotations

import uuid

from app.models.chat import MessageRole
from app.schemas.base import CamelModel, UTCDateTime


class Citation(CamelModel):
    document_id: uuid.UUID
    document_name: str
    page: int
    snippet: str
    score: float


class NewSessionRequest(CamelModel):
    # Reserved for scoping a chat to specific documents; retrieval currently
    # searches the whole tenant corpus.
    document_ids: list[uuid.UUID] = []


class ChatRequest(CamelModel):
    content: str
    # If omitted, the service opens a fresh session automatically.
    session_id: uuid.UUID | None = None


class ChatResponse(CamelModel):
    session_id: uuid.UUID
    message_id: uuid.UUID
    answer: str
    citations: list[Citation] = []


class MessageOut(CamelModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: MessageRole
    content: str
    citations: list[Citation] | None = None
    created_at: UTCDateTime


class ConversationOut(CamelModel):
    id: uuid.UUID
    title: str
    document_ids: list[uuid.UUID] = []
    message_count: int
    created_at: UTCDateTime
    updated_at: UTCDateTime
