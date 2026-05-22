"""
Diagnostic script to check all imports and configurations
Run this to identify startup issues
"""
import sys

print("=" * 60)
print("API Startup Diagnostics")
print("=" * 60)

# Check Python version
print(f"\n1. Python version: {sys.version}")

# Check imports
print("\n2. Checking imports...")
try:
    import fastapi
    print(f"   ✓ FastAPI: {fastapi.__version__}")
except ImportError as e:
    print(f"   ✗ FastAPI import failed: {e}")
    sys.exit(1)

try:
    import sqlalchemy
    print(f"   ✓ SQLAlchemy: {sqlalchemy.__version__}")
except ImportError as e:
    print(f"   ✗ SQLAlchemy import failed: {e}")
    sys.exit(1)

try:
    import asyncpg
    print(f"   ✓ asyncpg: {asyncpg.__version__}")
except ImportError as e:
    print(f"   ✗ asyncpg import failed: {e}")
    sys.exit(1)

# Check config
print("\n3. Checking configuration...")
try:
    from app.config import settings
    print(f"   ✓ Config loaded")
    print(f"   - Database URL: {settings.DATABASE_URL}")
    print(f"   - Upload dir: {settings.UPLOAD_DIR}")
except Exception as e:
    print(f"   ✗ Config failed: {e}")
    sys.exit(1)

# Check database connection
print("\n4. Checking database connection...")
try:
    import asyncio
    from app.database import engine
    from sqlalchemy import text
    
    async def test_db():
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar()
    
    result = asyncio.run(test_db())
    print(f"   ✓ Database connection successful (result: {result})")
except Exception as e:
    print(f"   ✗ Database connection failed: {e}")
    print(f"   Note: This is expected if database is not running yet")

# Check models
print("\n5. Checking models...")
try:
    from app.models import (
        User, School, Category, SubCategory, PDF, PDFVersion,
        Notification, OnboardingRequest, UserRequest,
        DownloadLog, AuditLog, AnalyticsEvent,
        Favorite, PDFRating, Comment, TeamMember,
        SystemSettings, MaintenanceMode, UserPreferences,
        SchoolCategoryAccess
    )
    print(f"   ✓ All models imported successfully")
except Exception as e:
    print(f"   ✗ Model import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check routers
print("\n6. Checking routers...")
try:
    from app.routers import (
        auth, users, schools, categories, pdfs, 
        notifications, requests, analytics, maintenance, audit
    )
    from app.routers.pdf_versions import router as pdf_versions_router
    from app.routers.bulk import router as bulk_router
    from app.routers.school_categories import router as school_categories_router
    print(f"   ✓ All routers imported successfully")
except Exception as e:
    print(f"   ✗ Router import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check main app
print("\n7. Checking main application...")
try:
    from app.main import app
    print(f"   ✓ Main app created successfully")
    print(f"   - Title: {app.title}")
    print(f"   - Version: {app.version}")
except Exception as e:
    print(f"   ✗ Main app creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ All diagnostics passed!")
print("=" * 60)
