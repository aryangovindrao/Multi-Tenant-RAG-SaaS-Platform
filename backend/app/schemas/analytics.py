"""
Analytics schemas — dashboard cards, activity feed rows, and the time-series
overview consumed by the charts page.
"""

from __future__ import annotations

import uuid

from app.schemas.base import CamelModel, UTCDateTime


class DashboardStats(CamelModel):
    document_count: int
    document_delta: float
    query_count: int
    query_delta: float
    active_users: int
    active_users_delta: float
    storage_used_bytes: int
    storage_limit_bytes: int


class ActivityActor(CamelModel):
    id: uuid.UUID | None = None
    name: str
    avatar_url: str | None = None


class ActivityEvent(CamelModel):
    id: uuid.UUID
    type: str
    actor: ActivityActor
    description: str
    created_at: UTCDateTime


class TimeSeriesPoint(CamelModel):
    date: str
    value: float


class TokenPoint(CamelModel):
    date: str
    input: int
    output: int


class TopDocument(CamelModel):
    document_id: uuid.UUID
    name: str
    references: int


class AnalyticsOverview(CamelModel):
    queries_over_time: list[TimeSeriesPoint]
    active_users_over_time: list[TimeSeriesPoint]
    tokens_over_time: list[TokenPoint]
    top_documents: list[TopDocument]
    total_tokens: int
    avg_response_ms: float
    total_queries: int
