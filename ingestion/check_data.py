"""
Prints what's actually IN Neo4j right now — the one thing a GitHub repo
can't tell you, since the repo holds code, not database contents.

Usage (venv active, from project root):
    python ingestion/check_data.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.db.neo4j_client import run_read  # noqa: E402

CHECKS = [
    ("Companies", "MATCH (c:Company) RETURN count(c) AS n"),
    ("Sites", "MATCH (s:Site) RETURN count(s) AS n"),
    ("Emission records", "MATCH (e:EmissionRecord) RETURN count(e) AS n"),
    ("Country stat records (OWID)", "MATCH (cs:CountryStat) RETURN count(cs) AS n"),
    ("Sites with WRI capacity", "MATCH (s:Site) WHERE s.capacity IS NOT NULL RETURN count(s) AS n"),
    ("Sites with WRI generation", "MATCH (s:Site) WHERE s.generation_gwh IS NOT NULL RETURN count(s) AS n"),
    ("Sites with industry set", "MATCH (s:Site) WHERE s.industry IS NOT NULL RETURN count(s) AS n"),
]


def main():
    print("=" * 52)
    print("GROUNDTRUTH DATA CHECK")
    print("=" * 52)
    for label, query in CHECKS:
        try:
            print(f"{label:32} {run_read(query)[0]['n']}")
        except Exception as exc:
            print(f"{label:32} ERROR: {exc}")

    print("\nEmission record years:")
    for row in run_read(
        "MATCH (e:EmissionRecord) RETURN e.year AS year, count(*) AS n ORDER BY year"
    ):
        print(f"  {row['year']}: {row['n']}")

    print("\nSites per industry:")
    for row in run_read(
        "MATCH (s:Site) RETURN coalesce(s.industry,'(not set)') AS industry, "
        "count(*) AS n ORDER BY n DESC"
    ):
        print(f"  {row['industry']}: {row['n']}")

    print("\nOWID country coverage (top 5 by record count):")
    rows = run_read(
        "MATCH (co:Country)-[:HAS_STAT]->(cs:CountryStat) "
        "RETURN co.name AS country, count(cs) AS years, min(cs.year) AS first, "
        "max(cs.year) AS last ORDER BY years DESC LIMIT 5"
    )
    if not rows:
        print("  NONE — run: python ingestion/load_owid_country.py")
    for row in rows:
        print(f"  {row['country']}: {row['years']} years ({row['first']}-{row['last']})")


if __name__ == "__main__":
    main()
