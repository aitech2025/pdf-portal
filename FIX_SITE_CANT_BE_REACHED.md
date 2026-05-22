# 🔧 Fix "Site Can't Be Reached" Error

## Problem
Containers are starting but website is not accessible.

---

## Solution Steps

### Step 1: Start Docker Desktop

**The main issue is Docker Desktop is not running.**

1. Open **Docker Desktop** application
2. Wait for it to fully start (Docker icon in system tray should be steady, not animated)
3. You should see "Docker Desktop is running" in the system tray

**If Docker Desktop is not installed:**
- Download from: https://www.docker.com/products/docker-desktop/
- Install and restart your computer
- Start Docker Desktop

---

### Step 2: Verify Docker is Running

Open PowerShell or Command Prompt and run:

```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE          COMMAND       CREATED       STATUS       PORTS
```

**If you see an error:**
```
error during connect: This error may indicate that the docker daemon is not running
```

**Solution:** Start Docker Desktop and wait 30 seconds, then try again.

---

### Step 3: Start the Containers

```bash
cd "c:\Users\navee\OneDrive\Desktop\Pet-Projects\hostinger\pdf-portal - Copy\pdf-portal"
docker-compose up -d
```

**Expected output:**
```
[+] Running 3/3
 ✔ Container pdf-portal-db   Started
 ✔ Container pdf-portal-api  Started
 ✔ Container pdf-portal-web  Started
```

---

### Step 4: Check Container Status

```bash
docker-compose ps
```

**Expected output:**
```
NAME                STATUS              PORTS
pdf-portal-db       Up (healthy)        5432/tcp
pdf-portal-api      Up                  0.0.0.0:8000->8000/tcp
pdf-portal-web      Up                  0.0.0.0:80->80/tcp
```

**All containers should show "Up" status.**

---

### Step 5: Check Container Logs

If containers are running but site still not accessible:

```bash
# Check web container logs
docker-compose logs web --tail=50

# Check API container logs
docker-compose logs api --tail=50

# Check database logs
docker-compose logs db --tail=50
```

**Look for errors in the logs.**

---

### Step 6: Test Each Service

#### Test Database:
```bash
docker-compose exec db psql -U postgres -d iiconacademy -c "SELECT 1;"
```

**Expected:** Should return `1`

#### Test API:
```bash
curl http://localhost:8000/
```

**Or open in browser:** http://localhost:8000

**Expected:** Should return API response (not error)

#### Test Web:
```bash
curl http://localhost/
```

**Or open in browser:** http://localhost

**Expected:** Should return HTML or redirect to login

---

## Common Issues & Solutions

### Issue 1: Docker Desktop Not Running

**Symptoms:**
- Error: "cannot connect to docker daemon"
- Error: "pipe/dockerDesktopLinuxEngine: The system cannot find the file"

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start (30-60 seconds)
3. Try again

---

### Issue 2: Port 80 Already in Use

**Symptoms:**
- Error: "port is already allocated"
- Error: "bind: address already in use"

**Solution:**

**Option A: Stop the service using port 80**
```bash
# Find what's using port 80
netstat -ano | findstr :80

# Stop IIS if running
net stop w3svc

# Or stop other web servers
```

**Option B: Use a different port**

Edit `docker-compose.yml`:
```yaml
web:
  ports:
    - "8080:80"  # Change from 80:80 to 8080:80
```

Then access: http://localhost:8080

---

### Issue 3: Containers Keep Restarting

**Check logs:**
```bash
docker-compose logs web --tail=100
docker-compose logs api --tail=100
```

**Common causes:**
- API can't connect to database
- Missing environment variables
- Build errors

**Solution:**
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Issue 4: Web Container Exits Immediately

**Check logs:**
```bash
docker-compose logs web
```

**If you see nginx errors:**
```bash
# Rebuild web container
docker-compose build web
docker-compose up -d web
```

---

### Issue 5: API Container Not Starting

