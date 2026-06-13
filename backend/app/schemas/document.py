"""
Document schemas. `DocumentOut` mirrors the frontend's Document type, including
a derived `progress` (0-100) so the UI's progress bar works off one field
regardless of which processing stage the document is in.
"""

from __future__ import annotations

import uuid
from typing import Generic, TypeVar

from app.models.document import DocumentStatus
from app.schemas.base import CamelModel, UTCDateTime
from app.schemas.user import UserOut

T = TypeVar("T")


class DocumentOut(CamelModel):
    id: uuid.UUID
    name: str
    size_bytes: int
    page_count: int | None = None
    status: DocumentStatus
    progress: int = 0
    mime_type: str
    uploaded_by: UserOut
    chunk_count: int | None = None
    error_message: str | None = None
    created_at: UTCDateTime
    updated_at: UTCDateTime


class Paginated(CamelModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
