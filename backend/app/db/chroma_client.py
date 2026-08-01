"""
ChromaDB runs embedded (no separate server process, no network hop), which
is why it was chosen over Qdrant for this project. Everything persists to
disk at CHROMA_PERSIST_DIR between runs.

Embeddings use a local sentence-transformers model rather than a paid
embeddings API — this is the piece that would otherwise rack up token
costs fastest given how many report/news chunks flow through it.
"""

import chromadb
from sentence_transformers import SentenceTransformer
from app.config import settings

_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
_collection = _client.get_or_create_collection(name="documents")
_embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")


def embed(texts: list[str]) -> list[list[float]]:
    return _embedder.encode(texts, normalize_embeddings=True).tolist()


def add_chunks(ids: list[str], texts: list[str], metadatas: list[dict]):
    _collection.add(ids=ids, embeddings=embed(texts), documents=texts, metadatas=metadatas)


def query(text: str, n_results: int = 5, where: dict | None = None):
    result = _collection.query(
        query_embeddings=embed([text]), n_results=n_results, where=where
    )
    return [
        {"text": doc, "metadata": meta}
        for doc, meta in zip(result["documents"][0], result["metadatas"][0])
    ]
