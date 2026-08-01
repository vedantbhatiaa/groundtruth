"""
SEC EDGAR's full-text search is free and official, but requires a
descriptive User-Agent header identifying the requester (not an API key —
SEC blocks generic/anonymous user agents to prevent abuse).
"""

import httpx
from app.config import settings

_FULL_TEXT_SEARCH = "https://efts.sec.gov/LATEST/search-index"


async def search_filings(company_name: str, form_type: str = "10-K") -> list[dict]:
    params = {"q": company_name, "forms": form_type}
    headers = {"User-Agent": settings.sec_edgar_user_agent}

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(_FULL_TEXT_SEARCH, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

    hits = data.get("hits", {}).get("hits", [])
    return [
        {
            "company": hit["_source"].get("display_names", [company_name])[0],
            "form_type": hit["_source"].get("forms"),
            "filed": hit["_source"].get("file_date"),
            "accession_no": hit["_source"].get("adsh"),
        }
        for hit in hits
    ]
