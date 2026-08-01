"""
GDELT DOC 2.0 API is the primary path: simple JSON, no key, no cost.

If a query returns nothing or the API errors, the documented fallback is
GDELT's public BigQuery dataset (also free) rather than parsing the raw
GKG TSV dumps directly, which are large and inconsistently formatted. That
fallback isn't wired up here since it needs a Google Cloud project; the
function below raises a clear error so the caller knows to try that path
manually if it's ever needed. See docs/architecture.md for details.
"""

import httpx
from app.config import settings


async def search_news(query: str, max_records: int = 25) -> list[dict]:
    params = {
        "query": query,
        "mode": "artlist",
        "maxrecords": max_records,
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(settings.gdelt_doc_api, params=params)
        response.raise_for_status()
        data = response.json()

    articles = data.get("articles", [])
    return [
        {
            "title": a.get("title"),
            "url": a.get("url"),
            "published": a.get("seendate"),
            "source": a.get("domain"),
        }
        for a in articles
    ]
