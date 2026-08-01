// Run once against a fresh Neo4j instance to set up constraints.
// cypher-shell -u neo4j -p changeme -f ingestion/neo4j_schema.cypher

CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT site_id IF NOT EXISTS FOR (s:Site) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT country_iso IF NOT EXISTS FOR (co:Country) REQUIRE co.iso IS UNIQUE;

// Entity shapes, for reference (Neo4j is schemaless, these are documentation):
//
// (:Company {id, name, industry, hq_country})
// (:Site {id, name, lat, lon, sector, subsector})
// (:Country {iso, name})
// (:EmissionRecord {year, gas, tons, source})
// (:NewsMention {url, published, sentiment, source})
// (:Filing {doc_id, type, year, source})
//
// (:Company)-[:OWNS]->(:Site)
// (:Site)-[:LOCATED_IN]->(:Country)
// (:Site)-[:EMITS]->(:EmissionRecord)
// (:Company)-[:MENTIONED_IN]->(:NewsMention)
// (:Company)-[:FILED]->(:Filing)
