"""
Documents API — /documents

    POST   /documents          upload a file (EDITOR+); processing runs in the
                               background, response returns immediately
    GET    /documents          paginated + searchable list (any member)
    GET    /documents/{id}      single document (any member)
    DELETE /documents/{id}      delete a document + its chunks (EDITOR+)

Upload flow: validate → save to disk → create Document(QUEUED) → schedule the
background ingestion task (extract → chunk → embed → store) → return the doc so
the UI can start polling its status.
"""

from __future__ import annotations

import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, TenantContext, get_tenant, require_role
from app.db.session import get_db
from app.schemas.document import DocumentOut, Paginated
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    ctx: TenantContext = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    document = await document_service.upload_document(db, ctx, file)
    # Heavy work (parse + embed) happens after the response is sent.
    background.add_task(document_service.process_document, document.id)
    return document


@router.get("", response_model=Paginated[DocumentOut])
async def list_documents(
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await document_service.list_documents(
        db, ctx.org_id, search, page, page_size
    )


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: uuid.UUID,
    ctx: TenantContext = Depends(get_tenant),
    db: AsyncSession = Depends(get_db),
):
    return await document_service.get_document(db, ctx.org_id, document_id)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    ctx: TenantContext = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    await document_service.delete_document(db, ctx, document_id)
    return None
