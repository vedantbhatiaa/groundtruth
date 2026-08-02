"""
Loads REAL Climate TRACE asset-level data into Neo4j via their public API
(no key required).

Usage (venv active, from project root, Neo4j running):
    python ingestion/load_climate_trace_api.py --per-sector 25

This version queries each year 2020-2024 explicitly (the API returns
emissions for the requested year, often without a Year field on each
entry), and if parsing still fails it prints the raw structure of the
first asset so the exact API shape can be fixed against reality.
"""

import argparse
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.db.neo4j_client import run_write  # noqa: E402

API_BASES = [
    "https://api.climatetrace.org/v6",
    "https://api.climatetrace.org/v4",
]

YEARS = list(range(2015, 2025))  # Climate TRACE coverage varies; missing years just skip

# The fallback sector must describe the SLUG honestly. Previously
# electricity-generation fell back to "gas" and oil-and-gas-transport to
# "gas" too, so almost every asset was labelled gas regardless of what it
# actually was — which is why sector analysis showed a single sector.
SECTORS = {
    "electricity-generation": ("power", "power-other"),
    "coal-mining": ("power", "coal"),
    "oil-and-gas-production": ("oil", "upstream"),
    "oil-and-gas-refining": ("oil", "refining"),
    "oil-and-gas-transport": ("oil", "transport"),
    "steel": ("manufacturing", "steel"),
    "cement": ("manufacturing", "cement"),
    "aluminum": ("manufacturing", "aluminum"),
    "pulp-and-paper": ("manufacturing", "pulp-paper"),
    "chemicals": ("manufacturing", "chemicals"),
}

ISO3_NAMES = {
    "USA": "United States", "CHN": "China", "IND": "India", "DEU": "Germany",
    "SAU": "Saudi Arabia", "BRA": "Brazil", "GBR": "United Kingdom",
    "ZAF": "South Africa", "AUS": "Australia", "NGA": "Nigeria",
    "EGY": "Egypt", "NOR": "Norway", "CAN": "Canada", "RUS": "Russia",
    "JPN": "Japan", "KOR": "South Korea", "IDN": "Indonesia", "MEX": "Mexico",
    "FRA": "France", "ITA": "Italy", "ESP": "Spain", "POL": "Poland",
    "TUR": "Turkey", "IRN": "Iran", "IRQ": "Iraq", "ARE": "United Arab Emirates",
    "QAT": "Qatar", "KWT": "Kuwait", "VNM": "Vietnam", "THA": "Thailand",
    "MYS": "Malaysia", "PAK": "Pakistan", "BGD": "Bangladesh", "UKR": "Ukraine",
    "KAZ": "Kazakhstan", "DZA": "Algeria", "AGO": "Angola", "VEN": "Venezuela",
    "COL": "Colombia", "ARG": "Argentina", "CHL": "Chile", "PER": "Peru",
}

UPSERT = """
MERGE (c:Company {id: $company_id})
  ON CREATE SET c.name = $company, c.industry = $industry, c.hq_country = $country
MERGE (co:Country {iso: $country_iso})
  ON CREATE SET co.name = $country
MERGE (s:Site {id: $site_id})
  ON CREATE SET s.name = $site_name, s.lat = $lat, s.lon = $lon,
                s.capacity = $capacity, s.asset_type = $asset_type,
                s.activity = $activity
  SET s.sector = $sector, s.intensity = $intensity, s.industry = $industry
MERGE (c)-[:OWNS]->(s)
MERGE (s)-[:LOCATED_IN]->(co)
MERGE (e:EmissionRecord {site_id: $site_id, year: $year, gas: 'co2e'})
  ON CREATE SET e.tons = $tons, e.source = 'climate_trace_api'
MERGE (s)-[:EMITS]->(e)
"""


def get_field(d, *names, default=None):
    if not isinstance(d, dict):
        return default
    lowered = {k.lower(): v for k, v in d.items()}
    for n in names:
        if n.lower() in lowered and lowered[n.lower()] is not None:
            return lowered[n.lower()]
    return default


