"""
document_service — upload handling and the ingestion pipeline.

Upload flow (the "→" steps run in the background so the HTTP response is instant):
    POST /upload
        → validate + save file to disk, create Document(status=QUEUED), respond
        → [background] extract_text  (pdf_parser)
        → [background] create_chunks (chunking, page-aware)
        → [background] save_embeddings (embeddings → pgvector rows)
        → status = READY   (or FAILED with an error message)

The frontend polls GET /documents and watches `status` flip to READY.

Functions
    upload_document(db, ctx, file)        -> DocumentOut   (fast path)
    process_document(document_id)          -> None          (background worker)
    extract_text / create_chunks / save_embeddings
    list_documents / get_document / delete_document
"""

from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles
import anyio
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import TenantContext
from app.db.database import async_session_maker
from app.models.analytics import EventType
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.models.user import User
from app.schemas.document import DocumentOut, Paginated
from app.schemas.user import UserOut
from app.services import analytics_service
from app.utils import pdf_parser
from app.utils.chunking import chunk_pages
from app.utils.embeddings import embed_texts

# Coarse status → progress bar value for the frontend.
_PROGRESS = {
    DocumentStatus.UPLOADING: 5,
    DocumentStatus.QUEUED: 10,
    DocumentStatus.PROCESSING: 40,
    DocumentStatus.EMBEDDING: 75,
    DocumentStatus.READY: 100,
    DocumentStatus.FAILED: 0,
}


def _to_document_out(doc: Document) -> DocumentOut:
    uploader = doc.uploaded_by or User(
        id=uuid.uuid4(), email="", name="Unknown"
    )
    return DocumentOut(
        id=doc.id,
        name=doc.name,
        size_bytes=doc.size_bytes,
        page_count=doc.page_count,
        status=doc.status,
        progress=_PROGRESS.get(doc.status, 0),
        mime_type=doc.mime_type,
        uploaded_by=UserOut.model_validate(uploader),
        chunk_count=doc.chunk_count,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


# ── Upload (fast path) ────────────────────────────────────────────────────────
async def upload_document(
    db: AsyncSession, ctx: TenantContext, file: UploadFile
) -> DocumentOut:
    mime = file.content_type or "application/octet-stream"
    if mime not in settings.allowed_mime_list:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {mime}",
        )

    # Stream to disk under a per-tenant folder, enforcing the size cap.
    org_dir = Path(settings.UPLOAD_DIR) / str(ctx.org_id)
    org_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{Path(file.filename or 'upload').name}"
    file_path = org_dir / stored_name

    size = 0
    async with aiofiles.open(file_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):  # 1 MB at a time
            size += len(chunk)
            if size > settings.max_upload_bytes:
                await out.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit",
                )
            await out.write(chunk)

    document = Document(
        organization_id=ctx.org_id,
        uploaded_by_id=ctx.user.id,
        name=file.filename or stored_name,
        file_path=str(file_path),
        mime_type=mime,
        size_bytes=size,
        status=DocumentStatus.QUEUED,
    )
    db.add(document)
    await analytics_service.track_event(
        db,
        ctx.org_id,
        ctx.user.id,
        EventType.DOCUMENT_UPLOADED,
        {"documentName": document.name},
    )
    await db.commit()
    await db.refresh(document)
    document.uploaded_by = ctx.user  # already loaded; avoids a re-query
    return _to_document_out(document)


# ── Background ingestion ──────────────────────────────────────────────────────
def extract_text(file_path: str, mime_type: str) -> list[str]:
    """Page-aware text extraction (sync; called via threadpool)."""
    return pdf_parser.extract_pages(file_path, mime_type)


def create_chunks(pages: list[str]):
    """Page-aware overlapping chunks."""
    return chunk_pages(pages)


async def save_embeddings(
    db: AsyncSession, document: Document, chunks
) -> int:
    """Embed chunk texts and persist DocumentChunk rows. Returns chunk count."""
    texts = [c.content for c in chunks]
    vectors = await embed_texts(texts)
    for c, vector in zip(chunks, vectors):
        db.add(
            DocumentChunk(
                document_id=document.id,
                organization_id=document.organization_id,
                content=c.content,
                chunk_index=c.index,
                page=c.page,
                embedding=vector,
            )
        )
    return len(chunks)


async def process_document(document_id: uuid.UUID) -> None:
    """
    Background worker: opens its OWN session (the request's session is long
    closed) and walks the document through PROCESSING → EMBEDDING → READY,
    recording a FAILED status + message if anything throws.
    """
    async with async_session_maker() as db:
        document = await db.get(Document, document_id)
        if document is None:
            return
        try:
            document.status = DocumentStatus.PROCESSING
            await db.commit()

            pages = await anyio.to_thread.run_sync(
                extract_text, document.file_path, document.mime_type
            )
            chunks = create_chunks(pages)
            if not chunks:
                raise ValueError("No extractable text found in document")

            document.status = DocumentStatus.EMBEDDING
            document.page_count = len(pages)
            await db.commit()

            count = await save_embeddings(db, document, chunks)

            document.status = DocumentStatus.READY
            document.chunk_count = count
            document.error_message = None
            await db.commit()
        except Exception as exc:  # noqa: BLE001 — record any failure for the UI
            await db.rollback()
            document = await db.get(Document, document_id)
            if document is not None:
                document.status = DocumentStatus.FAILED
                document.error_message = str(exc)[:500]
                await db.commit()


# ── Queries ───────────────────────────────────────────────────────────────────
async def list_documents(
    db: AsyncSession,
    org_id: uuid.UUID,
    search: str | None,
    page: int,
    page_size: int,
) -> Paginated[DocumentOut]:
    base = select(Document).where(Document.organization_id == org_id)
    if search:
        base = base.where(Document.name.ilike(f"%{search}%"))

    total = (
        await db.scalar(select(func.count()).select_from(base.subquery()))
    ) or 0

    result = await db.execute(
        base.options(selectinload(Document.uploaded_by))
        .order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [_to_document_out(d) for d in result.scalars().all()]
    return Paginated(items=items, total=total, page=page, page_size=page_size)


async def get_document(
    db: AsyncSession, org_id: uuid.UUID, document_id: uuid.UUID
) -> DocumentOut:
    doc = await db.scalar(
        select(Document)
        .options(selectinload(Document.uploaded_by))
        .where(Document.id == document_id, Document.organization_id == org_id)
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return _to_document_out(doc)


async def delete_document(
    db: AsyncSession, ctx: TenantContext, document_id: uuid.UUID
) -> None:
    doc = await db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == ctx.org_id,  # tenant-scoped
        )
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Remove the file from disk (best-effort), then the row (chunks cascade).
    Path(doc.file_path).unlink(missing_ok=True)
    doc_name = doc.name
    await db.delete(doc)
    await analytics_service.track_event(
        db, ctx.org_id, ctx.user.id, EventType.DOCUMENT_DELETED, {"documentName": doc_name}
    )
    await db.commit()
