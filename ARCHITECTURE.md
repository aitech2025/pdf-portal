# EduPortal — Monorepo Architecture

> **Full guide:** See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for implementation details, deployment steps, environment variables, API reference, notifications, and operations runbooks.
> **Mobile:** See [docs/MOBILE.md](docs/MOBILE.md) for the Capacitor iOS + Android build pipeline.

## Project Structure

```
eduportal/
├── apps/
│   ├── api-node/     # Node 22 + Fastify 5 backend (MongoDB)
│   ├── web/          # React 18 web app (Vite + Tailwind + shadcn/ui)
│   │   ├── android/  # Capacitor Android shell (generated)
│   │   └── ios/      # Capacitor iOS shell (added on macOS)
│   └── mobile/       # Legacy Expo / React Native app (optional)
├── packages/
│   └── shared/       # Shared code: API client, types, constants
├── docs/             # MOBILE.md, DOCUMENTATION.md, etc.
└── docker-compose.yml
```

---

## Stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Database | MongoDB 8, Mongoose 8                                            |
| Backend  | Node.js 22, Fastify 5, JWT auth, WebSockets for notifications    |
| Web      | React 18, Vite 7, Tailwind CSS 3, shadcn/ui, framer-motion       |
| Mobile   | **Primary:** Capacitor 6 wrapping the React web app (iOS + Android) |
|          | **Legacy:** Expo SDK 51 + React Native + NativeWind (apps/mobile)   |
| Shared   | Plain JS — API client, constants, utils                          |

---

## Shared Package (`packages/shared`)

Both web and the legacy Expo mobile app import from `@eduportal/shared`:

```
packages/shared/
├── src/
│   ├── api/
│   │   ├── client.js       # Base fetch wrapper (works in browser + RN)
│   │   ├── auth.js         # Login, logout, token storage
│   │   ├── schools.js      # School API calls
│   │   ├── users.js        # User API calls
│   │   ├── pdfs.js         # PDF API calls
│   │   ├── categories.js   # Category API calls
│   │   └── notifications.js
│   ├── constants/
│   │   ├── roles.js        # ROLES, isPlatformRole, isSchoolRole
│   │   └── routes.js       # API route constants
│   └── utils/
│       ├── format.js       # Date, file size formatters
│       └── validation.js   # Email, password validators
└── package.json
```

---

## Mobile App — current path (Capacitor)

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

Full walkthrough lives in [`docs/MOBILE.md`](docs/MOBILE.md).

---

## Mobile App — legacy Expo path (`apps/mobile`)

Built with **Expo** managed workflow, used before Capacitor was introduced. Still functional but no longer the primary delivery channel.

```
apps/mobile/
├── app/                    # Expo Router file-based routing
├── components/
├── hooks/
├── context/
├── app.json                # Expo config
├── tailwind.config.js      # NativeWind config
└── package.json
```

EAS build instructions: [MOBILE_DEPLOYMENT.md](MOBILE_DEPLOYMENT.md).

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

### Mobile (Legacy Expo)
```bash
cd apps/mobile
npx expo start
# Press 'a' for Android emulator, 'i' for iOS simulator, or scan QR with Expo Go.
```

---

## Environment Variables

```
# .env (root) — read by docker-compose.yml
SECRET_KEY=change-me-in-production
SMTP_HOST=...
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=noreply@iiconacademy.com
SMTP_FROM_NAME=i-icon academy
```

For mobile dev against your LAN, set `CAP_SERVER_URL=http://<your-LAN-ip>:3000` before `npm run mobile:run:android`.

---

## Change-management workflow

Adding or updating an API endpoint:

1. Add / edit the route in `apps/api-node/src/routes/`.
2. Add an integration test in `apps/api-node/tests/`.
3. If the request/response shape changes, update the relevant call site(s) in `apps/web/src/` (and, if affected, `apps/mobile/`).
4. Rebuild the web bundle (`npm run build` inside `apps/web`) and run `npm run mobile:sync` so the Capacitor shells pick up the change.

Single source of truth for the API is **`apps/api-node`**.
