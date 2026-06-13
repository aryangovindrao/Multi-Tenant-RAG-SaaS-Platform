"""
Organization (tenant) + OrganizationMember (the user↔org join that carries the
RBAC role). Keeping role on the membership — not on the user — is what makes a
user able to be an Admin in one org and a Viewer in another.

Tables: organizations, organization_members
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.chat import ChatSession
    from app.models.user import User


class Role(str, enum.Enum):
    """RBAC roles, ordered VIEWER < EDITOR < ADMIN (see security.ROLE_RANK)."""

    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"


class MemberStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"


class Plan(str, enum.Enum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    plan: Mapped[Plan] = mapped_column(
        SAEnum(Plan, native_enum=False, length=20), default=Plan.FREE, nullable=False
    )

    # ── Per-tenant AI settings (managed by the Settings module) ───────────────
    llm_provider: Mapped[str] = mapped_column(
        String(50), default=settings.LLM_PROVIDER, nullable=False
    )
    embedding_model: Mapped[str] = mapped_column(
        String(100), default=settings.EMBEDDING_MODEL, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    members: Mapped[list["OrganizationMember"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["ChatSession"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Organization {self.slug}>"


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        # A user can join an org only once.
        UniqueConstraint("user_id", "organization_id", name="uq_member_user_org"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )

    role: Mapped[Role] = mapped_column(
        SAEnum(Role, native_enum=False, length=20),
        default=Role.VIEWER,
        nullable=False,
    )
    status: Mapped[MemberStatus] = mapped_column(
        SAEnum(MemberStatus, native_enum=False, length=20),
        default=MemberStatus.ACTIVE,
        nullable=False,
    )
    # Set for INVITED members who don't have an account yet.
    invited_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="memberships")
    organization: Mapped["Organization"] = relationship(back_populates="members")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Member user={self.user_id} org={self.organization_id} {self.role}>"
