# Quick Fix Guide

## The "database does not exist" Error

If you see: `asyncpg.exceptions.InvalidCatalogNameError: database "iiconacademy" does not exist`

### Quick Solution

Stop everything and recreate with fresh volumes:

```bash
docker-compose down -v
docker-compose build api
docker-compose up
```

The `-v` flag removes old volumes that might have the wrong database setup.

### What Changed

The API now automatically:
1. ✓ Creates the database if it doesn't exist (`init_db.py`)
2. ✓ Waits for database to be ready (`wait_for_db.py`)
3. ✓ Seeds default data (`seed.py`)
4. ✓ Starts the API server

### Verify It's Working

Once containers are up, check:

```bash
# Check API health
curl http://localhost:8000/health

# Should return: {"status":"ok"}
```

### View Logs

```bash
# See what's happening
docker-compose logs -f api
```

You should see:
```
Initializing database...
✓ Database 'iiconacademy' created successfully
Waiting for database to be ready...
Database connection successful!
Database is ready!
Running database seed...
Created school: School One (SCH001)
Created school: School Two (SCH002)
Created platform_admin: admin@iiconacademy.com / Admin@1234
...
Seed complete.
Starting API server...
```

### Still Having Issues?

Run diagnostics:
```bash
docker-compose run api python diagnose.py
```

See full troubleshooting guide: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
