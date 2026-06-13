"""
ChatSession + Message.

ChatSession — a conversation thread within an organization, owned by a user.
Message     — one turn (user question or assistant answer). Assistant messages
              store their citations as JSON so the frontend can render source
              chips without re-running retrieval.

Tables: chat_sessions, messages
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(512), default="New chat", nullable=False)

    # Documents this conversation is scoped to (multi-doc chat). Null/empty means
    # retrieval searches the whole organization corpus. Stored as a list of
    # document-id strings.
    document_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True,  # sidebar orders conversations by recency
    )

    organization: Mapped["Organization"] = relationship(back_populates="sessions")
    user: Mapped["User"] = relationship()
    messages: Mapped[list["Message"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ChatSession {self.title}>"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )

    role: Mapped[MessageRole] = mapped_column(
        SAEnum(MessageRole, native_enum=False, length=20), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # [{documentId, documentName, page, snippet, score}, ...] — null for user msgs
    citations: Mapped[list | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped["ChatSession"] = relationship(back_populates="messages")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Message {self.role} {self.content[:30]!r}>"
