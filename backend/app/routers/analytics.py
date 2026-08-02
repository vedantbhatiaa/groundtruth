from fastapi import APIRouter, Query
from app.services import graph_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/company/{company}/timeseries")
def company_timeseries(company: str):
    return graph_service.company_timeseries(company)


@router.get("/stats/timeseries")
def stats_timeseries(
    industry: list[str] | None = Query(default=None),
    country: str | None = Query(default=None),
):
    return graph_service.stats_timeseries(industry=industry, country=country)
