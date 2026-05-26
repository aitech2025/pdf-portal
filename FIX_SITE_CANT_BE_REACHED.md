# Fix "Site can't be reached" — Docker stack troubleshooting

For day-to-day commands see [START_HERE.md](./START_HERE.md). This document covers what to do when something is broken.

> **Stack today:** MongoDB 8 (internal `mongo:27017`) + Fastify API (`apps/api-node`, port 8000) + nginx-served React build (`apps/web`, port 80).

---

## 1. Decision tree

1. `docker ps` errors out → **Docker Desktop is not running.** Start it and wait for the system-tray icon to stop animating.
2. `docker compose ps` shows fewer than three services → run `docker compose up -d`.
3. `docker compose ps` shows `Restarting` → check the logs (`docker compose logs api --tail 200`).
4. Browser still says "site can't be reached" → confirm `docker compose logs web` shows nginx listening on `:80` and port 80 isn't held by IIS or another local server.

---

## 2. Healthy baseline

```bash
docker compose ps
```

```
NAME                                 STATUS         PORTS
pdf-portal-mongo-1                   Up (healthy)   27017/tcp
pdf-portal-api-1                     Up             0.0.0.0:8000->8000/tcp
pdf-portal-web-1                     Up             0.0.0.0:80->80/tcp
```

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/ready
curl -I http://localhost/
```

All three should return `200`.

---

## 3. Common errors

### 3.1 `cannot connect to docker daemon`

Docker Desktop isn't running. Start it from the Start menu, wait until the whale icon is steady, then retry.

### 3.2 `port is already allocated` on 80 or 8000

Something else owns the port (often IIS on Windows).

```powershell
# find the owner
netstat -ano | findstr :80
# stop IIS
net stop w3svc
```

Or remap the host port in `docker-compose.yml`:

```yaml
web:
  ports:
    - "8080:80"   # then open http://localhost:8080

api:
  ports:
    - "8001:8000" # then open http://localhost:8001
```

### 3.3 API container restarting

```bash
docker compose logs api --tail 200
```

Most common causes:

| Log signal                                  | Likely cause                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `MongoServerSelectionError` / `ECONNREFUSED` | Mongo isn't healthy yet; the API will retry. Give it 10–20s after first boot. |
| `Cannot find module …`                       | The image is stale; rebuild with `docker compose build --no-cache api`.       |
| `EADDRINUSE :::8000`                         | The host port mapping is already taken — remap as above.                      |
| `error: JWT_SECRET … missing`                | Set `SECRET_KEY` in your `.env` (see `docker-compose.yml`).                   |

### 3.4 Mongo healthcheck never becomes healthy

```bash
docker compose logs mongo --tail 200
```

If you see permissions errors on the volume, recreate it:

```bash
docker compose down
docker volume rm pdf-portal_mongo_data    # name may differ; check `docker volume ls`
docker compose up -d
```

(Note: this **destroys the database**.)

### 3.5 Web container starts but pages are 404 / blank

The nginx image was built from a stale Vite bundle. Rebuild:

```bash
docker compose build --no-cache web
docker compose up -d web
```

---

## 4. Verify connectivity end-to-end

```bash
# API healthy
curl http://localhost:8000/api/health
# API can reach Mongo
curl http://localhost:8000/api/ready
# Web is reachable
curl -I http://localhost/
```

All three should return `HTTP 200`. If `/api/ready` returns 503 the API can't talk to Mongo — check `docker compose logs mongo`.

---

## 5. Nuclear reset

```bash
docker compose down -v          # WARNING: deletes the Mongo volume
docker compose build --no-cache
docker compose up -d
docker compose logs -f
```

Wait for the API log to show `Server listening on http://0.0.0.0:8000` and the seed line `[seed] ensured default admin user`, then open http://localhost.

---

## 6. URLs cheat-sheet

| Service     | URL                                  |
| ----------- | ------------------------------------ |
| Web         | http://localhost                     |
| API root    | http://localhost:8000                |
| Health      | http://localhost:8000/api/health     |
| Readiness   | http://localhost:8000/api/ready      |
| Mongo       | `mongo:27017` (only inside the compose network) |

Default login: `admin@iiconacademy.com` / `Admin@1234`.
