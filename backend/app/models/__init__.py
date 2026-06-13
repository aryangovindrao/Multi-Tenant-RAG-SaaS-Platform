"""
Re-export every model so a single `from app import models` (used by init_db)
registers all tables on Base.metadata. Import order matters only for clarity;
SQLAlchemy resolves relationships lazily by string name.
"""

from app.models.analytics import AnalyticsEvent, EventType
from app.models.chat import ChatSession, Message, MessageRole
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.models.organization import (
    MemberStatus,
    Organization,
    OrganizationMember,
    Plan,
    Role,
)
from app.models.user import User

__all__ = [
    "User",
    "Organization",
    "OrganizationMember",
    "Role",
    "MemberStatus",
    "Plan",
    "Document",
    "DocumentChunk",
    "DocumentStatus",
    "ChatSession",
    "Message",
    "MessageRole",
    "AnalyticsEvent",
    "EventType",
]
