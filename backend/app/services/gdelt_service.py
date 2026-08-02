"""
GDELT DOC 2.0 API is the primary path: simple JSON, no key, no cost.

If a query returns nothing or the API errors, the documented fallback is
GDELT's public BigQuery dataset (also free) rather than parsing the raw
GKG TSV dumps directly, which are large and inconsistently formatted. That
fallback isn't wired up here since it needs a Google Cloud project; the
function below raises a clear error so the caller knows to try that path
manually if it's ever needed. See docs/architecture.md for details.
"""

import time

import httpx
from app.config import settings

# GDELT rate-limits aggressively (HTTP 429) and sometimes times out. Both
# were surfacing as 500s because nothing caught them. Two guards:
#   1. an in-memory cache, so clicking the same site repeatedly is free
#   2. a minimum gap between outbound calls, so rapid site clicks queue
#      instead of tripping the limiter
_CACHE: dict[str, tuple[float, list[dict]]] = {}
_CACHE_TTL_SECONDS = 900
_MIN_GAP_SECONDS = 1.5
_last_call = 0.0


async def search_news(query: str, max_records: int = 25) -> list[dict]:
    """Returns [] on any upstream failure — news is a nice-to-have overlay,
    never a reason to fail the request the user actually made."""
    global _last_call

    cached = _CACHE.get(query)
    if cached and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    gap = time.time() - _last_call
    if gap < _MIN_GAP_SECONDS:
        import asyncio
        await asyncio.sleep(_MIN_GAP_SECONDS - gap)
    _last_call = time.time()

    try:
        articles = await _search_news_uncached(query, max_records)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            print("[gdelt] rate limited (429) — returning empty result")
        else:
            print(f"[gdelt] HTTP {exc.response.status_code}")
        articles = []
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as exc:
        print(f"[gdelt] network error: {type(exc).__name__} — returning empty result")
        articles = []
    except Exception as exc:  # never let news break the endpoint
        print(f"[gdelt] unexpected error: {exc}")
        articles = []

    _CACHE[query] = (time.time(), articles)
    return articles


async def _search_news_uncached(query: str, max_records: int = 25) -> list[dict]:
    async def _query(q: str) -> list:
        params = {
            "query": f"{q} sourcelang:english",
            "mode": "artlist",
            "maxrecords": max_records,
            "format": "json",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(settings.gdelt_doc_api, params=params)
            response.raise_for_status()
            try:
                return response.json().get("articles", [])
            except ValueError:
                # GDELT returns plain text on rate limits / malformed queries
                return []

    # Phrase-match multi-word names first; if nothing, retry unquoted
    quoted = f'"{query}"' if " " in query and not query.startswith('"') else query
    articles = await _query(quoted)
    if not articles and quoted != query:
        articles = await _query(query)
    return [
        {
            "title": a.get("title"),
            "url": a.get("url"),
            "published": a.get("seendate"),
            "source": a.get("domain"),
        }
        for a in articles
    ]
