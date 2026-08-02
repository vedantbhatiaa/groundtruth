"""
Two ways into the graph, on purpose:

- `list_sites` / `get_site` — fixed, hand-written queries for the frontend's
  normal operation. These never touch LLM output at all.
- `run_llm_cypher` — the chatbot orchestrator's path. Always validated by
  cypher_guard first, always on the read-only connection.

list_sites now takes a `year` and a `trend_window`: co2 comes from that
year's EmissionRecord, and trend is computed against the record from
(year - trend_window). This is what makes the year dropdown and the
5YR/10YR toggle real instead of decorative.
"""

from app.db.neo4j_client import run_read
from app.services.cypher_guard import validate


def list_sites(
    industry: list[str] | None = None,
    country: str | None = None,
    year: int = 2024,
    trend_window: int = 5,
) -> list[dict]:
    base_year = year - trend_window
    query = """
    MATCH (c:Company)-[:OWNS]->(s:Site)-[:LOCATED_IN]->(co:Country)
    WHERE ($industry IS NULL OR coalesce(s.industry, c.industry) IN $industry)
      AND ($country IS NULL OR co.name = $country)
    OPTIONAL MATCH (s)-[:EMITS]->(e:EmissionRecord {year: $year})
    OPTIONAL MATCH (s)-[:EMITS]->(b:EmissionRecord {year: $base_year})
    RETURN s.id AS id, s.name AS name, c.name AS company, co.name AS country,
           s.sector AS sector, s.lat AS lat, s.lon AS lng,
           e.tons AS co2, b.tons AS baseline, s.intensity AS intensity,
           s.capacity AS capacity, s.asset_type AS asset_type,
           s.generation_gwh AS generation_gwh, s.primary_fuel AS primary_fuel,
           s.commissioning_year AS commissioning_year
    LIMIT 400
    """
    rows = run_read(query, industry=industry, country=country, year=year, base_year=base_year)
    for row in rows:
        co2 = row.get("co2")
        baseline = row.pop("baseline", None)
        if co2 is not None and baseline:
            pct = (co2 - baseline) / baseline * 100
            row["trend"] = f"{'+' if pct >= 0 else ''}{pct:.0f}%"
        else:
            # No record for the baseline year (e.g. 10YR window on data that
            # only goes back 5 years) — report that honestly.
            row["trend"] = "n/a"
        row.setdefault("news", [])
    # Drop sites with no record for the selected year rather than showing
    # them with a null co2 that breaks sizing on the globe.
    return [r for r in rows if r.get("co2") is not None]


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

def company_timeseries(
    company: str,
    year_from: int | None = None,
    year_to: int | None = None,
) -> dict:
    """Per-year emission totals and sector split for one company — powers
    the deep-dive company view's charts with real graph data."""
    years = run_read(
        """
        MATCH (c:Company {name: $company})-[:OWNS]->(s:Site)-[:EMITS]->(e:EmissionRecord)
        WHERE ($year_from IS NULL OR e.year >= $year_from)
          AND ($year_to IS NULL OR e.year <= $year_to)
        RETURN e.year AS year, round(sum(e.tons) * 10) / 10 AS total
        ORDER BY year
        """,
        company=company, year_from=year_from, year_to=year_to,
    )
    sectors = run_read(
        """
        MATCH (c:Company {name: $company})-[:OWNS]->(s:Site)-[:EMITS]->(e:EmissionRecord)
        WITH s.sector AS sector, e.year AS year, sum(e.tons) AS total
        ORDER BY year DESC
        WITH sector, collect(total)[0] AS latest
        RETURN sector, round(latest * 10) / 10 AS total
        """,
        company=company,
    )
    sectors_by_year = run_read(
        """
        MATCH (c:Company {name: $company})-[:OWNS]->(s:Site)-[:EMITS]->(e:EmissionRecord)
        WHERE ($year_from IS NULL OR e.year >= $year_from)
          AND ($year_to IS NULL OR e.year <= $year_to)
        RETURN e.year AS year, s.sector AS sector, round(sum(e.tons) * 10) / 10 AS total
        ORDER BY year
        """,
        company=company, year_from=year_from, year_to=year_to,
    )
    return {"years": years, "sectors": sectors, "sectors_by_year": sectors_by_year}


def stats_timeseries(industry: list[str] | None = None, country: str | None = None) -> list[dict]:
    """Yearly totals for the current filter selection — powers the summary
    card's sparkline with real data instead of decorative bars."""
    return run_read(
        """
        MATCH (c:Company)-[:OWNS]->(s:Site)-[:LOCATED_IN]->(co:Country)
        WHERE ($industry IS NULL OR coalesce(s.industry, c.industry) IN $industry)
          AND ($country IS NULL OR co.name = $country)
        MATCH (s)-[:EMITS]->(e:EmissionRecord)
        RETURN e.year AS year, round(sum(e.tons) * 10) / 10 AS total
        ORDER BY year
        """,
        industry=industry, country=country,
    )


def site_timeseries(site_id: str) -> list[dict]:
    return run_read(
        """
        MATCH (s:Site {id: $site_id})-[:EMITS]->(e:EmissionRecord)
        RETURN e.year AS year, e.tons AS tons ORDER BY e.year
        """,
        site_id=site_id,
    )


def country_timeseries(iso: str, from_year: int = 1990, to_year: int = 2024) -> list[dict]:
    """Long-span country context from OWID (loaded by load_owid_country.py).
    Separate from site emissions: this is national-scale, decades deep."""
    return run_read(
        """
        MATCH (co:Country {iso: $iso})-[:HAS_STAT]->(cs:CountryStat)
        WHERE cs.year >= $from_year AND cs.year <= $to_year
        RETURN cs.year AS year, cs.co2 AS co2, cs.coal_co2 AS coal_co2,
               cs.oil_co2 AS oil_co2, cs.gas_co2 AS gas_co2,
               cs.cement_co2 AS cement_co2, cs.co2_per_capita AS co2_per_capita,
               cs.energy_per_capita AS energy_per_capita,
               cs.share_global_co2 AS share_global_co2,
               cs.population AS population
        ORDER BY year
        """,
        iso=iso, from_year=from_year, to_year=to_year,
    )


def country_iso_for_name(name: str) -> str | None:
    rows = run_read("MATCH (co:Country {name: $name}) RETURN co.iso AS iso LIMIT 1", name=name)
    return rows[0]["iso"] if rows else None
