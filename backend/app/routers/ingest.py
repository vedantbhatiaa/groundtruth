"""
Endpoints the frontend calls when a user asks for something not yet in the
cache — e.g. clicking "recent news" on a site the assistant hasn't looked
up before. These are separate from the main chat endpoint so a slow report
fetch doesn't block a chat response; the frontend can call these and show
a loading state independently.
"""

from fastapi import APIRouter
from app.services import gdelt_service, edgar_service, pdf_service

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.get("/news")
async def fetch_news(company: str):
    return await gdelt_service.search_news(company)


@router.get("/filings")
async def fetch_filings(company: str):
    return await edgar_service.search_filings(company)


@router.post("/report")
async def fetch_report(source_url: str, company: str):
    return await pdf_service.process_report(source_url, company)
