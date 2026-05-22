# 🚀 START HERE - Fix "Site Can't Be Reached"

## The Problem

You're seeing "Site Can't Be Reached" when accessing http://localhost

---

## The Solution (3 Steps)

### Step 1: Start Docker Desktop ⚠️ MOST IMPORTANT

1. **Open Docker Desktop** application on your computer
2. **Wait** for it to fully start (30-60 seconds)
3. Look for Docker icon in system tray - it should be **steady** (not animated)

**If Docker Desktop is not installed:**
- Download: https://www.docker.com/products/docker-desktop/
- Install and restart computer

---

### Step 2: Run Diagnostic

Double-click: **`check_docker.bat`**

This will tell you exactly what's wrong.

**Or run in PowerShell:**
```powershell
.\check_docker.ps1
```

---

### Step 3: Start Containers

Open PowerShell or Command Prompt in this folder and run:

```bash
docker-compose up -d
```

Wait 30 seconds, then open: **http://localhost**

---

## Quick Commands

### Start Everything:
```bash
docker-compose up -d
```

### Check Status:
```bash
docker-compose ps
```

### View Logs:
```bash
docker-compose logs -f
```

### Stop Everything:
```bash
docker-compose down
```

### Restart Everything:
```bash
docker-compose restart
```

---

## Expected Output

When you run `docker-compose ps`, you should see:

```
NAME                STATUS              PORTS
pdf-portal-db       Up (healthy)        5432/tcp
pdf-portal-api      Up                  0.0.0.0:8000->8000/tcp
pdf-portal-web      Up                  0.0.0.0:80->80/tcp
```

All should show **"Up"** status.

---

## Test Your Setup

### 1. Test API:
Open in browser: http://localhost:8000

**Should see:** API response (not error)

### 2. Test Frontend:
Open in browser: http://localhost

**Should see:** Login page or dashboard

### 3. Login:
- Email: `admin@iiconacademy.com`
- Password: `Admin@1234`

---

## Common Issues

### Issue 1: Docker Desktop Not Running ⚠️

**Error:**
```
cannot connect to docker daemon
```

**Solution:**
1. Start Docker Desktop
2. Wait 30-60 seconds
3. Try again

---

### Issue 2: Port 80 Already in Use

**Error:**
```
port is already allocated
```

**Solution:**

**Option A:** Stop IIS (if running)
```bash
net stop w3svc
```

**Option B:** Use different port

Edit `docker-compose.yml`, change:
```yaml
web:
  ports:
    - "8080:80"  # Changed from 80:80
```

Then access: http://localhost:8080

---

### Issue 3: Containers Keep Restarting

**Check logs:**
```bash
docker-compose logs web
docker-compose logs api
```

**Solution:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Full Reset (If Nothing Works)

```bash
# Stop everything
docker-compose down

# Remove volumes (WARNING: Deletes data!)
docker-compose down -v

# Rebuild
docker-compose build --no-cache

# Start
docker-compose up -d

# Watch logs
docker-compose logs -f
```

---

## Verify Everything Works

Run this checklist:

- [ ] Docker Desktop is running
- [ ] `docker-compose ps` shows all containers "Up"
- [ ] http://localhost:8000 works (API)
- [ ] http://localhost works (Frontend)
- [ ] Can login with admin@iiconacademy.com / Admin@1234

---

## Need More Help?

1. **Run diagnostic:** `check_docker.bat` or `check_docker.ps1`
2. **Check logs:** `docker-compose logs -f`
3. **Read detailed guide:** `FIX_SITE_CANT_BE_REACHED.md`

---

## 90% of the Time...

The issue is simply: **Docker Desktop is not running**

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start
3. Run: `docker-compose up -d`
4. Open: http://localhost

**That's it!** 🎉

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker-compose up -d` | Start all containers |
| `docker-compose down` | Stop all containers |
| `docker-compose ps` | Check container status |
| `docker-compose logs -f` | View live logs |
| `docker-compose restart` | Restart all containers |
| `docker-compose build` | Rebuild containers |

---

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

**Most Common Fix:** Start Docker Desktop, then run `docker-compose up -d` 🚀
