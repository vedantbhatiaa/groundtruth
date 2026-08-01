# Setup guide

## 1. Neo4j

```bash
docker compose up -d
```

Wait for it to come up, then open http://localhost:7474 (login: neo4j /
changeme, as set in docker-compose.yml) and run the contents of
`ingestion/neo4j_schema.cypher` to create the constraints.

### Create the read-only user

The chatbot's generated Cypher runs as a separate database user with only
read privileges, so it physically cannot write even if the query-text
guardrail were ever bypassed. In the Neo4j browser (or `cypher-shell`),
as an admin:

```cypher
CREATE USER groundtruth_reader SET PASSWORD 'changeme_too' CHANGE NOT REQUIRED;
GRANT ROLE reader TO groundtruth_reader;
GRANT MATCH {*} ON GRAPH neo4j TO reader;
```

(Neo4j Community Edition has a simpler role model than Enterprise; if
`GRANT ROLE` isn't available in your version, the built-in `reader` role
already ships with your Neo4j image and can be assigned directly via
`GRANT ROLE reader TO groundtruth_reader`.)

## 2. Load data

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
python ingestion/load_climate_trace.py --sample
```

This loads the 8-site sample dataset. To load the real Climate TRACE
data instead, download the power and oil & gas sector CSVs from
https://climatetrace.org/data, reshape them to match the columns in
`ingestion/sample_data/sites_sample.csv`, and run:

```bash
python ingestion/load_climate_trace.py --input path/to/your_file.csv
```

## 3. Environment variables

```bash
cp .env.example .env
```

Fill in:
- `GROQ_API_KEY` — free at https://console.groq.com/keys
- `NEO4J_PASSWORD` / `NEO4J_READONLY_PASSWORD` — matching whatever you set
  in step 1

## 4. Run the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Check http://localhost:8000/api/health returns `{"status": "ok"}`.

## 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Common issues

- **Globe doesn't render**: check the browser console — this is almost
  always a CORS or network issue loading the earth texture from unpkg.
- **Chat says "backend unavailable"**: the frontend falls back
  gracefully, but check `uvicorn` is actually running on port 8000 and
  that `.env` has a valid `GROQ_API_KEY`.
- **Cypher guardrail rejects a valid-looking query**: check for a write
  keyword appearing inside a property name or string literal — the guard
  errs on the side of caution; loosen the regex in
  `backend/app/services/cypher_guard.py` deliberately and knowingly if
  you hit a real false positive.
