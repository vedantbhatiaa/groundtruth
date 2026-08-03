from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import sites, chat, ingest, analytics

app = FastAPI(title="Groundtruth API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.api_cors_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sites.router)
app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(analytics.router)


@app.on_event("startup")
def startup():
    """Create query indexes if they're missing. Cheap when they already exist."""
    from app.services.graph_service import ensure_indexes

    try:
        ensure_indexes()
        print("[startup] Neo4j indexes verified")
    except Exception as exc:
        print(f"[startup] index setup skipped: {exc}")


@app.get("/api/health")
def health():
    return {"status": "ok"}
