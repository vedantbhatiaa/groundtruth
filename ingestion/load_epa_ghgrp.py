"""
Loads US facility-level greenhouse gas data from the EPA's Greenhouse Gas
Reporting Program (GHGRP) via the Envirofacts REST API.

WHY THIS SOURCE — it fixes the two real gaps in the current dataset:

  1. TIME SPAN. GHGRP runs from 2010 to the latest reporting year, so US
     facilities gain ~14 years of history instead of Climate TRACE's 4.
     Trend lines, projections and YoY figures all become meaningful.
  2. SECTOR DEPTH. Every facility carries its reported industry sector
     (power, petroleum & natural gas, minerals, chemicals, pulp & paper,
     metals, waste, refineries), so company analysis stops being
     single-sector.

It is directly comparable to Climate TRACE in kind: both are
facility-level, geolocated, annual CO2e. The difference is that GHGRP is
REPORTED by operators under legal obligation, while Climate TRACE is
MODELLED from observation — so treat them as separate sources rather than
merging their numbers for the same asset. That's why records loaded here
are tagged source='epa_ghgrp' and given their own site ids.

Free, no API key. Coverage is US-only, facilities emitting >25,000 t
CO2e/yr (~8,000 facilities).

Usage (venv active, from project root, Neo4j running):
    python ingestion/load_epa_ghgrp.py                # 2010 to latest
    python ingestion/load_epa_ghgrp.py --from-year 2015 --limit 2000
"""

import argparse
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.db.neo4j_client import run_write  # noqa: E402

BASE = "https://data.epa.gov/efservice"
PAGE = 1000

# GHGRP industry sector -> (our industry, our sector)
SECTOR_MAP = {
    "power plants": ("power", "power-other"),
    "petroleum and natural gas systems": ("oil", "upstream"),
    "refineries": ("oil", "refining"),
    "minerals": ("manufacturing", "cement"),
    "chemicals": ("manufacturing", "chemicals"),
    "metals": ("manufacturing", "steel"),
    "pulp and paper": ("manufacturing", "pulp-paper"),
    "waste": ("manufacturing", "waste"),
    "other": ("manufacturing", "other"),
}

UPSERT = """
MERGE (c:Company {id: $company_id})
  ON CREATE SET c.name = $company, c.industry = $industry, c.hq_country = 'United States'
MERGE (co:Country {iso: 'USA'})
  ON CREATE SET co.name = 'United States'
MERGE (s:Site {id: $site_id})
  ON CREATE SET s.name = $site_name, s.lat = $lat, s.lon = $lon
  SET s.sector = $sector, s.industry = $industry, s.intensity = $intensity
MERGE (c)-[:OWNS]->(s)
MERGE (s)-[:LOCATED_IN]->(co)
MERGE (e:EmissionRecord {site_id: $site_id, year: $year, gas: 'co2e'})
  ON CREATE SET e.tons = $tons, e.source = 'epa_ghgrp'
MERGE (s)-[:EMITS]->(e)
"""


def get(d, *names, default=None):
    """Envirofacts changes field casing between tables/versions."""
    if not isinstance(d, dict):
        return default
    low = {k.lower(): v for k, v in d.items()}
    for n in names:
        if n.lower() in low and low[n.lower()] not in (None, ""):
            return low[n.lower()]
    return default


def fetch_table(client: httpx.Client, table: str, year: int, limit: int) -> list[dict]:
    """Pages one reporting year out of an Envirofacts table."""
    rows: list[dict] = []
    start = 0
    while start < limit:
        end = min(start + PAGE, limit) - 1
        url = f"{BASE}/{table}/year/{year}/rows/{start}:{end}/JSON"
        try:
            resp = client.get(url, timeout=90)
            resp.raise_for_status()
            batch = resp.json()
        except Exception as exc:
            print(f"  [{table} {year}] fetch failed at row {start}: {exc}")
            break
        if not isinstance(batch, list) or not batch:
            break
        rows.extend(batch)
        if len(batch) < (end - start + 1):
            break
        start += PAGE
    return rows


# NAICS prefix -> (industry, sector). Facility rows carry naics_code, which
# is a far more reliable sector signal than the single-letter subpart codes.
NAICS_MAP = [
    ("221112", ("power", "coal")),
    ("221117", ("power", "biomass")),
    ("221113", ("power", "nuclear")),
    ("221111", ("power", "hydro")),
    ("221114", ("power", "solar")),
    ("221115", ("power", "wind")),
    ("2211",   ("power", "power-other")),
    ("324110", ("oil", "refining")),
    ("32411",  ("oil", "refining")),
    ("2111",   ("oil", "upstream")),
    ("2212",   ("oil", "transport")),
    ("4861",   ("oil", "transport")),
    ("3273",   ("manufacturing", "cement")),
    ("32731",  ("manufacturing", "cement")),
    ("3311",   ("manufacturing", "steel")),
    ("3312",   ("manufacturing", "steel")),
    ("3313",   ("manufacturing", "aluminum")),
    ("3314",   ("manufacturing", "aluminum")),
    ("325",    ("manufacturing", "chemicals")),
    ("322",    ("manufacturing", "pulp-paper")),
    ("562",    ("manufacturing", "waste")),
    ("2123",   ("manufacturing", "minerals")),
]


