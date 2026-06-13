"""
Purpose
-------
Extract plain text from uploaded files, page by page. PDFs are parsed with
pypdf; plain-text/markdown files are read directly (treated as a single page).

Keeping extraction page-aware is what lets us produce page-level citations later.

Functions
    extract_pages(file_path, mime_type) -> list[str]   (one entry per page)
    extract_text(file_path, mime_type)  -> str          (whole document joined)
    count_pages(file_path, mime_type)   -> int

Dependencies: pypdf.
"""

from __future__ import annotations

from pathlib import Path


def _extract_pdf_pages(file_path: str) -> list[str]:
    from pypdf import PdfReader

    reader = PdfReader(file_path)
    pages: list[str] = []
    for page in reader.pages:
        # extract_text() can return None for image-only / scanned pages.
        pages.append(page.extract_text() or "")
    return pages


def _extract_text_file(file_path: str) -> list[str]:
    text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
    return [text]


def extract_pages(file_path: str, mime_type: str) -> list[str]:
    """
    Return a list of page texts. PDFs yield one entry per page; text/markdown
    yield a single entry. Raises ValueError for unsupported types.
    """
    if mime_type == "application/pdf":
        return _extract_pdf_pages(file_path)
    if mime_type in ("text/plain", "text/markdown"):
        return _extract_text_file(file_path)
    if mime_type.endswith("wordprocessingml.document"):
        return _extract_docx_pages(file_path)
    raise ValueError(f"Unsupported file type for extraction: {mime_type}")


def _extract_docx_pages(file_path: str) -> list[str]:
    """
    DOCX has no fixed pages; we return the whole body as one logical page.
    (python-docx is optional — import locally so it isn't a hard dependency.)
    """
    try:
        import docx  # python-docx
    except ImportError as exc:  # pragma: no cover
        raise ValueError(
            "DOCX support requires 'python-docx' (pip install python-docx)"
        ) from exc
    document = docx.Document(file_path)
    return ["\n".join(p.text for p in document.paragraphs)]


def extract_text(file_path: str, mime_type: str) -> str:
    """Whole-document text (all pages joined with form-feed separators)."""
    return "\n\n".join(extract_pages(file_path, mime_type))


def count_pages(file_path: str, mime_type: str) -> int:
    """Page count without holding all text in memory longer than needed."""
    return len(extract_pages(file_path, mime_type))
