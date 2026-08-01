"""
Loads site/company/emissions data into Neo4j, following the schema in
neo4j_schema.cypher. Run with --sample to load the small mock dataset
(sites_sample.csv, the same 8 sites the frontend prototype used) for local
development without needing a full Climate TRACE download.

For the real dataset: download the relevant sector CSVs from
https://climatetrace.org/data, reshape them to match the columns in
sites_sample.csv (or adjust the COLUMN_MAP below), and point --input at
that file instead.

Usage:
    python ingestion/load_climate_trace.py --sample
    python ingestion/load_climate_trace.py --input path/to/climate_trace_export.csv
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.db.neo4j_client import run_write  # noqa: E402

_UPSERT_QUERY = """
MERGE (c:Company {id: $company_id})
  ON CREATE SET c.name = $company, c.industry = $industry, c.hq_country = $hq_country

MERGE (co:Country {iso: $country_iso})
  ON CREATE SET co.name = $country

MERGE (s:Site {id: $site_id})
  ON CREATE SET s.name = $site_name, s.lat = $lat, s.lon = $lon,
                s.sector = $sector, s.intensity = $intensity

MERGE (c)-[:OWNS]->(s)
MERGE (s)-[:LOCATED_IN]->(co)

MERGE (e:EmissionRecord {site_id: $site_id, year: $year, gas: $gas})
  ON CREATE SET e.tons = $tons, e.source = 'climate_trace'
MERGE (s)-[:EMITS]->(e)
"""


def _company_id(company_name: str) -> str:
    return company_name.lower().replace(" ", "-")


def load(csv_path: Path):
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            run_write(
                _UPSERT_QUERY,
                company_id=_company_id(row["company"]),
                company=row["company"],
                industry=row["industry"],
                hq_country=row["hq_country"],
                country_iso=row["country_iso"],
                country=row["country"],
                site_id=row["site_id"],
                site_name=row["site_name"],
                lat=float(row["lat"]),
                lon=float(row["lon"]),
                sector=row["sector"],
                intensity=row["intensity"],
                year=int(row["year"]),
                gas=row["gas"],
                tons=float(row["tons_millions"]),
            )
            count += 1
    print(f"Loaded {count} site records from {csv_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", action="store_true", help="load the bundled sample dataset")
    parser.add_argument("--input", type=str, help="path to a Climate TRACE-shaped CSV")
    args = parser.parse_args()

    if args.sample:
        path = Path(__file__).parent / "sample_data" / "sites_sample.csv"
    elif args.input:
        path = Path(args.input)
    else:
        parser.error("pass either --sample or --input path/to/file.csv")

    load(path)
