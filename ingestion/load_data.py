import csv, urllib.request
from neo4j import GraphDatabase

URI = "bolt://shuttle.proxy.rlwy.net:31207"
USER = "neo4j"
PASSWORD = "Hwm5GUAO76kPLZmsSr6aIiTKyPDJSWP_"

CSV_URL = "https://raw.githubusercontent.com/vedantbhatiaa/groundtruth/main/ingestion/sample_data/sites_sample.csv"
urllib.request.urlretrieve(CSV_URL, "sites_sample.csv")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
driver.verify_connectivity()
print("Connected OK")

UPSERT = """
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

def company_id(name):
    return name.lower().replace(" ", "-")

count = 0
with driver.session() as session, open("sites_sample.csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        session.run(UPSERT,
            company_id=company_id(row["company"]), company=row["company"],
            industry=row["industry"], hq_country=row["hq_country"],
            country_iso=row["country_iso"], country=row["country"],
            site_id=row["site_id"], site_name=row["site_name"],
            lat=float(row["lat"]), lon=float(row["lon"]),
            sector=row["sector"], intensity=row["intensity"],
            year=int(row["year"]), gas=row["gas"], tons=float(row["tons_millions"]),
        )
        count += 1

print(f"Loaded {count} rows total")
driver.close()