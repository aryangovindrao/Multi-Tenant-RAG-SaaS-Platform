"""
Settings API — /settings

    GET   /settings    read the org's name, LLM provider, embedding model
    PATCH /settings    update them (ADMIN only)

These per-tenant settings let each organization choose its own LLM provider and
embedding model; rag_service reads `organization.llm_provider` when answering.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, TenantContext, get_tenant, require_role
from app.db.session import get_db
from app.schemas.organization import SettingsOut, SettingsUpdate
from app.services import organization_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
async def get_settings(ctx: TenantContext = Depends(get_tenant)):
    return organization_service.get_settings(ctx.organization)


@router.patch("", response_model=SettingsOut)
async def update_settings(
    payload: SettingsUpdate,
    ctx: TenantContext = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await organization_service.update_settings(db, ctx, payload)
