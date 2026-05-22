# API Startup Troubleshooting Guide

## Common Issues and Solutions

### 1. Line Ending Issues (entrypoint.sh: set: Illegal option -)

**Symptom:** Error messages like `entrypoint.sh: 2: set: Illegal option -`

**Cause:** Windows line endings (CRLF) in shell scripts

**Solution:** The Dockerfile now includes `dos2unix` to automatically fix this. Rebuild the container:
```bash
docker-compose build api
docker-compose up api
```

### 2. Database Connection Issues

**Symptom:** Errors like `database "iiconacademy" does not exist`

**Cause:** The database hasn't been created yet, or you're using an old PostgreSQL volume

**Solutions:**

**Option 1: Recreate volumes (recommended for fresh start)**
```bash
docker-compose down -v
docker-compose up
```

**Option 2: Keep existing data**
The entrypoint script now automatically creates the database if it doesn't exist using `init_db.py`

**Manual database creation (if needed):**
```bash
docker-compose exec db psql -U postgres -c "CREATE DATABASE iiconacademy;"
```

**Other database issues:**
- Ensure PostgreSQL container is running: `docker-compose ps`
- Check database health: `docker-compose logs db`
- The entrypoint script waits up to 60 seconds for the database to be ready

### 3. Import Errors

**Symptom:** ModuleNotFoundError or ImportError

**Solution:** Run diagnostics to identify the issue:
```bash
docker-compose run api python diagnose.py
```

### 4. Seed Script Failures

**Symptom:** Errors during database seeding

**Solutions:**
- Check seed logs: `docker-compose logs api | grep seed`
- The seed script now has better error handling and will show detailed tracebacks
- Manually run seed: `docker-compose run api python seed.py`

### 5. Permission Issues

**Symptom:** Cannot create upload directory or write files

**Solution:** Check volume permissions in docker-compose.yml

## Diagnostic Commands

### Check API logs
```bash
docker-compose logs api
```

### Follow API logs in real-time
```bash
docker-compose logs -f api
```

### Run diagnostics
```bash
docker-compose run api python diagnose.py
```

### Test database connection
```bash
docker-compose run api python wait_for_db.py
```

### Manually run seed
```bash
docker-compose run api python seed.py
```

### Access API container shell
```bash
docker-compose exec api sh
```

### Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache api
docker-compose up api
```

## Startup Sequence

The API now follows this startup sequence:

1. **Initialize Database**
   - Connects to PostgreSQL server
   - Creates "iiconacademy" database if it doesn't exist
   - Uses `init_db.py`

2. **Wait for Database** (up to 60 seconds)
   - Uses `wait_for_db.py` to test connection to the target database
   - Retries every 2 seconds

3. **Run Seed Script**
   - Creates database tables
   - Seeds default users and settings
   - Shows detailed error messages on failure

4. **Start API Server**
   - Runs uvicorn on port 8000
   - Creates upload directory
   - Loads all routers

## Default Users

After successful seed, these users are available:

| Email | Password | Role |
|-------|----------|------|
| admin@iiconacademy.com | Admin@1234 | platform_admin |
| school1@iiconacademy.com | School1@1234 | school_admin |
| school2@iiconacademy.com | School2@1234 | school_admin |
| teacher@school1.com | Teacher@1234 | teacher |

## Environment Variables

Key environment variables (set in docker-compose.yml):

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `UPLOAD_DIR`: Directory for uploaded files
- `SMTP_*`: Email configuration (optional)

## Health Check

Once running, check API health:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "ok"}
```
