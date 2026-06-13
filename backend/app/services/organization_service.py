"""
organization_service — the organization / members / settings domain.

The prompt lists Members and Settings API modules but no organization CRUD; the
multi-tenant frontend (onboarding, org switcher) needs to create and list orgs,
so that logic lives here too. Keeping org + membership + settings in one cohesive
service avoids circular imports between the three thin API routers.

Functions
    create_organization(db, user, name)
    list_user_organizations(db, user)
    update_organization / delete_organization
    list_members / invite_member / update_member_role / remove_member
    get_settings / update_settings
"""

from __future__ import annotations

import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import ROLE_RANK, TenantContext
from app.models.organization import (
    MemberStatus,
    Organization,
    OrganizationMember,
    Role,
)
from app.models.user import User
from app.schemas.organization import (
    MemberOut,
    OrganizationOut,
    SettingsOut,
    SettingsUpdate,
)
from app.schemas.user import UserOut
from app.services import analytics_service
from app.models.analytics import EventType


def _slugify(name: str) -> str:
    """'Acme Inc.' → 'acme-inc-1a2b3c4d' (suffix keeps slugs unique)."""
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "org"
    return f"{base}-{uuid.uuid4().hex[:8]}"


async def _member_count(db: AsyncSession, org_id: uuid.UUID) -> int:
    return (
        await db.scalar(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org_id
            )
        )
    ) or 0


def _to_org_out(org: Organization, role: Role, member_count: int) -> OrganizationOut:
    return OrganizationOut(
        id=org.id,
        name=org.name,
        slug=org.slug,
        logo_url=org.logo_url,
        plan=org.plan,
        role=role,
        member_count=member_count,
        created_at=org.created_at,
    )


# ── Organizations ─────────────────────────────────────────────────────────────
async def create_organization(
    db: AsyncSession, user: User, name: str
) -> OrganizationOut:
    """Create an org and make the creator its ADMIN."""
    org = Organization(name=name, slug=_slugify(name))
    db.add(org)
    await db.flush()  # assign org.id before creating the membership

    membership = OrganizationMember(
        user_id=user.id,
        organization_id=org.id,
        role=Role.ADMIN,
        status=MemberStatus.ACTIVE,
    )
    db.add(membership)
    await analytics_service.track_event(
        db, org.id, user.id, EventType.MEMBER_JOINED, {"name": user.name}
    )
    await db.commit()
    await db.refresh(org)
    return _to_org_out(org, Role.ADMIN, member_count=1)


async def list_user_organizations(
    db: AsyncSession, user: User
) -> list[OrganizationOut]:
    """All orgs the user actively belongs to, each annotated with their role."""
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.organization))
        .where(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == MemberStatus.ACTIVE,
        )
    )
    memberships = result.scalars().all()

    out: list[OrganizationOut] = []
    for m in memberships:
        count = await _member_count(db, m.organization_id)
        out.append(_to_org_out(m.organization, m.role, count))
    return out


async def update_organization(
    db: AsyncSession, ctx: TenantContext, name: str | None, logo_url: str | None
) -> OrganizationOut:
    if name is not None:
        ctx.organization.name = name
    if logo_url is not None:
        ctx.organization.logo_url = logo_url
    await analytics_service.track_event(
        db, ctx.org_id, ctx.user.id, EventType.ORG_UPDATED, None
    )
    await db.commit()
    await db.refresh(ctx.organization)
    count = await _member_count(db, ctx.org_id)
    return _to_org_out(ctx.organization, ctx.role, count)


async def delete_organization(db: AsyncSession, ctx: TenantContext) -> None:
    await db.delete(ctx.organization)  # cascades to members/docs/sessions
    await db.commit()


# ── Members ───────────────────────────────────────────────────────────────────
def _to_member_out(m: OrganizationMember) -> MemberOut:
    display = m.user or User(  # synthetic for not-yet-registered invitees
        id=uuid.uuid4(), email=m.invited_email or "", name=m.invited_email or ""
    )
    return MemberOut(
        id=m.id,
        user=UserOut.model_validate(display),
        role=m.role,
        status=m.status,
        joined_at=m.joined_at,
    )


async def list_members(db: AsyncSession, org_id: uuid.UUID) -> list[MemberOut]:
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.joined_at)
    )
    return [_to_member_out(m) for m in result.scalars().all()]


async def invite_member(
    db: AsyncSession, ctx: TenantContext, email: str, role: Role
) -> MemberOut:
    """
    Invite by email. If the person already has a Cortex account they're added
    immediately (ACTIVE); otherwise a shell user + INVITED membership is created
    (a production system would email an acceptance link here).
    """
    invited_user = await db.scalar(select(User).where(User.email == email))
    pre_existing = invited_user is not None

    if invited_user is None:
        invited_user = User(email=email, name=email.split("@")[0], hashed_password=None)
        db.add(invited_user)
        await db.flush()

    dupe = await db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.user_id == invited_user.id,
            OrganizationMember.organization_id == ctx.org_id,
        )
    )
    if dupe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This person is already a member",
        )

    membership = OrganizationMember(
        user_id=invited_user.id,
        organization_id=ctx.org_id,
        role=role,
        status=MemberStatus.ACTIVE if pre_existing else MemberStatus.INVITED,
        invited_email=email,
    )
    db.add(membership)
    await analytics_service.track_event(
        db, ctx.org_id, ctx.user.id, EventType.MEMBER_INVITED, {"email": email}
    )
    await db.commit()
    await db.refresh(membership, attribute_names=["user"])
    return _to_member_out(membership)


async def _get_member(
    db: AsyncSession, ctx: TenantContext, member_id: uuid.UUID
) -> OrganizationMember:
    member = await db.scalar(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == ctx.org_id,  # tenant-scoped
        )
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )
    return member


async def update_member_role(
    db: AsyncSession, ctx: TenantContext, member_id: uuid.UUID, role: Role
) -> MemberOut:
    member = await _get_member(db, ctx, member_id)
    member.role = role
    await db.commit()
    await db.refresh(member, attribute_names=["user"])
    return _to_member_out(member)


async def remove_member(
    db: AsyncSession, ctx: TenantContext, member_id: uuid.UUID
) -> None:
    member = await _get_member(db, ctx, member_id)
    if member.user_id == ctx.user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the organization",
        )
    await db.delete(member)
    await db.commit()


# ── Settings ──────────────────────────────────────────────────────────────────
def get_settings(org: Organization) -> SettingsOut:
    return SettingsOut(
        organization_id=org.id,
        name=org.name,
        llm_provider=org.llm_provider,
        embedding_model=org.embedding_model,
    )


async def update_settings(
    db: AsyncSession, ctx: TenantContext, data: SettingsUpdate
) -> SettingsOut:
    org = ctx.organization
    if data.name is not None:
        org.name = data.name
    if data.llm_provider is not None:
        org.llm_provider = data.llm_provider
    if data.embedding_model is not None:
        org.embedding_model = data.embedding_model
    await db.commit()
    await db.refresh(org)
    return get_settings(org)
