from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/educontent"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@educontent.com"
    SMTP_FROM_NAME: str = "EduContent"

    UPLOAD_DIR: str = "/data/uploads"
    MAX_FILE_SIZE: int = 52_428_800  # 50MB

    BUILDER_MAILER_API_URL: Optional[str] = None
    BUILDER_MAILER_API_KEY: Optional[str] = None
    BUILDER_MAILER_SENDER_ADDRESS: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
