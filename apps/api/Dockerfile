FROM python:3.12-slim

WORKDIR /app

# Added dos2unix to the package installation
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc dos2unix && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 1. Fix potential Windows line ending issues automatically
# 2. Give the script execution permissions
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Run diagnostics during build to catch issues early
RUN python diagnose.py || echo "Diagnostics failed - check logs"

EXPOSE 8000

# Run the script directly as an executable
ENTRYPOINT ["./entrypoint.sh"]