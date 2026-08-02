"""
Central settings object. Everything that varies between machines or
environments (credentials, URLs, model names) lives here, read from .env.
Nothing in the rest of the app should read os.environ directly — import
`settings` from this module instead, so there is exactly one place that
knows how configuration is wired.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve the project-root .env by absolute path so it works no matter
# which directory uvicorn is launched from. (Previously ".env" was
# relative to the working directory — running from backend/ meant the
# root .env was silently never read, which is why GROQ_API_KEY came
# through empty even though it was set.)
_PROJECT_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT_ENV), env_file_encoding="utf-8", extra="ignore"
    )

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"
    neo4j_readonly_user: str = "groundtruth_reader"
    neo4j_readonly_password: str = "changeme_too"

    # LLM
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Vector store
    chroma_persist_dir: str = "./data/chroma"

    # SQLite
    sqlite_path: str = "./data/groundtruth.db"

    # External sources
    gdelt_doc_api: str = "https://api.gdeltproject.org/api/v2/doc/doc"
    sec_edgar_base: str = "https://www.sec.gov/cgi-bin/browse-edgar"
    sec_edgar_user_agent: str = "Groundtruth research prototype you@example.com"

    # App
    api_cors_origin: str = "http://localhost:5173"
    log_level: str = "INFO"


settings = Settings()
