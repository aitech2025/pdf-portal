#!/bin/sh
set -e

echo "Initializing database..."
python init_db.py || {
    echo "Database initialization failed!"
    exit 1
}

echo "Waiting for database to be ready..."
max_retries=30
retry_count=0

until python wait_for_db.py 2>/dev/null; do
    retry_count=$((retry_count + 1))
    if [ $retry_count -ge $max_retries ]; then
        echo "Database connection failed after $max_retries attempts"
        exit 1
    fi
    echo "Database not ready yet, waiting... (attempt $retry_count/$max_retries)"
    sleep 2
done

echo "Database is ready!"

echo "Running schema migrations..."
python migrate_schema.py || {
    echo "Schema migration failed!"
    exit 1
}

echo "Running database seed..."
python seed.py || {
    echo "Seed script failed!"
    exit 1
}

echo "Starting API server..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-4}" \
  --limit-concurrency "${UVICORN_LIMIT_CONCURRENCY:-1000}" \
  --timeout-keep-alive "${UVICORN_TIMEOUT_KEEP_ALIVE:-5}"
