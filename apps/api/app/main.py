from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import os
import logging

from app.database import engine, Base
from app.config import settings
from app.routers import auth, users, schools, categories, pdfs, notifications, requests, analytics, maintenance, audit, programs
from app.routers.pdf_versions import router as pdf_versions_router
from app.routers.bulk import router as bulk_router
from app.routers.school_categories import router as school_categories_router

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logging.info("Starting application lifespan...")
        # Create tables
        logging.info("Creating database tables and applying migrations...")
        from migrate_schema import run_migrations
        await run_migrations()
        logging.info("Database schema ready")
        
        # Ensure upload dir exists
        logging.info(f"Ensuring upload directory exists: {settings.UPLOAD_DIR}")
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        logging.info("Upload directory ready")
        
        logging.info("Application startup complete")
        yield
        logging.info("Application shutdown")
    except Exception as e:
        logging.error(f"Error during application lifespan: {e}")
        import traceback
        traceback.print_exc()
        raise

app = FastAPI(title="i-icon academy API", version="1.0.0", lifespan=lifespan)

allowed_origins = (
    ["*"]
    if settings.ALLOWED_ORIGINS.strip() == "*"
    else [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)

# Mount routers
for router in [
    auth.router, users.router, schools.router, categories.router,
    programs.router, pdfs.router, pdf_versions_router, notifications.router, requests.router,
    analytics.router, maintenance.router, audit.router, bulk_router,
    school_categories_router,
]:
    app.include_router(router)

# Explicit opt-in for direct static upload serving.
# Keep disabled by default so PDF access always goes through auth-gated routes.
if os.getenv("ENABLE_PUBLIC_UPLOADS", "false").lower() in {"1", "true", "yes"}:
    from fastapi.staticfiles import StaticFiles

    if os.path.exists(settings.UPLOAD_DIR):
        app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/health")
async def health():
    return {"status": "ok"}