**Check logs:**
```bash
docker-compose logs api
```

**Common issues:**
- Database not ready
- Python dependencies missing
- Entrypoint script errors

**Solution:**
```bash
# Rebuild API container
docker-compose build api
docker-compose up -d api
```

---

## Step-by-Step Troubleshooting

### 1. Start Fresh

```bash
# Stop everything
docker-compose down

# Remove old containers and volumes (WARNING: This deletes data!)
docker-compose down -v

# Rebuild everything
docker-compose build --no-cache

# Start everything
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### 2. Check Each Container

```bash
# Check if containers are running
docker-compose ps

# Check web container
docker-compose logs web --tail=50

# Check API container
docker-compose logs api --tail=50

# Check database container
docker-compose logs db --tail=50
```

### 3. Test Connectivity

```bash
# Test database from API container
docker-compose exec api python -c "
import asyncio
from app.database import engine

async def test():
    async with engine.begin() as conn:
        result = await conn.execute('SELECT 1')
        print('Database connected!')

asyncio.run(test())
"

# Test API endpoint
curl http://localhost:8000/

# Test web frontend
curl http://localhost/
```

---

## Quick Diagnostic Script

Save this as `diagnose_docker.ps1`:

```powershell
Write-Host "=== Docker Diagnostics ===" -ForegroundColor Cyan

Write-Host "`n1. Checking Docker status..." -ForegroundColor Yellow
docker --version

Write-Host "`n2. Checking running containers..." -ForegroundColor Yellow
docker ps

Write-Host "`n3. Checking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host "`n4. Checking web logs..." -ForegroundColor Yellow
docker-compose logs web --tail=20

Write-Host "`n5. Checking API logs..." -ForegroundColor Yellow
docker-compose logs api --tail=20

Write-Host "`n6. Testing API endpoint..." -ForegroundColor Yellow
curl http://localhost:8000/ -UseBasicParsing

Write-Host "`n7. Testing web endpoint..." -ForegroundColor Yellow
curl http://localhost/ -UseBasicParsing

Write-Host "`n=== Diagnostics Complete ===" -ForegroundColor Cyan
```

Run it:
```bash
powershell -ExecutionPolicy Bypass -File diagnose_docker.ps1
```

---

## Expected URLs

Once everything is running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost | Main application |
| **API** | http://localhost:8000 | Backend API |
| **API Docs** | http://localhost:8000/docs | API documentation |
| **Database** | localhost:5432 | PostgreSQL (internal) |

---

## Verification Checklist

- [ ] Docker Desktop is running
- [ ] All 3 containers are "Up" (db, api, web)
- [ ] No errors in logs
- [ ] http://localhost:8000 returns API response
- [ ] http://localhost returns website
- [ ] Can login with admin@iiconacademy.com / Admin@1234

---

## Still Not Working?

### Collect Information:

```bash
# 1. Container status
docker-compose ps > docker_status.txt

# 2. All logs
docker-compose logs > docker_logs.txt

# 3. System info
docker info > docker_info.txt

# 4. Network info
docker network ls > docker_networks.txt
```

Then check these files for errors.

---

## Most Common Solution

**90% of the time, the issue is:**

1. **Docker Desktop not running** → Start Docker Desktop
2. **Port 80 in use** → Stop IIS or use different port
3. **Containers not built** → Run `docker-compose build`

**Try this:**
```bash
# 1. Make sure Docker Desktop is running
# 2. Then run:
docker-compose down
docker-compose build
docker-compose up -d
docker-compose logs -f
```

Wait for all containers to start, then open: http://localhost

---

## Need More Help?

1. Check `docker-compose logs web` for web errors
2. Check `docker-compose logs api` for API errors
3. Check `docker-compose logs db` for database errors
4. Make sure Docker Desktop is running
5. Make sure no other service is using port 80

---

**Most likely issue:** Docker Desktop is not running. Start it and try again! 🚀
