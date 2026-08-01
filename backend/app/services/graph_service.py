"""
Two ways into the graph, on purpose:

- `list_sites` / `get_site` — fixed, hand-written queries for the frontend's
  normal operation (populating the globe, the site detail card). These never
  touch LLM output at all.
- `run_llm_cypher` — the path the chatbot's orchestrator uses when it
  decides a question needs a structured lookup. Always goes through
  cypher_guard.validate() first and always runs on the read-only connection.
"""

from app.db.neo4j_client import run_read
from app.services.cypher_guard import validate


def list_sites(industry: list[str] | None = None, country: str | None = None) -> list[dict]:
    query = """
    MATCH (c:Company)-[:OWNS]->(s:Site)-[:LOCATED_IN]->(co:Country)
    WHERE ($industry IS NULL OR c.industry IN $industry)
      AND ($country IS NULL OR co.name = $country)
    OPTIONAL MATCH (s)-[:EMITS]->(e:EmissionRecord)
    WITH s, c, co, e ORDER BY e.year DESC
    RETURN s.id AS id, s.name AS name, c.name AS company, co.name AS country,
           s.sector AS sector, s.lat AS lat, s.lon AS lng,
           e.tons AS co2, s.intensity AS intensity
    LIMIT 200
    """
    rows = run_read(query, industry=industry, country=country)
    # trend and news aren't in the graph yet (trend needs a year-over-year
    # calc, news needs a MENTIONED_IN traversal) — placeholder values here
    # keep the API contract matching the frontend's Site type until those
    # are wired up.
    for row in rows:
        row.setdefault("trend", "0%")
        row.setdefault("news", [])
    return rows


def get_site(site_id: str) -> dict | None:
    query = """
    MATCH (c:Company)-[:OWNS]->(s:Site {id: $site_id})-[:LOCATED_IN]->(co:Country)
    OPTIONAL MATCH (s)-[:EMITS]->(e:EmissionRecord)
    OPTIONAL MATCH (c)-[:MENTIONED_IN]->(n:NewsMention)
    RETURN s, c.name AS company, co.name AS country,
           collect(DISTINCT e) AS emissions, collect(DISTINCT n) AS news
    LIMIT 1
    """
    rows = run_read(query, site_id=site_id)
    return rows[0] if rows else None


def run_llm_cypher(query: str) -> list[dict]:
    """Entry point for the orchestrator. Raises UnsafeCypherError if rejected."""
    safe_query = validate(query)
    return run_read(safe_query)