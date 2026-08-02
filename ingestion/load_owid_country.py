"""
Loads Our World in Data's CO2 & energy dataset as COUNTRY-level context,
attached to the Country nodes the Climate TRACE loader already creates.

Why this source: it solves the two real gaps at once.
- Time span: coverage runs from the 1800s to 2024 (vs Climate TRACE's few
  years), so trend analysis stops being a 4-point line.
- Alignment: its fuel splits map directly onto the industries already in
  the graph — coal_co2 + gas_co2 -> power, oil_co2 + gas_co2 -> oil & gas,
  cement_co2 -> manufacturing. Nothing has to be invented to make them fit.
- Denominators: population and energy use give real per-capita and
  per-unit-energy intensity, which site emissions alone can't provide.

Free, no key, single CSV (~14 MB). Joined on ISO3 code — an exact key
match, so unlike the WRI spatial join there's no fuzzy matching involved.

Usage (venv active, from project root, Neo4j running, AFTER the Climate
TRACE loader):
    python ingestion/load_owid_country.py
    python ingestion/load_owid_country.py --from-year 1990   # optional
"""

import argparse
import csv
import io
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.db.neo4j_client import run_write  # noqa: E402

CSV_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"

# Only fields that answer a question the platform actually asks.
NUMERIC_FIELDS = [
    "co2", "coal_co2", "oil_co2", "gas_co2", "cement_co2", "flaring_co2",
    "co2_per_capita", "co2_growth_prct", "energy_per_capita",
    "share_global_co2", "cumulative_co2", "population",
]

UPSERT = """
MERGE (co:Country {iso: $iso})
  ON CREATE SET co.name = $country
SET co.name = coalesce(co.name, $country)
MERGE (cs:CountryStat {iso: $iso, year: $year})
SET cs += $props, cs.source = 'owid'
MERGE (co)-[:HAS_STAT]->(cs)
"""


def main(from_year: int):
    print(f"Downloading OWID CO2 dataset (~14 MB)…")
    resp = httpx.get(CSV_URL, timeout=180, follow_redirects=True)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))

    written = 0
    countries = set()
    skipped_aggregates = 0
    for row in reader:
        iso = (row.get("iso_code") or "").strip()
        # OWID includes aggregates ("World", "Asia", income groups) with
        # blank or non-3-letter codes — those aren't countries, skip them.
        if len(iso) != 3:
            skipped_aggregates += 1
            continue
        try:
            year = int(row["year"])
        except (KeyError, ValueError):
            continue
        if year < from_year:
            continue

        props = {}
        for field in NUMERIC_FIELDS:
            raw = (row.get(field) or "").strip()
            if raw:
                try:
                    props[field] = float(raw)
                except ValueError:
                    pass
        if not props:
            continue

        run_write(UPSERT, iso=iso, country=row.get("country", iso), year=year, props=props)
        countries.add(iso)
        written += 1

    print(f"\nLoaded {written} country-year records across {len(countries)} countries "
          f"(from {from_year}).")
    print(f"Skipped {skipped_aggregates} aggregate rows (World, continents, income groups).")
    print("Note: OWID no longer populates GDP in recent years, so co2_per_gdp is "
          "unavailable — per-capita and per-unit-energy intensity are used instead.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-year", type=int, default=1950,
                        help="earliest year to load (default 1950; data goes back further)")
    args = parser.parse_args()
    main(args.from_year)
