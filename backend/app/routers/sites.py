from fastapi import APIRouter, HTTPException, Query
from app.services import graph_service

router = APIRouter(prefix="/api/sites", tags=["sites"])


@router.get("")
def list_sites(
    industry: list[str] | None = Query(default=None),
    country: str | None = Query(default=None),
    year: int = Query(default=2024, ge=2010, le=2025),
    trend_window: int = Query(default=5),
):
    return graph_service.list_sites(
        industry=industry, country=country, year=year, trend_window=trend_window
    )


@router.get("/sectors")
def available_sectors():
    """Must be declared before /{site_id} so it isn't captured as an id."""
    return graph_service.available_sectors()


@router.get("/{site_id}")
def get_site(site_id: str):
    site = graph_service.get_site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="site not found")
    return site

@router.get("/{site_id}/timeseries")
def site_timeseries(site_id: str):
    return graph_service.site_timeseries(site_id)

