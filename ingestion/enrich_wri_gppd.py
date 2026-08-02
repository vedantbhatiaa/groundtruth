"""
Enriches power-industry Sites in Neo4j with the WRI Global Power Plant
Database (~35,000 plants): capacity (MW), estimated annual generation
(GWh), primary fuel, commissioning year, and named owner where available.

Free, no key, single CSV. Alignment with Climate TRACE assets is done by
SPATIAL JOIN: nearest WRI plant within ~5 km of the site's coordinates,
with a name-similarity tie-break when several plants are that close.

Usage (venv active, from project root, Neo4j running, AFTER the Climate
TRACE loader has populated sites):
    python ingestion/enrich_wri_gppd.py
"""

import csv
import io
import math
import sys
from difflib import SequenceMatcher
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.db.neo4j_client import run_read, run_write  # noqa: E402

CSV_URL = (
    "https://raw.githubusercontent.com/wri/global-power-plant-database/"
    "master/output_database/global_power_plant_database.csv"
)

GEN_COLS = [
    "generation_gwh_2019", "generation_gwh_2018", "generation_gwh_2017",
    "estimated_generation_gwh_2017", "estimated_generation_gwh_2016",
]


def latest_generation(row: dict) -> float | None:
    for col in GEN_COLS:
        val = (row.get(col) or "").strip()
        if val:
            try:
                return float(val)
            except ValueError:
                continue
    return None


def main():
    print("Downloading WRI Global Power Plant Database (~10 MB)…")
    resp = httpx.get(CSV_URL, timeout=120, follow_redirects=True)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))

    # Bucket plants into a 0.5-degree grid for fast nearest-neighbour lookup
    grid: dict[tuple[int, int], list[dict]] = {}
    n_plants = 0
    for row in reader:
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
        except (KeyError, ValueError):
            continue
        key = (int(lat // 0.5), int(lon // 0.5))
        grid.setdefault(key, []).append({
            "name": row.get("name", ""),
            "lat": lat, "lon": lon,
            "capacity_mw": row.get("capacity_mw", ""),
            "primary_fuel": row.get("primary_fuel", ""),
            "commissioning_year": row.get("commissioning_year", ""),
            "owner": row.get("owner", ""),
            "generation_gwh": latest_generation(row),
        })
        n_plants += 1
    print(f"Indexed {n_plants} plants.")

    sites = run_read(
        """
        MATCH (c:Company)-[:OWNS]->(s:Site)
        WHERE coalesce(s.industry, c.industry) = 'power'
        RETURN s.id AS id, s.name AS name, s.lat AS lat, s.lon AS lon
        """
    )
    print(f"Matching against {len(sites)} power sites in Neo4j…")

    matched = 0
    for site in sites:
        if site["lat"] is None:
            continue
        key = (int(site["lat"] // 0.5), int(site["lon"] // 0.5))
        candidates = []
        for dk in (-1, 0, 1):
            for dj in (-1, 0, 1):
                candidates.extend(grid.get((key[0] + dk, key[1] + dj), []))
        best, best_score = None, 0.0
        for plant in candidates:
            # ~111 km per degree; 5 km ~= 0.045 deg
            dist_deg = math.hypot(plant["lat"] - site["lat"], plant["lon"] - site["lon"])
            if dist_deg > 0.045:
                continue
            proximity = 1 - dist_deg / 0.045
            name_sim = SequenceMatcher(
                None, (site["name"] or "").lower(), (plant["name"] or "").lower()
            ).ratio()
            score = proximity * 0.6 + name_sim * 0.4
            if score > best_score:
                best, best_score = plant, score
        if not best:
            continue
        try:
            capacity = float(best["capacity_mw"]) if best["capacity_mw"] else None
        except ValueError:
            capacity = None
        try:
            comm_year = int(float(best["commissioning_year"])) if best["commissioning_year"] else None
        except ValueError:
            comm_year = None
        # WRI carries the actual primary fuel, which is the only reliable way
        # to split NAICS 221112 ("fossil fuel generation") into coal/gas/oil.
        fuel = (best["primary_fuel"] or "").strip().lower()
        FUEL_SECTOR = {
            "coal": "coal", "gas": "gas", "oil": "oil", "petcoke": "coal",
            "nuclear": "nuclear", "hydro": "hydro", "wind": "wind",
            "solar": "solar", "biomass": "biomass", "waste": "waste",
            "geothermal": "geothermal", "cogeneration": "gas",
        }
        refined_sector = FUEL_SECTOR.get(fuel)

        run_write(
            """
            MATCH (s:Site {id: $id})
            SET s.sector = coalesce($refined_sector, s.sector),
                s.capacity = coalesce($capacity, s.capacity),
                s.generation_gwh = $generation_gwh,
                s.primary_fuel = $primary_fuel,
                s.commissioning_year = $comm_year,
                s.wri_plant_name = $plant_name,
                s.wri_owner = $owner
            """,
            id=site["id"], capacity=capacity, refined_sector=refined_sector,
            generation_gwh=best["generation_gwh"],
            primary_fuel=best["primary_fuel"] or None,
            comm_year=comm_year,
            plant_name=best["name"] or None,
            owner=best["owner"] or None,
        )
        matched += 1
    print(f"\nEnriched {matched} of {len(sites)} power sites with WRI capacity/generation data.")
    print("(Unmatched sites are usually district-level Climate TRACE assets with no single plant.)")


if __name__ == "__main__":
    main()
