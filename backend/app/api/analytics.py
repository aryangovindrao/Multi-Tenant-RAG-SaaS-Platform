"""
Analytics API — /analytics

Prompt endpoints:
    GET /analytics/stats        dashboard metrics (documents, queries, users…)
    GET /analytics/activity     recent activity feed

Frontend aliases / extras:
    GET /analytics/dashboard    same as /stats
    GET /analytics/overview     time-series for the charts (?range=7d|30d|90d)

Every metric is computed by aggregating the append-only `analytics` event log,
always filtered to the caller's organization.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.security import TenantContext, get_tenant
from app.db.session import get_db
from app.schemas.analytics import ActivityEvent, AnalyticsOverview, DashboardStats
from app.services import analytics_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/stats", response_model=DashboardStats)
@router.get("/dashboard", response_model=DashboardStats)
async def stats(
    ctx: TenantContext = Depends(get_tenant), db: AsyncSession = Depends(get_db)
):
    return await analytics_service.get_stats(db, ctx.org_id)


@router.get("/activity", response_model=list[ActivityEvent])
async def activity(
    limit: int = Query(default=15, ge=1, le=100),
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_activity(db, ctx.org_id, limit)


@router.get("/overview", response_model=AnalyticsOverview)
async def overview(
    range: str = Query(default="30d", pattern="^(7d|30d|90d)$"),
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_overview(db, ctx.org_id, range)
