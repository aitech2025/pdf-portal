# EduPortal — Monorepo Architecture

> **Full guide:** See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for implementation details, deployment steps, environment variables, API reference, notifications, and operations runbooks.
> **Mobile:** See [docs/MOBILE.md](docs/MOBILE.md) for the Capacitor iOS + Android build pipeline and [docs/MOBILE_TESTING.md](docs/MOBILE_TESTING.md) for the QA plan.

## Project Structure

```
eduportal/
├── apps/
│   ├── api-node/     # Node 22 + Fastify 5 backend (MongoDB)
│   └── web/          # React 18 web app (Vite + Tailwind + shadcn/ui)
│       ├── android/  # Capacitor Android shell (generated)
│       └── ios/      # Capacitor iOS shell (added on macOS)
├── docs/             # MOBILE.md, MOBILE_TESTING.md, EMAIL_AND_WHATSAPP.md, DOCUMENTATION.md
└── docker-compose.yml
```

---

## Stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Database | MongoDB 8, Mongoose 8                                            |
| Backend  | Node.js 22, Fastify 5, JWT auth, WebSockets for notifications    |
| Web      | React 18, Vite 7, Tailwind CSS 3, shadcn/ui, framer-motion       |
| Mobile   | Capacitor 6 wrapping the React web app (iOS + Android)           |
| Email    | Nodemailer (SMTP — Hostinger, SES, Mailgun, etc.)                |
| WhatsApp | Meta Cloud API (primary), WAHA / custom HTTP gateway (optional)  |

---

## Mobile App (Capacitor)

The Capacitor shell wraps the production Vite bundle so the iOS / Android binaries reuse 100% of the web UI. Native niceties (StatusBar, SplashScreen, Keyboard insets, hardware back button, deep links, native file save / share / haptics / network) are wired up via `apps/web/src/native/`.

Build & run:

```bash
cd apps/web

# One-time: Android platform (works on Windows, macOS, Linux)
npm run mobile:add:android

# One-time: iOS platform (macOS only)
npm run mobile:add:ios

# Sync the production web bundle into the native projects
npm run mobile:sync

# Open in Android Studio / Xcode for signed builds
npm run mobile:open:android
npm run mobile:open:ios
```

Full walkthrough lives in [`docs/MOBILE.md`](docs/MOBILE.md). Device matrix, test scenarios, performance baselines, and release smoke tests in [`docs/MOBILE_TESTING.md`](docs/MOBILE_TESTING.md).

---

## Running the Project

### Backend + Database (Docker)
```bash
docker compose up -d
```

### Web App (Vite dev server, HMR)
```bash
docker compose up -d mongo api     # backend + DB only
cd apps/web && npm run dev         # http://localhost:3000
```

Vite proxies `/api` and `/uploads` to `http://localhost:8000` so the dev server picks up the dockerised API automatically.

### Mobile (Capacitor)
```bash
cd apps/web
npm run mobile:run:android          # build + sync + launch on connected device
npm run mobile:run:ios              # macOS only
```

For live-reload on a connected device or emulator, point Capacitor at the Vite dev server:

```bash
# Terminal 1
cd apps/web && npm run dev

# Terminal 2 (PowerShell)
$env:CAP_SERVER_URL = "http://<your-LAN-ip>:3000"
npm run mobile:run:android
```

---

## Environment Variables

```
# .env (repo root) — read by docker-compose.yml
SECRET_KEY=change-me-in-production
APP_BASE_URL=https://yourdomain.com           # used for outbound email links
SMTP_HOST=smtp.hostinger.com                  # fallback if SystemSettings DB row is empty
SMTP_PORT=465
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=i-icon Academy
```

Email + WhatsApp credentials should normally be configured **live** from the admin Settings page — the runtime reads `SystemSettings` from MongoDB first and falls back to these env vars only when the DB row is empty. See [`docs/EMAIL_AND_WHATSAPP.md`](docs/EMAIL_AND_WHATSAPP.md) for the full precedence rules.

For Capacitor dev against your LAN, set `CAP_SERVER_URL=http://<your-LAN-ip>:3000` before `npm run mobile:run:android`.

---

## Change-management workflow

Adding or updating an API endpoint:

1. Add / edit the route in `apps/api-node/src/routes/`.
2. Add an integration test in `apps/api-node/tests/`.
3. If the request/response shape changes, update the relevant call site(s) in `apps/web/src/`.
4. Rebuild the web bundle (`npm run build` inside `apps/web`) and run `npm run mobile:sync` so the Capacitor shells pick up the change.

Single source of truth for the API is **`apps/api-node`**.
