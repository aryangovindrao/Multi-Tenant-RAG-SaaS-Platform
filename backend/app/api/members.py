"""
Members API — RBAC management.

Prompt endpoints (act on the active org from the X-Organization-Id header):
    GET    /members              list members          (any member)
    POST   /invite               invite by email       (ADMIN)
    PATCH  /members/{id}         change a member's role (ADMIN)
    DELETE /members/{id}         remove a member        (ADMIN)

Frontend path-based aliases (same handlers; org id in the URL is validated
against the active org):
    GET    /organizations/{org_id}/members
    POST   /organizations/{org_id}/invitations
    PATCH  /organizations/{org_id}/members/{id}
    DELETE /organizations/{org_id}/members/{id}

RBAC: roles rank VIEWER < EDITOR < ADMIN. `require_role(Role.ADMIN)` rejects
anyone below admin before the handler runs.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, TenantContext, get_tenant, require_role
from app.db.session import get_db
from app.schemas.organization import (
    InviteRequest,
    MemberOut,
    MemberRoleUpdate,
)
from app.services import organization_service

router = APIRouter(tags=["members"])


def _check_org(org_id: uuid.UUID, ctx: TenantContext) -> None:
    if org_id != ctx.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Path organization does not match the active organization",
        )


# ── Prompt-style (header org) ─────────────────────────────────────────────────
@router.get("/members", response_model=list[MemberOut])
async def list_members(
    ctx: TenantContext = Depends(get_tenant), db: AsyncSession = Depends(get_db)
):
    return await organization_service.list_members(db, ctx.org_id)


@router.post("/invite", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def invite_member(
    payload: InviteRequest,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await organization_service.invite_member(db, ctx, payload.email, payload.role)


@router.patch("/members/{member_id}", response_model=MemberOut)
async def update_member_role(
    member_id: uuid.UUID,
    payload: MemberRoleUpdate,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await organization_service.update_member_role(db, ctx, member_id, payload.role)


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: uuid.UUID,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    await organization_service.remove_member(db, ctx, member_id)
    return None


# ── Frontend path-based aliases ───────────────────────────────────────────────
@router.get("/organizations/{org_id}/members", response_model=list[MemberOut])
async def list_members_by_path(
    org_id: uuid.UUID,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    _check_org(org_id, ctx)
    return await organization_service.list_members(db, ctx.org_id)


@router.post(
    "/organizations/{org_id}/invitations",
    response_model=MemberOut,
    status_code=status.HTTP_201_CREATED,
)
async def invite_member_by_path(
    org_id: uuid.UUID,
    payload: InviteRequest,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    _check_org(org_id, ctx)
    return await organization_service.invite_member(db, ctx, payload.email, payload.role)


@router.patch(
    "/organizations/{org_id}/members/{member_id}", response_model=MemberOut
)
async def update_member_role_by_path(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: MemberRoleUpdate,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    _check_org(org_id, ctx)
    return await organization_service.update_member_role(db, ctx, member_id, payload.role)


@router.delete(
    "/organizations/{org_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member_by_path(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    _check_org(org_id, ctx)
    await organization_service.remove_member(db, ctx, member_id)
    return None
