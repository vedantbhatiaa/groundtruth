from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import sites, chat, ingest

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


@app.get("/api/health")
def health():
    return {"status": "ok"}
