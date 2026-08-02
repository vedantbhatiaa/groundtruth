"""
The chatbot's decision pipeline: classify -> retrieve -> synthesize -> log.

Retrieval draws on three real sources:
- the knowledge graph (LLM-generated Cypher, guarded, PLUS a deterministic
  baseline summary so the model always has real numbers to work with)
- live GDELT news, fetched at question time when the question is news-like
  (previously news questions went only to the vector store, which is empty
  until documents are ingested — that was the "no context provided" bug)
- the vector store (ingested documents), when it has anything

Hand-rolled rather than LangGraph for readability; each step is a function.
"""

import asyncio

from app.services import graph_service, rag_service, llm_service, gdelt_service
from app.db.sqlite_client import log_query

GRAPH_SCHEMA_DESCRIPTION = """
(:Company {name, industry, hq_country}) -[:OWNS]-> (:Site {name, lat, lon, sector, capacity, generation_gwh, primary_fuel})
(:Site) -[:LOCATED_IN]-> (:Country {name, iso})
(:Site) -[:EMITS]-> (:EmissionRecord {year, gas, tons})
Note: tons are MILLIONS of tonnes CO2e. industry is one of: power, oil, manufacturing.
"""


def classify(message: str) -> dict:
    lowered = message.lower()
    news_markers = ["news", "headline", "article", "press", "media", "recent", "latest"]
    doc_markers = ["report", "filing", "say about", "sentiment", "risk", "disclosure"]
    wants_news = any(m in lowered for m in news_markers)
    wants_vector = any(m in lowered for m in doc_markers)
    # The graph is always consulted: it's the platform's core data, and a
    # baseline of real numbers grounds every answer.
    return {"graph": True, "news": wants_news, "vector": wants_vector}


def _baseline_summary() -> str:
    """Deterministic graph facts included with every question, so the LLM
    always has real data even when its generated Cypher fails."""
    try:
        totals = graph_service.run_llm_cypher(
            "MATCH (c:Company)-[:OWNS]->(s:Site)-[:EMITS]->(e:EmissionRecord) "
            "RETURN max(e.year) AS latest_year, count(DISTINCT s) AS sites, "
            "count(DISTINCT c) AS companies"
        )
        top = graph_service.run_llm_cypher(
            "MATCH (c:Company)-[:OWNS]->(s:Site)-[:EMITS]->(e:EmissionRecord) "
            "WITH c, e WHERE e.year = 2024 "
            "RETURN c.name AS company, c.industry AS industry, "
            "round(sum(e.tons)) AS mt_co2e_2024 ORDER BY mt_co2e_2024 DESC LIMIT 8"
        )
        return f"Dataset overview: {totals}\nTop emitting companies 2024 (millions of tonnes): {top}"
    except Exception as exc:
        return f"(baseline summary unavailable: {exc})"


async def _news_context(message: str) -> tuple[str, list[dict]]:
    """Extracts search terms with the LLM, then fetches live GDELT news."""
    try:
        terms = await asyncio.to_thread(
            llm_service.complete,
            "Extract the best 2-4 word news search phrase (a company, country, "
            "commodity, or topic) from the user's question. Reply with ONLY the "
            "phrase, no quotes, no explanation.",
            message,
        )
        terms = terms.strip().strip('"').split("\n")[0][:60]
        articles = await gdelt_service.search_news(terms, max_records=8)
        if not articles:
            return f"(no recent news found for '{terms}')", []
        lines = [f"- {a['title']} ({a['source']}, {a['published']})" for a in articles if a.get("title")]
        return f"Live news results for '{terms}':\n" + "\n".join(lines), articles
    except Exception as exc:
        return f"(news lookup failed: {exc})", []


async def handle_message(message: str, active_site_id: str | None = None) -> dict:
    route = classify(message)
    sources_used = []
    parts = []

    baseline = await asyncio.to_thread(_baseline_summary)
    parts.append(f"Structured data baseline:\n{baseline}")
    if "unavailable" not in baseline:
        sources_used.append("graph")

    try:
        cypher = await asyncio.to_thread(llm_service.generate_cypher, message, GRAPH_SCHEMA_DESCRIPTION)
        rows = await asyncio.to_thread(graph_service.run_llm_cypher, cypher)
        if rows:
            parts.append(f"Query results for this question:\n{str(rows[:25])}")
    except Exception as exc:
        parts.append(f"(specific graph query unavailable: {exc})")

    if route["news"]:
        news_text, articles = await _news_context(message)
        parts.append(news_text)
        if articles:
            sources_used.append("news")

    if route["vector"]:
        results = await asyncio.to_thread(rag_service.search_documents, message)
        if results:
            parts.append("Document excerpts:\n" + "\n".join(r["text"] for r in results))
            sources_used.append("documents")

    system_prompt = (
        "You are Groundtruth's assistant for a site-level emissions platform. "
        "Answer concisely using the context below. Emission figures are in "
        "millions of tonnes CO2e unless stated otherwise. If the context "
        "doesn't cover the question, say what IS available instead of just "
        "declining.\n\n" + "\n\n".join(parts)
    )
    answer = await asyncio.to_thread(llm_service.complete, system_prompt, message)

    log_query(message, sources_used, answer)
    return {"answer": answer, "sources_used": sources_used}
