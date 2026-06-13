"""
Purpose
-------
Split long document text into overlapping chunks small enough to embed and to
fit (several at a time) into an LLM prompt.

Why overlap? A sentence that explains a concept might straddle a chunk boundary.
Overlapping windows ensure no idea is cut in half and lost from every chunk.

We use LangChain's RecursiveCharacterTextSplitter: it tries to split on natural
boundaries first (paragraphs → lines → sentences → words) before resorting to a
hard character cut, which keeps chunks semantically coherent.

Functions
    chunk_text(text)               -> list[str]
    chunk_pages(pages)             -> list[TextChunk]   (keeps page numbers)

Dependencies: langchain (text splitters).
"""

from __future__ import annotations

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings


@dataclass
class TextChunk:
    """A chunk plus the 1-based page it came from (for citations)."""

    content: str
    page: int
    index: int


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.CHUNK_SIZE,
    chunk_overlap=settings.CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)


def chunk_text(text: str) -> list[str]:
    """Split a single block of text into overlapping chunks."""
    return [c.strip() for c in _splitter.split_text(text) if c.strip()]


def chunk_pages(pages: list[str]) -> list[TextChunk]:
    """
    Chunk a list of page texts, preserving which page each chunk originated
    from so the chat layer can cite "document.pdf, p.7".

    `pages` is 0-indexed (pages[0] == page 1).
    """
    chunks: list[TextChunk] = []
    running_index = 0
    for page_number, page_text in enumerate(pages, start=1):
        if not page_text or not page_text.strip():
            continue
        for piece in chunk_text(page_text):
            chunks.append(
                TextChunk(content=piece, page=page_number, index=running_index)
            )
            running_index += 1
    return chunks
