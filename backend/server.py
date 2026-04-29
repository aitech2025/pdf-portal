"""
Backend entry point — wraps the FastAPI app from apps/api using SQLite for local dev.
Supervisor runs: uvicorn server:app --host 0.0.0.0 --port 8001 --reload
"""
import sys
import os

# Set env vars BEFORE importing app modules (pydantic_settings reads at import time)
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:////app/backend/eduportal.db'
os.environ.setdefault('SECRET_KEY', 'eduportal-dev-secret-key-2026-change-in-prod')
os.environ.setdefault('UPLOAD_DIR', '/app/backend/uploads')
os.environ.setdefault('ACCESS_TOKEN_EXPIRE_MINUTES', '1440')
os.environ.setdefault('ALGORITHM', 'HS256')

# Add the API app to Python path
sys.path.insert(0, '/app/apps/api')

# Import the FastAPI app
from app.main import app  # noqa: E402

__all__ = ['app']
