# START HERE — Run the project locally

## Stack

| Layer    | Tech                                      | Port |
| -------- | ----------------------------------------- | ---- |
| Database | MongoDB 8                                 | 27017 (internal) |
| Backend  | Node 22 + Fastify 5 (`apps/api-node`)     | 8000 |
| Frontend | React + Vite (`apps/web`) served via nginx | 80   |

All three services are wired up in `docker-compose.yml`.

---

## 1. Prerequisites

- **Docker Desktop** (required) — https://www.docker.com/products/docker-desktop/
- **Node 20+** (only if you want to run the web/api outside Docker)

---

## 2. Start everything

```bash
docker compose up -d
```

Wait ~30s for the first build, then open:

- Web app:   http://localhost
- API root:  http://localhost:8000
- API health: http://localhost:8000/api/health
- API ready:  http://localhost:8000/api/ready

Default login:

- Email: `admin@iiconacademy.com`
- Password: `Admin@1234`

---

## 3. Common commands

```bash
docker compose ps             # status
docker compose logs -f api    # follow API logs
docker compose logs -f web    # follow web logs
docker compose logs -f mongo  # follow DB logs
docker compose restart        # restart all services
docker compose down           # stop everything
docker compose down -v        # stop + delete the database volume (destructive!)
```

`docker compose ps` should show all three services as `Up`:

```
NAME                                 STATUS         PORTS
pdf-portal-mongo-1                   Up (healthy)   27017/tcp
pdf-portal-api-1                     Up             0.0.0.0:8000->8000/tcp
pdf-portal-web-1                     Up             0.0.0.0:80->80/tcp
```

---

## 4. Dev workflow (run web outside Docker for HMR)

```bash
docker compose up -d mongo api        # backend + DB only
cd apps/web && npm install && npm run dev
```

Vite proxies `/api` and `/uploads` to `http://localhost:8000` so the dev server picks up the dockerised API automatically.

---

## 5. Common issues

| Problem                                   | Fix                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `cannot connect to docker daemon`         | Start Docker Desktop and wait for it to settle (icon stops animating). |
| `port 80 is already allocated`            | Stop IIS (`net stop w3svc`) or change the host port in `docker-compose.yml` (`"8080:80"`). |
| `port 8000 is already allocated`          | Kill the other process or change the host port in `docker-compose.yml`. |
| Containers keep restarting                | `docker compose logs api` / `docker compose logs web` — usually a missing env var or a build error. |
| Login fails on a fresh DB                 | The API seeds the default admin on first boot. Wait for the `api` container log to show `[seed] ensured default admin user`. |

---

## 6. Full reset (nuke and start over)

```bash
docker compose down -v           # WARNING: deletes the MongoDB volume
docker compose build --no-cache
docker compose up -d
docker compose logs -f
```

---

## 7. Mobile builds

See [docs/MOBILE.md](docs/MOBILE.md) for the Capacitor iOS + Android workflow.

---

## Quick reference

| Service   | Container          | URL / Port                  |
| --------- | ------------------ | --------------------------- |
| Web       | `pdf-portal-web-1` | http://localhost            |
| API       | `pdf-portal-api-1` | http://localhost:8000       |
| MongoDB   | `pdf-portal-mongo-1` | mongodb://mongo:27017/iiconacademy (internal) |
| Health    | —                  | http://localhost:8000/api/health |
| Readiness | —                  | http://localhost:8000/api/ready  |
