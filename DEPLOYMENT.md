# i-icon Academy — Docker Deployment Guide

Deploy the full stack on a single **Digital Ocean Droplet** using Docker Compose.
- **Database**: Digital Ocean Managed MongoDB (external, TLS)
- **Backend**: Fastify API in a Docker container
- **Frontend**: React SPA served by Nginx in a Docker container
- **TLS/HTTPS**: Caddy (automatic Let's Encrypt, zero-config)
- **PDF Storage**: Files stored as binary data in MongoDB — **no filesystem volumes needed for content**

---

## Architecture Overview

```
Internet
  │
  ▼
Caddy :443 (TLS termination, Let's Encrypt)
  │
  ▼
web container (Nginx :80)
  │ ├── /api/* ──────────► api container :8000 (Fastify)
  │ │                              │
  │ │                              ▼
  │ │                    DO Managed MongoDB (TLS)
  │ └── /* ─────────────► React SPA (static files)
  │
  └── /api/notifications/ws ─► api container (WebSocket)
```

PDFs are stored as binary (`Buffer`) in MongoDB — no shared filesystem volume between containers.
WhatsApp uses the Meta Cloud API (HTTP-based) — no persistent session volume is needed.

---

## Prerequisites

| Item | Notes |
|------|-------|
| Domain name | `iiconacademy.in` — point an A record to the Droplet IP before deploying (Caddy needs DNS live for Let's Encrypt) |
| Digital Ocean Droplet | Ubuntu 22.04 LTS, 2 vCPU / 4 GB RAM minimum (4 vCPU / 8 GB recommended) |
| DO Managed MongoDB | Any tier; TLS enabled by default |
| Docker + Docker Compose v2 | Installed in Step 1 |

---

## Step 1 — Provision the Droplet

1. In DO Console, create a **Droplet**: Ubuntu 22.04 LTS, 2+ vCPU, 4+ GB RAM.
2. Add your SSH key during creation (or use the DO console).
3. SSH in:
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```
4. Install Docker (official script):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
5. Verify:
   ```bash
   docker --version
   docker compose version
   ```

---

## Step 2 — Provision DO Managed MongoDB

1. In DO Console → **Databases** → Create → **MongoDB** (latest version).
2. Choose the same region as your Droplet for lowest latency.
3. After creation, go to **Settings → Trusted Sources** and add your Droplet's IP.
4. Go to **Connection Details** → select **Connection String** → copy the URI.
   It looks like:
   ```
   mongodb+srv://doadmin:<password>@db-mongodb-xxx.mongo.ondigitalocean.com/iiconacademy?tls=true&authSource=admin
   ```
5. Keep this URI for the `.env` file in Step 4.

---

## Step 3 — Point DNS to the Droplet

In your domain registrar or DO DNS panel:

```
A record:   iiconacademy.in   →   YOUR_DROPLET_IP
```

Wait for DNS propagation (usually a few minutes with DO DNS, up to 24 h with external registrars). Caddy will fail to get a Let's Encrypt cert if DNS isn't live yet.

---

## Step 4 — Copy Code to the Droplet

**Option A — Git clone (recommended)**

```bash
# On the droplet:
git clone https://github.com/YOUR_ORG/YOUR_REPO.git /opt/iiconacademy
cd /opt/iiconacademy
```

**Option B — rsync from your machine**

```bash
# From your local machine:
rsync -avz --exclude node_modules --exclude .git \
  /path/to/pdf-portal/ root@YOUR_DROPLET_IP:/opt/iiconacademy/
```

---

## Step 5 — Configure Environment

```bash
cd /opt/iiconacademy
cp .env.example .env
nano .env   # or vim .env
```

Fill in every value. At minimum:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | The connection string from Step 2 |
| `SECRET_KEY` | Run `openssl rand -hex 64` to generate |
| `APP_BASE_URL` | `https://iiconacademy.in` (pre-filled in `.env.example`) |
| `DEFAULT_ADMIN_EMAIL` | Your admin email |
| `DEFAULT_ADMIN_PASSWORD` | A strong password |

Save and close.

---

## Step 6 — Verify Caddyfile

The `Caddyfile` is already configured for `iiconacademy.in`. No changes needed unless you use a different domain.

```bash
head -1 /opt/iiconacademy/Caddyfile
# Should print: iiconacademy.in {
```

---

## Step 7 — Build Docker Images

Build both images on the Droplet:

```bash
cd /opt/iiconacademy

# Build API image
docker build -t iiconacademy/api:latest apps/api-node/

# Build Web image (must be built from the monorepo root — the Dockerfile uses context .)
docker build -t iiconacademy/web:latest -f apps/web/Dockerfile .
```

Building the first time takes 2–5 minutes (Vite build, TypeScript compilation).

---

## Step 8 — Start the Application

```bash
cd /opt/iiconacademy
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Check that all three containers are running:

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                     STATUS
iiconacademy-api-1       Up (healthy)
iiconacademy-web-1       Up
iiconacademy-caddy-1     Up
```

Watch logs:
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Just the API
docker compose -f docker-compose.prod.yml logs -f api
```

---

## Step 9 — Verify

```bash
# Health check (should return {"status":"ok",...})
curl https://iiconacademy.in/api/health

# Check TLS certificate is valid
curl -vI https://iiconacademy.in 2>&1 | grep -E "SSL|issuer|expire"
```

Open `https://iiconacademy.in` in a browser — the login page should load over HTTPS.

---

## Updating the Application

```bash
cd /opt/iiconacademy

# Pull latest code
git pull

# Rebuild images
docker build -t iiconacademy/api:latest apps/api-node/
docker build -t iiconacademy/web:latest -f apps/web/Dockerfile .

# Restart only the updated services (Caddy stays up)
docker compose -f docker-compose.prod.yml --env-file .env up -d --no-deps api web
```

---

## WhatsApp Setup (Post-Deploy)

WhatsApp uses the **Meta Cloud API** — no QR code or phone linking required. Credentials are stored as environment variables or saved through the admin panel.

**Option A — Environment variables** (set in `.env` before deploying):
```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_API_VERSION=v20.0
```

**Option B — Admin panel**: Log in → **Settings → WhatsApp** → enter Phone Number ID and Access Token → Save.

Either option enables WhatsApp notifications immediately. No container restart needed for Option B.

---

## Local Development

For local development (uses a local MongoDB container):

```bash
docker compose up -d
```

Or run without Docker for faster iteration:

```bash
# Terminal 1 — API (port 8000, with hot-reload)
pnpm -F api-node dev

# Terminal 2 — Web (port 3000, proxies /api → localhost:8000)
pnpm -F web dev
```

---

## Backup & Restore

### Database backup

DO Managed MongoDB has automatic daily backups built in. For manual backups:

```bash
docker run --rm -v $(pwd)/backup:/backup mongo:8 \
  mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)
```

---

## Troubleshooting

### Caddy not getting a certificate
- Confirm DNS A record points to the Droplet: `dig +short iiconacademy.in`
- Ensure ports 80 and 443 are open (DO Console → Networking → Firewalls)
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`

### API health check failing
```bash
docker compose -f docker-compose.prod.yml logs api
# Common causes: MONGODB_URI wrong, SECRET_KEY missing
```

### MongoDB connection refused
- Confirm Droplet IP is in DO Databases → Trusted Sources
- Verify the URI includes `?tls=true&authSource=admin`
- Test: `docker compose -f docker-compose.prod.yml exec api node -e "require('mongoose').connect(process.env.MONGODB_URI).then(()=>console.log('OK')).catch(e=>console.error(e.message))"`

### Out of disk space
PDFs are in MongoDB — no local disk used for content. Clean up Docker artifacts:
```bash
df -h
docker system prune -f
```

### Reset admin password
```bash
# 1. In .env set: RESET_DEFAULT_ADMIN_PASSWORD=true
# 2. Restart api:
docker compose -f docker-compose.prod.yml --env-file .env up -d api
# 3. After restart, set back to false and restart again
```

---

## File Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development (includes local MongoDB) |
| `docker-compose.prod.yml` | Production (DO Managed MongoDB + Caddy TLS) |
| `Caddyfile` | Caddy HTTPS config — edit domain before deploying |
| `.env.example` | Environment variable template — copy to `.env` |
| `apps/api-node/Dockerfile` | API multi-stage build |
| `apps/web/Dockerfile` | Web multi-stage build (Vite + Nginx) |
| `apps/web/nginx.conf` | Nginx config inside web container |
