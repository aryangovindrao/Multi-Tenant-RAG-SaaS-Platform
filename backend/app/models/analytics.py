"""
AnalyticsEvent — an append-only event log, one row per tracked action
(document uploaded, query executed, member joined, …). Dashboard stats and the
activity feed are computed by aggregating this table, so we never need to keep
running counters in sync.

Table: analytics
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class EventType(str, enum.Enum):
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    QUERY_EXECUTED = "QUERY_EXECUTED"
    MEMBER_JOINED = "MEMBER_JOINED"
    MEMBER_INVITED = "MEMBER_INVITED"
    ORG_UPDATED = "ORG_UPDATED"


class AnalyticsEvent(Base):
    __tablename__ = "analytics"
    __table_args__ = (
        # Most queries filter by org and slice by time → composite index.
        Index("idx_analytics_org_time", "organization_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Free-form context, e.g. {"documentName": "...", "tokens": 1234}.
    # Named `meta` because `metadata` is reserved on the declarative Base.
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User | None"] = relationship()

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AnalyticsEvent {self.event_type}>"