def extract_coords(asset):
    centroid = get_field(asset, "Centroid", default={})
    if isinstance(centroid, dict):
        geom = get_field(centroid, "Geometry", "coordinates")
        if isinstance(geom, (list, tuple)) and len(geom) >= 2:
            try:
                return float(geom[1]), float(geom[0])  # GeoJSON lon-first
            except (TypeError, ValueError):
                pass
    # Sometimes centroid itself is [lon, lat]
    if isinstance(centroid, (list, tuple)) and len(centroid) >= 2:
        try:
            return float(centroid[1]), float(centroid[0])
        except (TypeError, ValueError):
            pass
    lat = get_field(asset, "Latitude", "lat")
    lon = get_field(asset, "Longitude", "lon", "lng")
    if lat is not None and lon is not None:
        return float(lat), float(lon)
    return None, None


def extract_owner(asset):
    owners = get_field(asset, "Owners", "Ownership", default=[]) or []
    if isinstance(owners, list) and owners:
        first = owners[0] if isinstance(owners[0], dict) else {}
        name = get_field(first, "CompanyName", "Name", "OwnerName", "company_name")
        if name:
            return str(name)
    return "Independent operator"


def extract_emissions_for_year(asset, requested_year):
    """Returns tons for the requested year, or None.

    Handles: EmissionsSummary entries with a Year field; entries WITHOUT a
    Year field (attributed to the requested year, since the API was queried
    with year=N); a plain Emissions numeric field; and nested quantity keys.
    """
    summary = get_field(asset, "EmissionsSummary", "Emissions", default=None)
    if isinstance(summary, (int, float)):
        return float(summary), None
    if isinstance(summary, list):
        for entry in summary:
            if not isinstance(entry, dict):
                continue
            gas = str(get_field(entry, "Gas", default="co2e")).lower()
            if "co2e" not in gas and gas != "co2":
                continue
            entry_year = get_field(entry, "Year")
            if entry_year is not None and int(entry_year) != requested_year:
                continue
            qty = get_field(entry, "EmissionsQuantity", "Quantity", "Value", "EmissionsFactor")
            if qty is not None:
                try:
                    activity = get_field(entry, "Activity", "ActivityQuantity")
                    return float(qty), (float(activity) if activity is not None else None)
                except (TypeError, ValueError):
                    continue
    if isinstance(summary, dict):
        qty = get_field(summary, "EmissionsQuantity", "Quantity", "Value", str(requested_year))
        if qty is not None:
            try:
                return float(qty), None
            except (TypeError, ValueError):
                pass
    return None, None


# Broader fuel vocabulary, checked most-specific first. Anything that can't
# be identified stays "power-other" rather than being mislabelled as gas.
POWER_KEYWORDS = [
    ("lignite", "coal"), ("anthracite", "coal"), ("coal", "coal"),
    ("ccgt", "gas"), ("ocgt", "gas"), ("lng", "gas"), ("natural gas", "gas"), ("gas", "gas"),
    ("diesel", "oil"), ("fuel oil", "oil"), ("petroleum", "oil"), ("oil", "oil"),
    ("photovoltaic", "solar"), ("solar", "solar"), ("pv", "solar"),
    ("wind", "wind"), ("offshore", "wind"),
    ("hydro", "hydro"), ("dam", "hydro"),
    ("nuclear", "nuclear"),
    ("biomass", "biomass"), ("bagasse", "biomass"), ("biogas", "biomass"),
    ("geothermal", "geothermal"),
    ("waste", "waste"), ("incinerat", "waste"),
]


def guess_power_sector(asset, fallback):
    text = " ".join(
        str(get_field(asset, f, default="") or "")
        for f in ("AssetType", "Name", "PrimaryFuel", "Fuel")
    ).lower()
    for keyword, sector in POWER_KEYWORDS:
        if keyword in text:
            return sector
    return fallback


