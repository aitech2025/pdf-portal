"""
Test configuration and fixtures for school-category-access property tests.

Uses an in-memory SQLite database (aiosqlite) for full isolation.

IMPORTANT: DATABASE_URL must be set to the SQLite URL *before* any app
modules are imported, because app/database.py creates the engine at module
load time.  We do this via os.environ at the very top of this file.
"""
import asyncio
import os

# Override DATABASE_URL before any app imports so the production asyncpg
# engine is never created during tests.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Now safe to import app modules
from app.database import Base, get_db
from app.main import app
from app.auth import create_access_token, hash_password
from app.models.school import School, SchoolCategoryAccess
from app.models.category import Category
from app.models.user import User

# ---------------------------------------------------------------------------
# In-memory SQLite engine (same URL as the one app/database.py will use
# because we set DATABASE_URL above before it was imported)
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
TestingSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Override get_db to use the test database
# ---------------------------------------------------------------------------

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Create tables synchronously at module load time so Hypothesis (sync) tests
# can use them without needing a pytest fixture.
# ---------------------------------------------------------------------------

def _run(coro):
    """Run a coroutine in a new event loop."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _create_all_tables():
    from sqlalchemy import text
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # SQLite: ensure file_data columns exist (Postgres uses BYTEA via create_all)
        try:
            await conn.execute(text("ALTER TABLE pdfs ADD COLUMN file_data BLOB"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE pdf_versions ADD COLUMN file_data BLOB"))
        except Exception:
            pass


_run(_create_all_tables())

# Apply the DB override globally for all tests in this session.
app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Session-scoped fixture — tables already created above; this is a no-op
# but keeps pytest-asyncio tests happy.
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    yield


# ---------------------------------------------------------------------------
# App fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def test_app():
    yield app


# ---------------------------------------------------------------------------
# Async HTTP client fixture (for pytest-asyncio tests)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def client(test_app):
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# DB session fixture (for direct DB manipulation in tests)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Helper: create a school
# ---------------------------------------------------------------------------

async def create_school(db: AsyncSession, name: str = "Test School") -> School:
    school = School(school_name=name)
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return school


# ---------------------------------------------------------------------------
# Helper: create a category
# ---------------------------------------------------------------------------

async def create_category(
    db: AsyncSession,
    name: str = "Test Category",
    category_type: str = "Grade 1-5",
) -> Category:
    cat = Category(category_name=name, category_type=category_type)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


# ---------------------------------------------------------------------------
# Helper: create a user
# ---------------------------------------------------------------------------

async def create_user(
    db: AsyncSession,
    email: str,
    role: str = "school",
    school_id: str | None = None,
) -> User:
    user = User(
        email=email,
        password_hash=hash_password("testpassword"),
        name=f"User {email}",
        role=role,
        school_id=school_id,
        is_active=True,
        verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Helper: generate JWT token for a user
# ---------------------------------------------------------------------------

def make_token(user: User) -> str:
    return create_access_token({"sub": user.id, "role": user.role})
