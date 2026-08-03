// Run once against a fresh Neo4j instance to set up constraints.
// cypher-shell -u neo4j -p changeme -f ingestion/neo4j_schema.cypher

CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT site_id IF NOT EXISTS FOR (s:Site) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT country_iso IF NOT EXISTS FOR (co:Country) REQUIRE co.iso IS UNIQUE;

// Query indexes — the API creates these on startup too, but running them
// here makes a fresh install fast from the first request.
CREATE INDEX emission_year IF NOT EXISTS FOR (e:EmissionRecord) ON (e.year);
CREATE INDEX emission_site IF NOT EXISTS FOR (e:EmissionRecord) ON (e.site_id);
CREATE INDEX emission_site_year IF NOT EXISTS FOR (e:EmissionRecord) ON (e.site_id, e.year);
CREATE INDEX site_industry IF NOT EXISTS FOR (s:Site) ON (s.industry);
CREATE INDEX site_sector IF NOT EXISTS FOR (s:Site) ON (s.sector);
CREATE INDEX company_name IF NOT EXISTS FOR (c:Company) ON (c.name);
CREATE INDEX country_name IF NOT EXISTS FOR (co:Country) ON (co.name);
CREATE INDEX countrystat_iso_year IF NOT EXISTS FOR (cs:CountryStat) ON (cs.iso, cs.year);

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
