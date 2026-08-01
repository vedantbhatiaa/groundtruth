"""
Two separate Neo4j connections, deliberately:

- `write_driver` uses the full-privilege user. Only ingestion scripts and
  trusted backend code should ever use this.
- `read_driver` uses a Neo4j user that has been granted MATCH-only
  privileges (see docs/setup.md for the exact GRANT statements). This is
  the connection the chatbot's generated Cypher runs against, so even if
  the query-validation layer in services/cypher_guard.py had a bug, the
  database user itself physically cannot write.

Defense in depth: the guard rejects write keywords in the query text, AND
the connection it runs on can't write even if a query slipped through.
"""

from neo4j import GraphDatabase
from app.config import settings

write_driver = GraphDatabase.driver(
    settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
)

read_driver = GraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_readonly_user, settings.neo4j_readonly_password),
)


def run_write(query: str, **params):
    """For ingestion scripts only. Never call this with LLM-generated input."""
    with write_driver.session() as session:
        return list(session.run(query, **params))


def run_read(query: str, **params):
    """
    Safe for LLM-generated Cypher, provided it has passed cypher_guard first.

    Returns plain dicts, not raw neo4j.Record objects. Record supports
    iteration like a sequence, which was causing FastAPI to serialize
    results as arrays of values instead of named-key JSON objects — the
    root cause of fields like `company` and `lat` arriving malformed on
    the frontend.
    """
    with read_driver.session() as session:
        result = session.run(query, **params)
        return [record.data() for record in result]


def close():
    write_driver.close()
    read_driver.close()