def fetch_assets(client, base, sector_slug, limit, year):
    resp = client.get(
        f"{base}/assets",
        params={"sectors": sector_slug, "limit": limit, "year": year},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict):
        return get_field(data, "assets", "data", default=[]) or []
    return data if isinstance(data, list) else []


def main(per_sector):
    sites = {}  # site_id -> row dict with yearly dict
    first_raw_asset = None
    working_base = None

    with httpx.Client(headers={"User-Agent": "groundtruth-project"}) as client:
        for sector_slug, (industry, fallback_sector) in SECTORS.items():
            for year in YEARS:
                assets = []
                for base in ([working_base] if working_base else API_BASES):
                    try:
                        assets = fetch_assets(client, base, sector_slug, per_sector, year)
                        working_base = base
                        break
                    except Exception as exc:
                        print(f"  [{sector_slug} {year}] {base} failed: {exc}")
                if assets and first_raw_asset is None:
                    first_raw_asset = assets[0]
                parsed_this_year = 0
                for asset in assets:
                    lat, lon = extract_coords(asset)
                    if lat is None:
                        continue
                    tons, activity = extract_emissions_for_year(asset, year)
                    if tons is None or tons <= 0:
                        continue
                    name = str(get_field(asset, "Name", default="Unnamed facility"))
                    asset_id = str(get_field(asset, "Id", "AssetId", default=f"{sector_slug}-{name}"))
                    iso = str(get_field(asset, "Country", "Iso3", default="???"))[:3].upper()
                    sector = guess_power_sector(asset, fallback_sector) if industry == "power" else fallback_sector
                    site_id = f"ct-{asset_id}"
                    if site_id not in sites:
                        capacity = get_field(asset, "Capacity", "capacity")
                        try:
                            capacity = float(capacity) if capacity is not None and not isinstance(capacity, dict) else None
                        except (TypeError, ValueError):
                            capacity = None
                        sites[site_id] = {
                            "site_id": site_id, "site_name": name[:80],
                            "company": extract_owner(asset)[:80],
                            "industry": industry, "country_iso": iso,
                            "country": ISO3_NAMES.get(iso, iso),
                            "sector": sector, "lat": lat, "lon": lon,
                            "asset_type": str(get_field(asset, "AssetType", default="") or "")[:60],
                            "capacity": capacity, "activity": None,
                            "yearly": {},
                        }
                    sites[site_id]["yearly"][year] = tons
                    if activity is not None:
                        sites[site_id]["activity"] = activity
                    parsed_this_year += 1
                print(f"[{sector_slug} {year}] fetched {len(assets)}, parsed {parsed_this_year}")

    if not sites:
        print("\nNo assets parsed. Raw structure of the first asset returned by the API:")
        print(json.dumps(first_raw_asset, indent=2, default=str)[:4000] if first_raw_asset else "(no assets returned at all)")
        print("\nPaste ALL of the above output back for a parser fix.")
        sys.exit(1)

    peaks = sorted(max(r["yearly"].values()) for r in sites.values())
    hi = peaks[int(len(peaks) * 2 / 3)]
    lo = peaks[int(len(peaks) / 3)]
    count = 0
    for r in sites.values():
        peak = max(r["yearly"].values())
        intensity = "high" if peak >= hi else "low" if peak <= lo else "medium"
        for year, tons in sorted(r["yearly"].items()):
            run_write(
                UPSERT,
                company_id=r["company"].lower().replace(" ", "-")[:60],
                company=r["company"], industry=r["industry"],
                country_iso=r["country_iso"], country=r["country"],
                site_id=r["site_id"], site_name=r["site_name"],
                lat=r["lat"], lon=r["lon"], sector=r["sector"],
                intensity=intensity, year=year,
                capacity=r.get("capacity"), asset_type=r.get("asset_type"),
                activity=r.get("activity"),
                tons=round(tons / 1_000_000, 3),
            )
            count += 1
    print(f"\nLoaded {len(sites)} real Climate TRACE sites ({count} year-records) into Neo4j.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-sector", type=int, default=25)
    args = parser.parse_args()
    main(args.per_sector)
