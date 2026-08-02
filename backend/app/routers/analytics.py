from fastapi import APIRouter, Query
from app.services import graph_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/company/{company}/timeseries")
def company_timeseries(
    company: str,
    year_from: int | None = Query(default=None),
    year_to: int | None = Query(default=None),
):
    return graph_service.company_timeseries(company, year_from=year_from, year_to=year_to)


@router.get("/stats/timeseries")
def stats_timeseries(
    industry: list[str] | None = Query(default=None),
    country: str | None = Query(default=None),
):
    return graph_service.stats_timeseries(industry=industry, country=country)


@router.get("/country/{name}/timeseries")
def country_timeseries(
    name: str,
    from_year: int = Query(default=1990),
    to_year: int = Query(default=2024),
):
    """Accepts a country NAME (what the UI has) and resolves it to ISO3."""
    iso = name if len(name) == 3 and name.isupper() else graph_service.country_iso_for_name(name)
    if not iso:
        return []
    return graph_service.country_timeseries(iso, from_year=from_year, to_year=to_year)
