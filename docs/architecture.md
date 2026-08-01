# Architecture

## Entity schema (Neo4j)

```
(:Company {id, name, industry, hq_country})
(:Site {id, name, lat, lon, sector, subsector, intensity})
(:Country {iso, name})
(:EmissionRecord {year, gas, tons, source})
(:NewsMention {url, published, sentiment, source})
(:Filing {doc_id, type, year, source})

(:Company)-[:OWNS]->(:Site)
(:Site)-[:LOCATED_IN]->(:Country)
(:Site)-[:EMITS]->(:EmissionRecord)
(:Company)-[:MENTIONED_IN]->(:NewsMention)
(:Company)-[:FILED]->(:Filing)
```

See `ingestion/neo4j_schema.cypher` for the constraint definitions.

## Data flow

Two speeds of data, deliberately kept separate:

- **Static/batch**: Climate TRACE CSVs, loaded once (or on a schedule) via
  `ingestion/load_climate_trace.py` directly into Neo4j. This is the
  Company/Site/Country/EmissionRecord backbone.
- **On-demand/live**: news (GDELT), filings (SEC EDGAR), and sustainability
  report PDFs. These are fetched only when a user's question or click
  requires them, processed (PDF → markdown → relevant sections →
  embeddings), and cached (SQLite tracks what's already been processed;
  ChromaDB stores the embeddings) so nothing is ever re-fetched or
  re-embedded unnecessarily.

## Chat orchestration

`backend/app/services/orchestrator.py` implements a four-step pipeline:

1. **Classify** — a cheap keyword heuristic decides whether the question
   needs the structured graph, the document/news vector store, or both.
   No LLM call is spent just to route the question.
2. **Retrieve** — in parallel where both are needed: the graph path asks
   the LLM to generate Cypher, then validates it (`cypher_guard.py`)
   before running it on a read-only Neo4j connection; the vector path
   embeds the question and searches ChromaDB.
3. **Synthesize** — both contexts are handed to the LLM (Groq) with an
   instruction to answer only from what's provided.
4. **Log** — the prompt, which sources were used, and a summary of the
   answer are written to SQLite's `query_log` table.

This was designed around LangGraph's classify/retrieve/synthesize node
pattern but implemented as plain async functions rather than depending on
the LangGraph package — see the docstring in `orchestrator.py` for the
reasoning; swapping to real LangGraph later is a contained change since
each step is already isolated.

## Cypher safety (defense in depth)

Two independent layers, so a failure in one doesn't mean a write actually
happens:

1. `cypher_guard.validate()` rejects any query containing write/admin
   keywords (`CREATE`, `MERGE`, `DELETE`, `SET`, `REMOVE`, `DROP`, APOC
   procedure calls, `LOAD CSV`), and enforces a row limit.
2. The query then runs on a Neo4j connection authenticated as a
   **read-only database user** (`NEO4J_READONLY_USER`), which physically
   cannot write regardless of what query text reaches it. See
   `docs/setup.md` for the GRANT statements to create that user.

## Why ChromaDB, Groq, and local embeddings

- **ChromaDB** runs embedded — no separate server process, nothing to
  provision — which matched wanting free and low-friction infrastructure.
- **Groq** hosts open-weight models (Llama 3.3, Qwen) with a genuinely
  free tier and fast inference, avoiding the cost of a proprietary model
  API for a personal project.
- **Embeddings run locally** via `sentence-transformers` rather than
  through a paid embeddings API — this is the step that would otherwise
  scale in cost fastest given how many document chunks flow through it
  when processing full sustainability reports.
