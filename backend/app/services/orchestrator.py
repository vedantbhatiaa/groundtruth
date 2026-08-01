"""
The chatbot's decision pipeline: classify -> retrieve (graph and/or vector,
in parallel) -> synthesize -> log.

This is written as plain functions rather than pulling in the LangGraph
library. The earlier architecture discussion used LangGraph's node/edge
model as the *design pattern* to follow, not a hard requirement to depend
on the package — a hand-rolled version of the same four steps is easier
for someone new to the codebase to read top to bottom, and is simple enough
here that a graph-execution framework doesn't pay for itself yet. If the
orchestration logic grows more branches later, swapping this for real
LangGraph is a contained change, since each step is already its own
function.
"""

import asyncio
from app.services import graph_service, rag_service, llm_service
from app.db.sqlite_client import log_query

GRAPH_SCHEMA_DESCRIPTION = """
(:Company {name, industry, hq_country}) -[:OWNS]-> (:Site {name, lat, lon, sector})
(:Site) -[:LOCATED_IN]-> (:Country {name, iso})
(:Site) -[:EMITS]-> (:EmissionRecord {year, gas, tons})
(:Company) -[:MENTIONED_IN]-> (:NewsMention {url, published, sentiment})
(:Company) -[:FILED]-> (:Filing {doc_id, type, year})
"""


def classify(message: str) -> dict:
    """
    Cheap heuristic classifier: structured-sounding questions (numbers,
    "how many", company/site names) go to the graph; open-ended or
    news/opinion questions go to the vector store. Ambiguous questions
    query both. This avoids an extra LLM round-trip just to route the
    question, which matters for response latency.
    """
    lowered = message.lower()
    structured_markers = ["how many", "how much", "total", "list", "which sites", "compare"]
    unstructured_markers = ["news", "report", "say about", "sentiment", "filing", "risk"]

    wants_graph = any(marker in lowered for marker in structured_markers)
    wants_vector = any(marker in lowered for marker in unstructured_markers)

    if not wants_graph and not wants_vector:
        wants_graph = wants_vector = True

    return {"graph": wants_graph, "vector": wants_vector}


async def handle_message(message: str, active_site_id: str | None = None) -> dict:
    route = classify(message)
    sources_used = []
    graph_context = ""
    vector_context = ""

    if route["graph"]:
        try:
            cypher = llm_service.generate_cypher(message, GRAPH_SCHEMA_DESCRIPTION)
            rows = graph_service.run_llm_cypher(cypher)
            graph_context = str(rows[:20])
            sources_used.append("graph")
        except Exception as exc:  # guardrail rejection or query error
            graph_context = f"(graph lookup unavailable: {exc})"

    if route["vector"]:
        results = rag_service.search_documents(message)
        vector_context = "\n".join(r["text"] for r in results)
        if results:
            sources_used.append("documents")

    system_prompt = (
        "You are Groundtruth's assistant. Answer using only the context "
        "provided below. If the context doesn't cover the question, say so "
        "rather than guessing.\n\n"
        f"Structured data:\n{graph_context}\n\nDocument excerpts:\n{vector_context}"
    )
    answer = await asyncio.to_thread(llm_service.complete, system_prompt, message)

    log_query(message, sources_used, answer)
    return {"answer": answer, "sources_used": sources_used}
