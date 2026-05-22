"""
Initialize database - creates the database if it doesn't exist
This connects to the default 'postgres' database first, then creates our database
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Connect to default postgres database to create our database
DEFAULT_DB_URL = "postgresql+asyncpg://postgres:postgres@db:5432/postgres"
TARGET_DB_NAME = "iiconacademy"

async def init_database():
    print(f"Checking if database '{TARGET_DB_NAME}' exists...")
    
    # Connect to default postgres database
    engine = create_async_engine(DEFAULT_DB_URL, isolation_level="AUTOCOMMIT", echo=False)
    
    try:
        async with engine.connect() as conn:
            # Check if database exists
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": TARGET_DB_NAME}
            )
            exists = result.scalar()
            
            if exists:
                print(f"✓ Database '{TARGET_DB_NAME}' already exists")
                return True
            else:
                print(f"Database '{TARGET_DB_NAME}' does not exist, creating it...")
                await conn.execute(text(f'CREATE DATABASE "{TARGET_DB_NAME}"'))
                print(f"✓ Database '{TARGET_DB_NAME}' created successfully")
                return True
                
    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    result = asyncio.run(init_database())
    sys.exit(0 if result else 1)
