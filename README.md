# Groundtruth

A GIS + knowledge graph platform for tracing corporate emissions to specific
sites, with an AI assistant that reasons over both structured site data and
live news/filings.

Scope: power & energy and oil & gas industries, using Climate TRACE
asset-level emissions as the structured base, enriched on demand with GDELT
news, SEC EDGAR filings, and company sustainability reports.

## Project layout

```
groundtruth/
├── backend/        FastAPI app: API routes, graph queries, RAG, LLM orchestration
├── frontend/        React + Vite app: the globe/map UI, filters, and chat assistant
├── ingestion/        One-off and scheduled scripts that load data into the graph
├── docs/             Architecture notes and setup guide
└── docker-compose.yml   Spins up Neo4j locally
```

## Quick start

1. Copy `.env.example` to `.env` and fill in `GROQ_API_KEY` (free at
   console.groq.com) and a Neo4j password.
2. Start Neo4j: `docker compose up -d`
3. Backend: see `backend/README.md`
4. Frontend: see `frontend/README.md`
5. Load sample data: `python ingestion/load_climate_trace.py --sample`

Full setup details are in `docs/setup.md`. Architecture and data flow are in
`docs/architecture.md`.

## Why this structure

Each top-level folder is independently runnable and testable. The backend
never assumes the frontend is React specifically — it's a plain REST API.
The ingestion scripts are separate from the backend app so that loading data
doesn't require the API server to be running.
