"""
Report processing pipeline: fetch PDF -> convert to markdown -> chunk by
section -> embed. Every step is designed around the "this is the slow,
expensive part" concern from earlier in the project:

- Converting to markdown first (via pymupdf4llm) rather than embedding raw
  PDF text preserves headings, which lets `_select_relevant_sections` skip
  sections that are never going to matter (e.g. governance boilerplate)
  instead of embedding the entire report.
- Results are cached by a hash of the source content (see
  db/sqlite_client.is_cached), so the same report is never re-processed.
- This function is intended to be called from a background task, not
  inline in a chat request/response cycle.
"""

import hashlib
import re
from pathlib import Path

import httpx
import pymupdf4llm

from app.db import chroma_client
from app.db.sqlite_client import is_cached, cache_document

_RELEVANT_HEADINGS = re.compile(
    r"(emission|climate|ghg|scope [123]|carbon|environmental risk|net.zero)",
    re.IGNORECASE,
)
_MARKDOWN_DIR = Path("./data/reports")


def _select_relevant_sections(markdown: str) -> list[str]:
    """Split on markdown headings, keep only sections whose heading matches
    a climate/emissions keyword, so we embed a fraction of a 200-page report
    instead of all of it."""
    sections = re.split(r"\n(?=#{1,3} )", markdown)
    return [s for s in sections if _RELEVANT_HEADINGS.search(s[:200])]


async def process_report(source_url: str, company: str) -> dict:
    doc_hash = hashlib.sha256(source_url.encode()).hexdigest()[:16]

    if is_cached(doc_hash):
        return {"status": "cached", "doc_hash": doc_hash}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(source_url)
        response.raise_for_status()
        pdf_bytes = response.content

    _MARKDOWN_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = _MARKDOWN_DIR / f"{doc_hash}.pdf"
    pdf_path.write_bytes(pdf_bytes)

    markdown = pymupdf4llm.to_markdown(str(pdf_path))
    md_path = _MARKDOWN_DIR / f"{doc_hash}.md"
    md_path.write_text(markdown)
    pdf_path.unlink()  # keep only the markdown, not the original PDF

    sections = _select_relevant_sections(markdown)
    if sections:
        ids = [f"{doc_hash}_{i}" for i in range(len(sections))]
        metadatas = [{"company": company, "source_url": source_url} for _ in sections]
        chroma_client.add_chunks(ids, sections, metadatas)

    cache_document(doc_hash, source_url, str(md_path))
    return {"status": "processed", "doc_hash": doc_hash, "sections_embedded": len(sections)}
