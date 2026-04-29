#!/bin/sh
set -e

echo "Running database seed..."
python seed.py

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
