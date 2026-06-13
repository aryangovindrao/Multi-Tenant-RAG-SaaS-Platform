"""
Organizations API — /organizations

Not in the original module list, but the multi-tenant frontend (onboarding +
org switcher) needs to create and list organizations, so it lives here.

    GET    /organizations          orgs the caller belongs to (+ their role)
    POST   /organizations          create an org (caller becomes ADMIN)
    PATCH  /organizations/{id}      rename / update (ADMIN only)
    DELETE /organizations/{id}      delete the org (ADMIN only)

Note: create/list don't use get_tenant (the user may have zero orgs yet); they
authenticate with get_current_user only.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, TenantContext, get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationOut,
    OrganizationUpdate,
)
from app.services import organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationOut])
async def list_organizations(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await organization_service.list_user_organizations(db, user)


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrganizationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await organization_service.create_organization(db, user, payload.name)


@router.patch("/{org_id}", response_model=OrganizationOut)
async def update_organization(
    org_id: uuid.UUID,
    payload: OrganizationUpdate,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    _assert_path_matches_tenant(org_id, ctx)
    return await organization_service.update_organization(
        db, ctx, payload.name, payload.logo_url
    )


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: uuid.UUID,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    _assert_path_matches_tenant(org_id, ctx)
    await organization_service.delete_organization(db, ctx)
    return None


def _assert_path_matches_tenant(org_id: uuid.UUID, ctx: TenantContext) -> None:
    """The active org (X-Organization-Id) must match the path id — defence in
    depth so a caller can't target a different org via the URL."""
    if org_id != ctx.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Path organization does not match the active organization",
        )
