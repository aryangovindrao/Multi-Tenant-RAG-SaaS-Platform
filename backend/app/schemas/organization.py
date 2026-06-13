"""
Organization, member, and settings schemas.

OrganizationOut carries the *current user's* role within that org plus a member
count — both computed in the service layer, not raw columns — so the frontend
can gate UI by role without an extra request.
"""

from __future__ import annotations

import uuid

from pydantic import EmailStr, Field

from app.models.organization import MemberStatus, Plan, Role
from app.schemas.base import CamelModel, UTCDateTime
from app.schemas.user import UserOut


# ── Organizations ─────────────────────────────────────────────────────────────
class OrganizationCreate(CamelModel):
    name: str = Field(min_length=2, max_length=255)


class OrganizationUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    logo_url: str | None = None


class OrganizationOut(CamelModel):
    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None = None
    plan: Plan
    role: Role            # the requesting user's role in this org
    member_count: int
    created_at: UTCDateTime


# ── Members ───────────────────────────────────────────────────────────────────
class InviteRequest(CamelModel):
    email: EmailStr
    role: Role = Role.VIEWER


class MemberRoleUpdate(CamelModel):
    role: Role


class MemberOut(CamelModel):
    id: uuid.UUID
    user: UserOut
    role: Role
    status: MemberStatus
    joined_at: UTCDateTime


# ── Settings (Organization settings module) ──────────────────────────────────
class SettingsOut(CamelModel):
    organization_id: uuid.UUID
    name: str
    llm_provider: str
    embedding_model: str


class SettingsUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    llm_provider: str | None = None
    embedding_model: str | None = None
