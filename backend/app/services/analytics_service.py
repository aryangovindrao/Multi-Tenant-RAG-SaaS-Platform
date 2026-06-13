"""
analytics_service — writes events and reads them back as metrics.

Design: instead of maintaining counters, we append one row per action to the
`analytics` table (track_event) and compute every metric by aggregating that log
on read. Simple, auditable, and impossible to get out of sync.

Functions
    track_event(db, org_id, user_id, type, meta)   — append an event
    get_stats(db, org_id)                          — dashboard cards
    get_activity(db, org_id, limit)                — recent activity feed
    get_overview(db, org_id, range)                — chart time-series
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.analytics import AnalyticsEvent, EventType
from app.models.document import Document
from app.models.organization import (
    MemberStatus,
    Organization,
    OrganizationMember,
    Plan,
)
from app.schemas.analytics import (
    ActivityActor,
    ActivityEvent,
    AnalyticsOverview,
    DashboardStats,
    TimeSeriesPoint,
    TokenPoint,
    TopDocument,
)

# Per-plan storage allowances (bytes).
PLAN_STORAGE_LIMITS: dict[Plan, int] = {
    Plan.FREE: 1 * 1024**3,        # 1 GB
    Plan.PRO: 25 * 1024**3,        # 25 GB
    Plan.ENTERPRISE: 500 * 1024**3,
}

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def track_event(
    db: AsyncSession,
    org_id: uuid.UUID,
    user_id: uuid.UUID | None,
    event_type: EventType,
    meta: dict | None = None,
    *,
    commit: bool = False,
) -> None:
    """
    Append an event. By default does NOT commit so it can ride inside the
    caller's transaction (e.g. created with the document it describes).
    """
    db.add(
        AnalyticsEvent(
            organization_id=org_id,
            user_id=user_id,
            event_type=event_type.value,
            meta=meta,
        )
    )
    if commit:
        await db.commit()


def _percent_delta(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)


async def _count_events(
    db: AsyncSession,
    org_id: uuid.UUID,
    event_type: EventType,
    since: datetime,
    until: datetime,
) -> int:
    return (
        await db.scalar(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.organization_id == org_id,
                AnalyticsEvent.event_type == event_type.value,
                AnalyticsEvent.created_at >= since,
                AnalyticsEvent.created_at < until,
            )
        )
    ) or 0


async def get_stats(db: AsyncSession, org_id: uuid.UUID) -> DashboardStats:
    now = _now()
    last_30 = now - timedelta(days=30)
    prev_30 = now - timedelta(days=60)

    # Totals
    doc_count = (
        await db.scalar(
            select(func.count(Document.id)).where(
                Document.organization_id == org_id
            )
        )
    ) or 0
    storage_used = (
        await db.scalar(
            select(func.coalesce(func.sum(Document.size_bytes), 0)).where(
                Document.organization_id == org_id
            )
        )
    ) or 0
    total_queries = (
        await db.scalar(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.organization_id == org_id,
                AnalyticsEvent.event_type == EventType.QUERY_EXECUTED.value,
            )
        )
    ) or 0
    active_users = (
        await db.scalar(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.status == MemberStatus.ACTIVE,
            )
        )
    ) or 0

    # Deltas (this 30d window vs the previous 30d window)
    docs_now = await _count_events(db, org_id, EventType.DOCUMENT_UPLOADED, last_30, now)
    docs_prev = await _count_events(db, org_id, EventType.DOCUMENT_UPLOADED, prev_30, last_30)
    q_now = await _count_events(db, org_id, EventType.QUERY_EXECUTED, last_30, now)
    q_prev = await _count_events(db, org_id, EventType.QUERY_EXECUTED, prev_30, last_30)

    org_plan = await db.scalar(
        select(Organization.plan).where(Organization.id == org_id)
    )
    storage_limit = PLAN_STORAGE_LIMITS.get(org_plan or Plan.FREE, PLAN_STORAGE_LIMITS[Plan.FREE])

    return DashboardStats(
        document_count=doc_count,
        document_delta=_percent_delta(docs_now, docs_prev),
        query_count=total_queries,
        query_delta=_percent_delta(q_now, q_prev),
        active_users=active_users,
        active_users_delta=0.0,
        storage_used_bytes=int(storage_used),
        storage_limit_bytes=storage_limit,
    )


async def get_activity(
    db: AsyncSession, org_id: uuid.UUID, limit: int = 15
) -> list[ActivityEvent]:
    result = await db.execute(
        select(AnalyticsEvent)
        .options(selectinload(AnalyticsEvent.user))
        .where(AnalyticsEvent.organization_id == org_id)
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    return [_to_activity(e) for e in events]


_DESCRIPTIONS = {
    EventType.DOCUMENT_UPLOADED.value: "uploaded a document",
    EventType.DOCUMENT_DELETED.value: "deleted a document",
    EventType.QUERY_EXECUTED.value: "asked a question",
    EventType.MEMBER_JOINED.value: "joined the organization",
    EventType.MEMBER_INVITED.value: "invited a member",
    EventType.ORG_UPDATED.value: "updated organization settings",
}


def _to_activity(e: AnalyticsEvent) -> ActivityEvent:
    name = e.user.name if e.user else "Someone"
    desc = _DESCRIPTIONS.get(e.event_type, e.event_type.lower())
    if e.meta and e.meta.get("documentName"):
        desc = f"{desc}: {e.meta['documentName']}"
    return ActivityEvent(
        id=e.id,
        type=e.event_type,
        actor=ActivityActor(
            id=e.user.id if e.user else None,
            name=name,
            avatar_url=e.user.avatar_url if e.user else None,
        ),
        description=desc,
        created_at=e.created_at,
    )


def _empty_series(days: int) -> dict[str, int]:
    """Zero-filled {YYYY-MM-DD: 0} for the last `days` days, oldest first."""
    today = _now().date()
    return {
        (today - timedelta(days=days - 1 - i)).isoformat(): 0 for i in range(days)
    }


async def get_overview(
    db: AsyncSession, org_id: uuid.UUID, range_: str
) -> AnalyticsOverview:
    days = RANGE_DAYS.get(range_, 30)
    since = _now() - timedelta(days=days)

    # Pull the window's query events once; aggregate in Python (clear + simple).
    result = await db.execute(
        select(AnalyticsEvent).where(
            AnalyticsEvent.organization_id == org_id,
            AnalyticsEvent.event_type == EventType.QUERY_EXECUTED.value,
            AnalyticsEvent.created_at >= since,
        )
    )
    events = result.scalars().all()

    queries_by_day = _empty_series(days)
    tokens_in_by_day: dict[str, int] = defaultdict(int)
    tokens_out_by_day: dict[str, int] = defaultdict(int)
    users_by_day: dict[str, set] = defaultdict(set)
    doc_refs: dict[str, int] = defaultdict(int)
    doc_names: dict[str, str] = {}
    total_tokens = 0
    total_latency = 0
    latency_samples = 0

    for e in events:
        day = e.created_at.date().isoformat()
        if day in queries_by_day:
            queries_by_day[day] += 1
        if e.user_id:
            users_by_day[day].add(str(e.user_id))
        meta = e.meta or {}
        ti = int(meta.get("inputTokens", 0))
        to = int(meta.get("outputTokens", 0))
        tokens_in_by_day[day] += ti
        tokens_out_by_day[day] += to
        total_tokens += ti + to
        if "latencyMs" in meta:
            total_latency += int(meta["latencyMs"])
            latency_samples += 1
        for ref in meta.get("documentIds", []):
            doc_refs[ref] += 1
        for ref, nm in (meta.get("documentNames") or {}).items():
            doc_names[ref] = nm

    queries_over_time = [
        TimeSeriesPoint(date=d, value=v) for d, v in queries_by_day.items()
    ]
    active_users_over_time = [
        TimeSeriesPoint(date=d, value=len(users_by_day.get(d, set())))
        for d in queries_by_day
    ]
    tokens_over_time = [
        TokenPoint(
            date=d, input=tokens_in_by_day.get(d, 0), output=tokens_out_by_day.get(d, 0)
        )
        for d in queries_by_day
    ]

    top_documents = [
        TopDocument(
            document_id=uuid.UUID(doc_id),
            name=doc_names.get(doc_id, "Document"),
            references=count,
        )
        for doc_id, count in sorted(doc_refs.items(), key=lambda x: -x[1])[:5]
    ]

    return AnalyticsOverview(
        queries_over_time=queries_over_time,
        active_users_over_time=active_users_over_time,
        tokens_over_time=tokens_over_time,
        top_documents=top_documents,
        total_tokens=total_tokens,
        avg_response_ms=round(total_latency / latency_samples, 1) if latency_samples else 0.0,
        total_queries=len(events),
    )
