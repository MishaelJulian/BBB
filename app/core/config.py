import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    APP_NAME: str = "Book Club Archivist"
    ENV: str = "development"
    DEBUG: bool = False

    # Base directory
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    LOGS_DIR: Path = BASE_DIR / "logs"
    STORAGE_DIR: Path = DATA_DIR / "storage"

    # Database configuration
    DATABASE_URL: str = "sqlite:///./book_club_archivist.db"

    # Log level
    LOG_LEVEL: str = "INFO"

    # Browser origins allowed to call the API directly (comma-separated), on top of
    # localhost and private-LAN addresses used in development.
    CORS_ORIGINS: str = ""

    # Shared secret that the Vercel proxy adds as the x-origin-secret header (D35).
    # Empty = check off (local development). Set it in production so the API refuses direct traffic.
    ORIGIN_SECRET: str = ""

    # Login service (Better Auth, D5). Every write and every /admin request is checked against it.
    # AUTH_REQUIRED=false only for local work without the auth service running.
    AUTH_INTERNAL_URL: str = "http://127.0.0.1:3001"
    AUTH_REQUIRED: bool = True

    def model_post_init(self, __context) -> None:
        """Ensure required directories exist."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.LOGS_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
