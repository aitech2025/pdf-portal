"""
Apply schema updates for existing PostgreSQL databases.

SQLAlchemy create_all() only creates missing tables; it does not add columns.
All models must be imported before create_all() so tables are registered.
"""
import asyncio
import logging

from sqlalchemy import text

from app.database import engine, Base
import app.models  # noqa: F401 — register all tables on Base.metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# table_name -> list of SQL statements (ALTER/UPDATE only; tables come from create_all)
TABLE_MIGRATIONS: dict[str, list[str]] = {
    "categories": [
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS program_id VARCHAR(15)",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_code VARCHAR(50)",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255)",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(50)",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE",
        "UPDATE categories SET status = 'active' WHERE status IS NULL",
        "UPDATE categories SET is_archived = FALSE WHERE is_archived IS NULL",
    ],
    "pdfs": [
        "ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS file_data BYTEA",
    ],
    "pdf_versions": [
        "ALTER TABLE pdf_versions ADD COLUMN IF NOT EXISTS file_data BYTEA",
    ],
    "users": [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ",
        "UPDATE users SET login_attempts = 0 WHERE login_attempts IS NULL",
    ],
    "notifications": [
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_method VARCHAR(50) DEFAULT 'email'",
        "UPDATE notifications SET notification_method = 'in_app' WHERE notification_method IS NULL",
    ],
}

INDEX_MIGRATIONS = [
    ("categories", "CREATE UNIQUE INDEX IF NOT EXISTS ix_categories_category_code ON categories (category_code) WHERE category_code IS NOT NULL"),
    ("categories", "CREATE UNIQUE INDEX IF NOT EXISTS ix_categories_slug ON categories (slug) WHERE slug IS NOT NULL"),
    ("categories", "CREATE INDEX IF NOT EXISTS ix_categories_program_id ON categories (program_id)"),
]


async def _table_exists(conn, table_name: str) -> bool:
    result = await conn.execute(
        text(
            "SELECT EXISTS ("
            "  SELECT 1 FROM information_schema.tables "
            "  WHERE table_schema = 'public' AND table_name = :name"
            ")"
        ),
        {"name": table_name},
    )
    return bool(result.scalar())


async def run_migrations() -> None:
    logger.info("Running schema migrations...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Tables ensured via create_all (%d tables)", len(Base.metadata.tables))

        for table_name, statements in TABLE_MIGRATIONS.items():
            if not await _table_exists(conn, table_name):
                logger.warning("Skipping column migrations for missing table: %s", table_name)
                continue
            for sql in statements:
                await conn.execute(text(sql))
            logger.info("Applied column migrations for %s", table_name)

        for table_name, sql in INDEX_MIGRATIONS:
            if not await _table_exists(conn, table_name):
                continue
            try:
                await conn.execute(text(sql))
            except Exception as exc:
                logger.warning("Index migration skipped: %s — %s", sql[:60], exc)

    logger.info("Schema migrations complete.")


if __name__ == "__main__":
    asyncio.run(run_migrations())
