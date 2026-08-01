"""
Thin wrapper around the vector store for the orchestrator to call. Keeping
this separate from db/chroma_client.py so the orchestrator depends on a
stable interface even if the underlying vector store ever changes.
"""

from app.db import chroma_client


def search_documents(question: str, company: str | None = None, n_results: int = 5) -> list[dict]:
    where = {"company": company} if company else None
    return chroma_client.query(question, n_results=n_results, where=where)
