# Groundtruth — data strategy and deployment plan

Written to answer two questions: *what data actually earns its place*, and
*how storage should be arranged now so deployment isn't a scramble later*.

## 1. The principle: every field must answer a question

The failure mode to avoid is hoarding whatever is free. A field belongs in
Groundtruth only if it answers a question the platform claims to answer.
Groundtruth's claim is: **trace emissions to the physical site, and explain
what's driving them.** That gives four question types, and each maps to a
specific data need:

| Question | Data needed | Status |
|---|---|---|
| Who emits, where, how much, trending which way? | Asset emissions by year | DONE — Climate TRACE |
| Is that a lot *for what it produces*? | Capacity, generation/output | PARTIAL — WRI (power only) |
| Is it getting cleaner or dirtier per unit? | Intensity = emissions ÷ output | Derived; blocked on output coverage |
| What's happening around this asset right now? | News, filings, reports | DONE — GDELT, EDGAR |

Anything that doesn't serve one of these four is noise, however free.

## 2. Recommended additions, in priority order

**Priority 1 — output data for non-power sectors.** This is the biggest
genuine gap. Intensity (t CO2e per unit) is the single most analytically
valuable metric the platform could add, and today it only works for the 14
WRI-matched power sites. Options:
- Global Energy Monitor trackers (steel, cement, coal plants): capacity +
  status + start year. Free, but manual download form.
- Climate TRACE's own `activity` field: already captured by the loader
  where present; coverage varies by sector.

**Priority 2 — country context.** World Bank indicators (free, no key):
GDP, population, energy use per capita. Turns a raw site total into
"emissions per capita" and "emissions per unit GDP" — cheap to add, and
makes country comparisons meaningful rather than just "big countries emit
more".

**Priority 3 — grid carbon intensity.** Ember (free, registration): country
electricity mix. Lets the platform say whether a plant is dirty relative to
its own grid.

**Deliberately NOT recommended:** generic ESG scores (methodologically
opaque, would undermine the "traced to source" premise), paid satellite
imagery (cost, no analytical gain over Climate TRACE), and social media
sentiment (noisy; GDELT already covers news).

## 3. Storage model (decide now, deploy later)

The split already in place is the right one — this documents *why*, so it
survives deployment:

- **Neo4j — the master graph.** Entities and relationships: Company, Site,
  Country, EmissionRecord. Everything with a stable identity and
  relationships worth traversing. This is the only source of truth for
  structured facts.
- **ChromaDB — vector store.** Chunked text from reports/filings, for
  semantic retrieval. Rebuildable from source documents; never the sole
  home of anything.
- **SQLite — operational log.** Query logs, prompts, cached fetches.
  Disposable; useful for evaluating chatbot quality later.
- **Fetched-live, never stored:** news and filings. They go stale, and
  storing them would mean a staleness-invalidation problem for no gain.

Rule of thumb: **store what has identity and history; fetch what has a
timestamp and expires.**

## 4. Deployment readiness checklist

1. **Config** — all credentials already flow through `.env` + `config.py`.
   Nothing reads `os.environ` directly, so hosting means setting env vars.
2. **Neo4j** — move from local Docker to Neo4j AuraDB free tier; only
   `NEO4J_URI`/user/password change.
3. **Data reload is reproducible** — the ingestion scripts are idempotent
   (`MERGE`), so a fresh environment is one loader run away. Keep it that
   way: never hand-edit the graph.
4. **Backend** — containerize FastAPI (Render/Fly.io/Railway free tiers).
   ChromaDB and SQLite need a persistent volume, or accept rebuilding them.
5. **Frontend** — `npm run build` produces static files; deploy to
   Netlify/Vercel/GitHub Pages. Set the API base URL via a build-time env
   var instead of the current relative `/api` proxy.
6. **CORS** — `API_CORS_ORIGIN` must change from localhost to the deployed
   frontend origin.
7. **Secrets** — rotate the Groq key before making the repo public.

## 5. Honest current-state limits

- Intensity metrics cover only WRI-matched power sites (14 of 221).
- Sector coverage for non-power output data is not yet solved.
- No automated refresh: data reloads are manual loader runs.
- The vector store is empty — no reports have been ingested yet, so
  document-grounded chat answers aren't available until they are.
