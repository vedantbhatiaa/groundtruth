"""
Wraps the Groq client so the rest of the app calls one function and never
touches the SDK directly — swapping providers later means changing this
one file. The client is created lazily so a missing API key produces a
clear, catchable error at call time instead of crashing app startup.
"""

from groq import Groq
from app.config import settings

_client = None


class LLMNotConfiguredError(Exception):
    pass


def _get_client() -> Groq:
    global _client
    if not settings.groq_api_key:
        raise LLMNotConfiguredError(
            "GROQ_API_KEY is empty. Add your key to the .env file at the project "
            "root (get one free at console.groq.com/keys), then restart uvicorn."
        )
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def complete(system_prompt: str, user_prompt: str) -> str:
    response = _get_client().chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content


def generate_cypher(question: str, schema_description: str) -> str:
    system = (
        "You translate natural-language questions into read-only Cypher "
        "queries for a Neo4j graph. Only ever use MATCH and RETURN clauses. "
        "Never use CREATE, MERGE, DELETE, SET, or REMOVE. "
        f"Graph schema:\n{schema_description}\n"
        "Return only the Cypher query, nothing else."
    )
    return complete(system, question).strip().strip("`")
