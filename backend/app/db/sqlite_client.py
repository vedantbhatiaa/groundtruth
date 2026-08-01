"""
SQLite handles two jobs deliberately kept in one small file rather than a
separate service, since both are simple key/timestamp lookups:

1. document_cache — parsed report markdown + embedding status, keyed by a
   hash of the source PDF, so a report is never re-parsed or re-embedded
   once it's been processed.
2. query_log — every prompt the assistant receives, what it queried
   (graph, vector, or both), and a short summary of the answer. This is
   the audit trail requested for tracking usage.
"""

import sqlite3
import time
from pathlib import Path
from app.config import settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS document_cache (
    doc_hash TEXT PRIMARY KEY,
    source_url TEXT,
    markdown_path TEXT,
    embedded INTEGER DEFAULT 0,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS query_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp REAL,
    prompt TEXT,
    sources_used TEXT,
    response_summary TEXT
);
"""


def get_connection() -> sqlite3.Connection:
    Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.sqlite_path)
    conn.executescript(_SCHEMA)
    return conn


def is_cached(doc_hash: str) -> bool:
    conn = get_connection()
    row = conn.execute(
        "SELECT 1 FROM document_cache WHERE doc_hash = ? AND embedded = 1", (doc_hash,)
    ).fetchone()
    conn.close()
    return row is not None


def cache_document(doc_hash: str, source_url: str, markdown_path: str):
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO document_cache VALUES (?, ?, ?, 1, ?)",
        (doc_hash, source_url, markdown_path, time.time()),
    )
    conn.commit()
    conn.close()


def log_query(prompt: str, sources_used: list[str], response_summary: str):
    conn = get_connection()
    conn.execute(
        "INSERT INTO query_log (timestamp, prompt, sources_used, response_summary) VALUES (?, ?, ?, ?)",
        (time.time(), prompt, ",".join(sources_used), response_summary[:500]),
    )
    conn.commit()
    conn.close()
