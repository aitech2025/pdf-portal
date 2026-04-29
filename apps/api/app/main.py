from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

from app.database import engine, Base
from app.config import settings
from app.routers import auth, users, schools, categories, pdfs, notifications, requests, analytics, maintenance, audit
from app.routers.pdf_versions import router as pdf_versions_router
from app.routers.bulk import router as bulk_router

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Ensure upload dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield

app = FastAPI(title="EduContent API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
for router in [
    auth.router, users.router, schools.router, categories.router,
    pdfs.router, pdf_versions_router, notifications.router, requests.router,
    analytics.router, maintenance.router, audit.router, bulk_router,
]:
    app.include_router(router)

# Serve uploaded files
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/health")
async def health():
    return {"status": "ok"}
