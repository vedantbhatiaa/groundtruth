from pydantic import BaseModel


class Site(BaseModel):
    id: str
    name: str
    company: str
    country: str
    sector: str
    lat: float
    lng: float
    co2_mt: float
    trend_pct: float
    intensity: str  # "high" | "medium" | "low"


class ChatRequest(BaseModel):
    message: str
    # optional context so the assistant knows what's currently selected/filtered
    active_site_id: str | None = None
    industry_filter: list[str] = []


class ChatResponse(BaseModel):
    answer: str
    sources_used: list[str]
