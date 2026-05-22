from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/iiconacademy"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    UVICORN_WORKERS: int = 4
    UVICORN_LIMIT_CONCURRENCY: int = 1000
    UVICORN_TIMEOUT_KEEP_ALIVE: int = 5
    GZIP_MINIMUM_SIZE: int = 1024
    ALLOWED_ORIGINS: str = "*"

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@iiconacademy.com"
    SMTP_FROM_NAME: str = "i-icon academy"

    UPLOAD_DIR: str = "/data/uploads"
    MAX_FILE_SIZE: int = 52_428_800  # 50MB

    BUILDER_MAILER_API_URL: Optional[str] = None
    BUILDER_MAILER_API_KEY: Optional[str] = None
    BUILDER_MAILER_SENDER_ADDRESS: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
