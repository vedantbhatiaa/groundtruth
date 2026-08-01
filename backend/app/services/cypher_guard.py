"""
Validates LLM-generated Cypher before it's allowed to run.

This is deliberately conservative: a denylist of write/admin keywords,
checked as whole words so we don't accidentally block a property named
e.g. "created_at" for containing "create". Paired with the read-only
Neo4j user in db/neo4j_client.py — this is the first of two layers, not
the only one.
"""

import re

_FORBIDDEN = {
    "create", "merge", "delete", "detach", "set", "remove",
    "drop", "call db.", "call apoc.", "load csv", "foreach",
}

_MAX_ROWS = 200


class UnsafeCypherError(Exception):
    pass


def validate(query: str) -> str:
    lowered = query.lower()

    for keyword in _FORBIDDEN:
        # word-boundary check so "created_at" doesn't trip on "create"
        pattern = r"\b" + re.escape(keyword.strip()) + r"\b" if " " not in keyword else keyword
        if re.search(pattern, lowered):
            raise UnsafeCypherError(f"query contains forbidden keyword: '{keyword.strip()}'")

    if "limit" not in lowered:
        query = query.rstrip().rstrip(";") + f" LIMIT {_MAX_ROWS}"

    return query
