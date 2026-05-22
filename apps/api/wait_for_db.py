"""
Simple script to wait for database to be ready
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def wait_for_db():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("Database connection successful!")
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    result = asyncio.run(wait_for_db())
    sys.exit(0 if result else 1)