def classify(naics: str | None) -> tuple[str, str]:
    code = str(naics or "")
    for prefix, mapped in NAICS_MAP:
        if code.startswith(prefix):
            return mapped
    return ("manufacturing", "other")


def main(from_year: int, to_year: int, limit: int):
    loaded = 0
    sites: dict[str, dict] = {}
    first_emis_row = None

    with httpx.Client(headers={"User-Agent": "groundtruth-project"}) as client:
        for year in range(from_year, to_year + 1):
            facilities = {
                str(get(r, "facility_id")): r
                for r in fetch_table(client, "pub_dim_facility", year, limit)
                if get(r, "facility_id")
            }

            # Emissions live in a separate fact table keyed on facility_id.
            emissions = fetch_table(client, "pub_facts_sector_ghg_emission", year, limit * 4)
            if not emissions:
                emissions = fetch_table(client, "pub_facts_subpart_ghg_emission", year, limit * 4)
            if emissions and first_emis_row is None:
                first_emis_row = emissions[0]

            # One facility can report several sectors/subparts — sum them.
            totals: dict[str, float] = {}
            sector_hint: dict[str, str] = {}
            for e in emissions:
                fid = str(get(e, "facility_id") or "")
                if not fid:
                    continue
                qty = get(e, "co2e_emission", "ghg_quantity", "emission",
                          "co2e_emissions", "total_reported_emissions")
                try:
                    qty_f = float(qty)
                except (TypeError, ValueError):
                    continue
                if qty_f <= 0:
                    continue
                totals[fid] = totals.get(fid, 0.0) + qty_f
                st = get(e, "sector_type", "sector_name", "subpart_name")
                if st and fid not in sector_hint:
                    sector_hint[fid] = str(st).lower()

            parsed = 0
            for fid, tons in totals.items():
                fac = facilities.get(fid)
                if not fac:
                    continue
                lat, lon = get(fac, "latitude"), get(fac, "longitude")
                if lat is None or lon is None:
                    continue
                try:
                    lat_f, lon_f = float(lat), float(lon)
                except (TypeError, ValueError):
                    continue

                industry, sector = classify(get(fac, "naics_code"))
                if sector == "other":
                    hint = sector_hint.get(fid, "")
                    for key, mapped in SECTOR_MAP.items():
                        if key in hint:
                            industry, sector = mapped
                            break

                # parent_company lists co-owners with percentages; take the
                # first named entity so the graph groups sensibly.
                parent = str(get(fac, "parent_company") or get(fac, "facility_name") or "")
                company = parent.split(";")[0].split("(")[0].strip()[:80] or "Unknown operator"

                site_id = f"epa-{fid}"
                sites.setdefault(site_id, {
                    "site_name": str(get(fac, "facility_name", default="Unnamed facility"))[:80],
                    "company": company,
                    "lat": lat_f, "lon": lon_f,
                    "industry": industry, "sector": sector,
                    "yearly": {},
                })
                # GHGRP reports metric tonnes CO2e; store millions to match
                # the Climate TRACE records already in the graph.
                sites[site_id]["yearly"][year] = tons / 1_000_000
                parsed += 1

            print(f"[{year}] facilities {len(facilities)}, emission rows {len(emissions)}, parsed {parsed}")

    if not sites:
        print("\nNothing parsed. Raw structure of the first EMISSIONS row returned:")
        print(json.dumps(first_emis_row, indent=2, default=str)[:3000]
              if first_emis_row else "(the emissions table returned no rows)")
        print("\nPaste this output back and I'll fix the field mapping.")
        sys.exit(1)

    peaks = sorted(max(s["yearly"].values()) for s in sites.values())
    hi = peaks[int(len(peaks) * 2 / 3)]
    lo = peaks[int(len(peaks) / 3)]

    for site_id, s in sites.items():
        peak = max(s["yearly"].values())
        intensity = "high" if peak >= hi else "low" if peak <= lo else "medium"
        for year, tons in sorted(s["yearly"].items()):
            run_write(
                UPSERT,
                company_id=s["company"].lower().replace(" ", "-")[:60],
                company=s["company"], industry=s["industry"],
                site_id=site_id, site_name=s["site_name"],
                lat=s["lat"], lon=s["lon"], sector=s["sector"],
                intensity=intensity, year=year, tons=round(tons, 4),
            )
            loaded += 1

    print(f"\nLoaded {len(sites)} US facilities ({loaded} facility-year records), "
          f"{from_year}-{to_year}.")
    print("Tagged source='epa_ghgrp' — reported data, kept distinct from "
          "Climate TRACE's modelled estimates.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--from-year", type=int, default=2010)
    p.add_argument("--to-year", type=int, default=2023)
    p.add_argument("--limit", type=int, default=3000, help="max facilities per year")
    args = p.parse_args()
    main(args.from_year, args.to_year, args.limit)
