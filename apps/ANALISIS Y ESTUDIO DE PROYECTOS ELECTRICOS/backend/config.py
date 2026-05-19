"""
Configuración centralizada usando pydantic-settings.
Lee variables desde .env y permite override por entorno.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    # ===== App =====
    app_name: str = "AEP-Electrico"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # ===== Base de datos =====
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "aep"
    postgres_password: str = "cambiame"
    postgres_db: str = "aep_electrico"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ===== Redis / Celery =====
    redis_url: str = "redis://localhost:6379/0"

    # ===== Anthropic =====
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"
    anthropic_max_tokens: int = 4096

    # ===== Voyage AI =====
    voyage_api_key: str = ""
    voyage_model: str = "voyage-3-large"
    voyage_dimension: int = 1024

    # ===== Almacenamiento =====
    storage_path: Path = Path("./storage")
    max_upload_size_mb: int = 100

    # ===== CORS =====
    cors_origins: str = "http://localhost:8080,http://localhost:5500,http://127.0.0.1:5500"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ===== RAG =====
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 50
    rag_top_k: int = 20
    rag_rerank_top: int = 5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

# Asegurar que el directorio de storage existe
settings.storage_path.mkdir(parents=True, exist_ok=True)
