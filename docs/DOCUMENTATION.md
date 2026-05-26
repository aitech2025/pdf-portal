# I-ICON EduShare — Implementation, Deployment & Operations Guide

**Version:** 1.0  
**Last updated:** May 2026  
**Repository:** `pdf-portal` (monorepo)

This document describes how the platform is built, how to deploy it, and how to operate it in production. It reflects the current codebase state after the security, auth, program/category, and notification work completed in this project.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [System overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Technology stack](#4-technology-stack)
5. [Repository structure](#5-repository-structure)
6. [Data model](#6-data-model)
7. [Authentication and authorization](#7-authentication-and-authorization)
8. [API reference](#8-api-reference)
9. [Web application](#9-web-application)
10. [Mobile application](#10-mobile-application)
11. [Notifications and alerts](#11-notifications-and-alerts)
12. [Local development](#12-local-development)
13. [Deployment](#13-deployment)
14. [Production configuration](#14-production-configuration)
15. [Operations](#15-operations)
16. [Security checklist](#16-security-checklist)
17. [Troubleshooting](#17-troubleshooting)
18. [Appendix: default seed data](#appendix-default-seed-data)

---

## 1. Executive summary

**I-ICON EduShare** is a multi-tenant educational content distribution platform for:

- Schools, coaching institutes, and educational organizations
- Platform administrators (content and tenant management)
- School administrators, teachers, and school viewers (content consumption)

Core capabilities:

| Area | Status |
|------|--------|
| Multi-tenant isolation (school-scoped) | Implemented |
| Program → Category → PDF hierarchy | Implemented (programs API + category linkage) |
| Category-based access control | Implemented |
| JWT auth + refresh tokens | Implemented |
| Email / WhatsApp / in-app notifications | Implemented |
| Admin broadcast (all / selected schools) | Implemented |
| Web admin + school portals | Implemented |
| Mobile (Expo) school/admin apps | Implemented |
| PDF secure download (auth-gated) | Implemented (public `/uploads` disabled by default) |

---

## 2. System overview

### 2.1 Primary users

| Persona | Roles | Capabilities |
|---------|-------|--------------|
| Platform admin | `platform_admin`, `admin`, `moderator` | Full platform: schools, users, programs, categories, PDFs, settings, broadcast, audit |
| Platform viewer | `platform_viewer` | Read-only platform access |
| School admin | `school_admin`, `school` | Manage school users, browse assigned content, requests |
| School viewer / teacher | `school_viewer`, `teacher` | Browse/download PDFs in assigned categories |

### 2.2 Content hierarchy

```
Program (e.g. Olympiad, Foundation, Competitive Exams)
└── Category (auto-generated codes like OLY-OBJ-001)
    └── SubCategory (optional grouping)
        └── PDF (versioned, status: pending | approved | rejected)
```

Schools receive access via **SchoolCategoryAccess** (many-to-many: school ↔ category).

### 2.3 Deployment topology (default)

```
                    ┌─────────────┐
                    │   Clients   │
                    │ Web / Mobile│
                    └──────┬──────┘
                           │ HTTPS (443)
                    ┌──────▼──────┐
                    │    Nginx    │  apps/web (port 80)
                    │  + React SPA│
                    └──────┬──────┘
                           │ /api/* proxy
                    ┌──────▼──────┐
                    │   Fastify   │  apps/api-node (port 8000)
                    │  Node 22    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌───▼───┐ ┌─────▼─────┐
       │  MongoDB 8  │ │Uploads│ │ SMTP /    │
       │             │ │ volume│ │ WhatsApp  │
       └─────────────┘ └───────┘ └───────────┘
```

---

## 3. Architecture

### 3.1 Monorepo layout

```
pdf-portal/
├── apps/
│   ├── api-node/         # Node 22 + Fastify 5 backend (MongoDB)
│   ├── web/              # React + Vite SPA (Capacitor-wrapped for mobile)
│   │   ├── android/      # Capacitor Android shell (generated)
│   │   └── ios/          # Capacitor iOS shell (macOS only)
│   └── mobile/           # Legacy Expo / React Native app (optional)
├── packages/
│   └── shared/           # Shared API client, roles, utils
├── docker-compose.yml    # mongo + api + web
├── docs/                 # This documentation, MOBILE.md
├── ARCHITECTURE.md       # High-level architecture notes
└── MOBILE_DEPLOYMENT.md  # EAS / store deployment (legacy Expo path)
```

### 3.2 Request flow (authenticated API)

1. Client stores JWT in `localStorage` (web) or `expo-secure-store` (mobile).
2. Requests include `Authorization: Bearer <token>`.
3. On `401`, web client attempts refresh via `POST /api/auth/refresh` using stored refresh token.
4. School-role PDF list/get/download enforce **assigned categories** and **approved + active** PDFs only.

### 3.3 Real-time notifications

- WebSocket: `GET /api/notifications/ws?token=<jwt>`
- Server pushes `notification:create` events for in-app messages.
- Nginx proxies WebSocket upgrade for `/api/notifications/ws`.

### 3.4 PDF file access model

- **Default:** PDFs are **not** served via public static URLs.
- Access path: `GET /api/pdfs/{id}/download` with JWT + category checks.
- Set `ENABLE_PUBLIC_UPLOADS=true` only for debugging (not recommended in production).

---

## 4. Technology stack

| Layer | Technologies |
|-------|----------------|
| API | Node.js 22, Fastify 5, Mongoose 8, Zod, fastify-jwt, bcryptjs |
| Database | MongoDB 8 |
| Web | React 18, Vite, Tailwind, shadcn/ui, React Router |
| Mobile | Expo SDK ~54, Expo Router, NativeWind, SecureStore |
| Shared | Plain JS modules (`@eduportal/shared`) |
| Containers | Docker Compose, Nginx (web), Node runtime (API) |

---

## 5. Repository structure

### 5.1 Backend (`apps/api-node`)

| Path | Purpose |
|------|---------|
| `src/server.ts` | Runtime bootstrap, DB connect, graceful shutdown |
| `src/app.ts` | Fastify app factory, plugins, route registration |
| `src/config/env.ts` | Environment-driven settings |
| `src/db/mongo.ts` | MongoDB connection + default admin bootstrap |
| `src/models/` | Mongoose schemas and indexes |
| `src/routes/` | HTTP route handlers (`/api/*`) |
| `src/services/realtime.ts` | WebSocket notification broadcast manager |
| `tests/integration.test.ts` | Vitest integration tests (auth, programs, PDF flow) |
| `Dockerfile` | Multi-stage Node build/runtime image |

### FRD feature coverage (Node API)

| FRD area | Status |
|----------|--------|
| Granular permissions (`school.manage`, `pdf.view`, etc.) | Implemented in `apps/api-node/src/lib/permissions.ts` |
| Account lockout + single session | `apps/api-node/src/routes/auth.ts` |
| Category/PDF auto codes (`OLY-OBJ-001`) | `apps/api-node/src/lib/codes.ts` |
| Category school ACL + audit on deny | `schoolCategories.ts`, `pdfs.ts`, `lib/audit.ts` |
| PDF soft delete/restore | `POST /api/pdfs/:id/restore`, `DELETE` archives |
| Bookmarks | `GET/POST /api/favorites`, `DELETE /api/favorites/:pdf_id` |
| Tenant-scoped search | `GET /api/search?q=` |
| Maintenance (public status + API gate) | `maintenanceMode` + `plugins/maintenance.ts` |
| Print/download audit + watermark headers | PDF stream routes + viewer overlay |
| Enhanced dashboards | `/api/dashboard`, `/api/analytics/school` |

### 5.2 Web (`apps/web`)

| Path | Purpose |
|------|---------|
| `src/App.jsx` | Routes, maintenance mode gate |
| `src/lib/apiClient.js` | Auth store, fetch wrapper, automatic token refresh |
| `src/contexts/AuthContext.jsx` | Session state |
| `src/pages/` | Admin, school, public pages |
| `src/native/` | Capacitor bootstrap + cross-platform native bridge |
| `nginx.conf` | SPA + API/WebSocket/upload proxy (production image) |

### 5.3 Shared (`packages/shared`)

| Module | Purpose |
|--------|---------|
| `api/client.js` | Base `apiFetch` with token + auto-refresh on 401 |
| `api/auth.js` | Login, logout, forgot/reset, verify |
| `api/notifications.js` | List, mark read, admin broadcast |
| `constants/roles.js` | Role helpers |

---

## 6. Data model

### 6.1 Core entities

| Table / model | Key fields | Notes |
|---------------|------------|-------|
| `users` | `email`, `role`, `school_id`, `verified`, `locked_until` | Tenant via `school_id` |
| `schools` | `school_name`, `school_id` (SCH-XXXXXX), `is_active` | Tenant root |
| `programs` | `program_code`, `program_name`, `slug`, `status` | Top-level curriculum |
| `categories` | `program_id`, `category_code`, `category_name`, `slug` | Belongs to program |
| `sub_categories` | `category_id`, `sub_category_name` | Optional |
| `pdfs` | `category_id`, `sub_category_id`, `status`, `file_path` | Versioned via `pdf_versions` |
| `school_category_access` | `school_id`, `category_id` | ACL junction |
| `notifications` | `recipient_id`, `notification_method`, `status`, `read` | Per-channel delivery rows |
| `auth_tokens` | `token_hash`, `token_type`, `expires_at` | refresh, password_reset, email_verification |
| `system_settings` | SMTP, `integrations` (JSON, includes WhatsApp) | Single-row config typical |
| `maintenance_mode` | `is_enabled`, `message` | Blocks non-platform users |
| `audit_logs`, `download_logs`, `analytics_events` | Compliance & analytics |

### 6.2 Category ID format

When a category is created with a linked program, the API auto-generates:

`{PROGRAM_CODE}-{SEGMENT}-{NNN}` — e.g. `OLY-OBJ-001`, `COMP-NEET-002`.

### 6.3 Notification delivery records

Each send attempt creates one `notifications` row per **recipient × channel**:

- `notification_method`: `in_app` | `email` | `whatsapp`
- `status`: `sent` | `failed` | `pending`

In-app inbox queries filter `notification_method = 'in_app'`.

---

## 7. Authentication and authorization

### 7.1 Login flow

1. `POST /api/auth/login` with `{ email, password }`
2. Returns `{ token, refreshToken, record }`
3. Failed attempts increment `login_attempts`; lockout after 5 failures for 15 minutes
4. Non-admin users with `verified=false` are rejected at login
5. New login revokes previous refresh tokens (single active refresh session per user)

### 7.2 Token lifecycle

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/refresh` | Rotate access + refresh tokens |
| `POST /api/auth/logout` | Revoke refresh token(s) |
| `POST /api/auth/forgot-password` | Issue password-reset token (email if configured) |
| `POST /api/auth/reset-password` | Set new password |
| `POST /api/auth/send-verification` | Issue verification token |
| `POST /api/auth/verify-email` | Mark user verified |

### 7.3 Role guards (API)

| Guard | Roles |
|-------|-------|
| `require_admin` | `admin`, `platform_admin` |
| `require_admin_or_moderator` | + `moderator` |
| `require_school` | school roles + platform admins |

School users may only `GET /api/schools/{id}/categories` for **their own** `school_id`.

### 7.4 PDF access (school roles)

For `school`, `school_admin`, `school_viewer`, `teacher`:

- List/get/download only PDFs in categories assigned to the user's school
- Only `status=approved` and `is_active=true`

---

## 8. API reference

Base URL: `/api`
Health: `GET /api/health` → `{ "status": "ok", "uptime": <seconds> }`
Readiness: `GET /api/ready` → `{ "status": "ok", "mongo": "connected" }` (503 if Mongo is unreachable)

### 8.1 Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | Public | Login |
| POST | `/refresh` | Public | Refresh tokens |
| POST | `/logout` | User | Logout |
| GET/PATCH | `/me` | User | Profile |
| POST | `/change-password` | User | Change password |
| POST | `/forgot-password` | Public | Request reset |
| POST | `/reset-password` | Public | Reset with token |
| POST | `/send-verification` | Public | Send verify email |
| POST | `/verify-email` | Public | Verify account |

### 8.2 Programs (`/api/programs`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | User | List programs |
| POST | `/` | Admin | Create program |
| PATCH | `/{id}` | Admin | Update |
| DELETE | `/{id}` | Admin | Delete |

### 8.3 Categories (`/api/categories`, `/api/subCategories`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/categories` | Mixed | Category CRUD; delete supports `archive`, `reassignTo`, `force` |
| GET/POST/PATCH/DELETE | `/subCategories` | Mixed | Subcategory CRUD |

### 8.4 Schools & category access

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/schools` | Admin / User | School management |
| GET/POST/DELETE | `/schools/{id}/categories` | Admin or own school | Category assignments |
| POST | `/schools/bulk` | Admin | Bulk school create |

### 8.5 PDFs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pdfs` | User | List (filtered for schools) |
| GET | `/pdfs/{id}` | User | Metadata + view tracking |
| GET | `/pdfs/{id}/download` | User | File download |
| POST/PATCH/DELETE | `/pdfs` | Admin / User | Upload & manage |

### 8.6 Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | User | In-app inbox |
| POST | `/notifications` | User/Admin | Create (admin can target others) |
| POST | `/notifications/admin/send` | Admin | **Broadcast** (see §11) |
| PATCH/DELETE | `/notifications/{id}` | User | Read/delete |
| WS | `/notifications/ws?token=` | User | Real-time push |

### 8.7 System settings (`/api`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/PATCH | `/maintenanceMode` | Public / Admin | Maintenance toggle |
| GET/PATCH | `/systemSettings` | Admin | App + SMTP + integrations |
| POST | `/systemSettings/{id}/test-email` | Admin | Test SMTP |
| POST | `/systemSettings/{id}/test-whatsapp` | Admin | Test WhatsApp |
| GET/PATCH | `/userPreferences` | User | Per-user prefs |

### 8.8 Other routers

- `/api/users` — user CRUD, password reset by admin  
- `/api/onboardingRequests`, `/api/userRequests` — guest/school onboarding  
- `/api/analytics` — dashboard metrics  
- `/api/auditLogs`, `/api/downloadLogs` — audit  
- `/api/pdfVersions` — PDF versioning  
- `/api/bulk` — bulk operations  

---

## 9. Web application

### 9.1 Running locally

```bash
# From repo root
npm install
docker compose up -d          # API + DB
npm run dev:web               # Vite on http://localhost:3000
```

Vite proxies `/api` and `/uploads` to `http://localhost:8000`.

### 9.2 Route map

**Public**

| Path | Page |
|------|------|
| `/` | Home |
| `/login` | Login |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password |
| `/verify-email` | Email verification |
| `/signup` | Guest onboarding request |

**Admin** (`/admin/*`) — roles: `admin`, `platform_admin`, `platform_viewer`, `moderator`

| Path | Feature |
|------|---------|
| `/admin` | Dashboard |
| `/admin/schools`, `/admin/schools-and-users` | Schools |
| `/admin/users` | Users |
| `/admin/programs` | Programs |
| `/admin/categories-management` | Categories & subcategories |
| `/admin/pdf-upload`, `/admin/content-dashboard` | PDFs |
| `/admin/broadcast` | **Bulk notifications** |
| `/admin/notifications` | Notification inbox |
| `/admin/settings` | System settings (email, WhatsApp, security) |
| `/admin/audit-logs` | Audit |
| `/admin/analytics` | Analytics |

**School** (`/school/*`) — roles: `school`, `school_admin`, `school_viewer`, `teacher`

| Path | Feature |
|------|---------|
| `/school/dashboard` | School dashboard |
| `/school/portal` | PDF library |
| `/school/user-requests` | User requests |
| `/school/settings` | Settings |
| `/school/analytics` | Analytics |

### 9.3 Maintenance mode

- Fetched from `GET /api/maintenanceMode` on load.
- When enabled, non-platform users see maintenance page (login still allowed).
- Platform roles bypass maintenance screen.

---

## 10. Mobile application

### 10.1 Stack

- **Expo Router** file-based routing
- **NativeWind** (Tailwind-style classes)
- **@eduportal/shared** for API calls
- **SecureStore** for `auth_token`, `auth_refresh_token`, `auth_user`

### 10.2 Route groups

| Group | Screens |
|-------|---------|
| `(auth)/login` | School/Teacher login (segmented UI) |
| `(admin)/*` | Dashboard, schools, users, PDFs, categories, profile |
| `(school)/*` | Dashboard, portal, requests, analytics, profile, notifications |

### 10.3 API URL configuration

In `app.json`:

```json
"extra": {
  "apiUrl": "http://localhost:8000"
}
```

| Environment | Typical URL |
|-------------|-------------|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical device | Host machine LAN IP, e.g. `http://192.168.1.x:8000` |
| Production | `https://api.yourdomain.com` |

### 10.4 Production builds

See **[MOBILE_DEPLOYMENT.md](../MOBILE_DEPLOYMENT.md)** for EAS Build, Play Store, and App Store steps.

```bash
cd apps/mobile
npm install
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

---

## 11. Notifications and alerts

### 11.1 Configuration (Admin → System Settings)

**Email (SMTP tab)**

- Stored in `system_settings`: `smtpHost`, `smtpPort`, `smtpUsername`, `smtpPassword`, `emailFromAddress`, etc.
- Alternative: Builder Mailer API via env vars on API container.
- Test: `POST /api/systemSettings/{id}/test-email` with `{ "to": "email@example.com" }`

**WhatsApp (WhatsApp tab)**

- Stored in `system_settings.integrations.whatsapp`:
  - `enabled`, `provider` (`twilio` | `custom` | `meta` | `wati`)
  - Provider-specific credentials (`accountSid`, `authToken`, `fromNumber`, `apiUrl`, `apiKey`)
- Test: `POST /api/systemSettings/{id}/test-whatsapp` with `{ "to": "+91..." }`

### 11.2 Admin broadcast

**UI:** Admin → **Broadcast** (`/admin/broadcast`)

**API:** `POST /api/notifications/admin/send`

**Request body example:**

```json
{
  "subject": "Holiday notice",
  "message": "Portal will be read-only on Sunday.",
  "type": "bulk_announcement",
  "channels": ["in_app", "email", "whatsapp"],
  "targetMode": "all_schools",
  "schoolIds": []
}
```

**targetMode values:**

| Value | Recipients |
|-------|------------|
| `all_schools` | All active users with school roles |
| `selected_schools` | Users in `schoolIds` |
| `selected_users` | Explicit `userIds` (optional) |

**Response:**

```json
{
  "totalRecipients": 42,
  "created": 84,
  "sent": 80,
  "failed": 4,
  "errors": [{ "recipientId": "...", "channel": "whatsapp", "error": "..." }]
}
```

### 11.3 In-app delivery

- Rows with `notification_method=in_app` appear in web/mobile notification centers.
- WebSocket pushes updates when user is connected.
- Users mark read via `PATCH /api/notifications/{id}` with `{ "read": true }`.

---

## 12. Local development

### 12.1 Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+
- Git

### 12.2 Quick start (full stack)

```bash
git clone <repository-url>
cd pdf-portal

# Start database + API + web (production-like)
docker compose up -d --build

# Web dev with hot reload (recommended for UI work)
npm install
npm run dev:web
```

| Service | URL |
|---------|-----|
| Web (dev) | http://localhost:3000 |
| Web (Docker) | http://localhost |
| API | http://localhost:8000 |
| API health | http://localhost:8000/api/health |
| API readiness | http://localhost:8000/api/ready |
| MongoDB | `mongo:27017` (only inside the compose network) |

### 12.3 API container startup sequence

The Fastify entrypoint (`apps/api-node/src/server.ts`) runs:

1. Load env (`src/config/env.ts`)
2. Connect to MongoDB (`src/db/mongo.ts`)
3. Seed the default platform admin if the `users` collection is empty
4. Register Fastify plugins and routes (`src/app.ts`)
5. Start listening on `HOST:PORT` (defaults `0.0.0.0:8000`)

### 12.4 Running tests

```bash
cd apps/api-node
npm test                  # vitest integration suite against an in-memory MongoDB
```

Key suites (`apps/api-node/tests/`):

- `integration.test.ts` — auth, programs, categories, PDF upload + access ACL
- `personas.test.ts`    — admin + school persona end-to-end flows, bulk download, audit/export, dashboards

### 12.5 Mobile local dev

**Capacitor (current path)** — see [./MOBILE.md](./MOBILE.md):

```bash
docker compose up -d mongo api     # backend + DB only
cd apps/web
npm run dev                         # Vite on :3000
# In another terminal — point Capacitor at the dev server
$env:CAP_SERVER_URL="http://<LAN-ip>:3000"
npm run mobile:run:android
```

**Legacy Expo path** (optional, kept under `apps/mobile`):

```bash
docker compose up -d mongo api
cd apps/mobile
npx expo start
```

---

## 13. Deployment

### 13.1 Docker Compose (single-server)

Default `docker-compose.yml` defines three services:

| Service | Image build | Ports | Volumes |
|---------|-------------|-------|---------|
| `mongo` | `mongo:8` | 27017 (internal, healthchecked) | `mongo_data` |
| `api`   | `apps/api-node/Dockerfile` | 8000 | `uploads_data` → `/data/uploads` |
| `web`   | `apps/web/Dockerfile` (Nginx) | 80 | — |

**Deploy steps:**

```bash
# On server
git clone <repo> && cd pdf-portal

# Create production .env (see §14)
cp .env.example .env   # if you add one; otherwise export vars

docker compose up -d --build
docker compose ps
curl http://localhost/                       # web
curl http://localhost:8000/api/health        # api liveness
curl http://localhost:8000/api/ready         # api readiness (also checks Mongo)
```

### 13.2 Production web image behavior

- Nginx serves static files from Vite build.
- Proxies `/api/` → `http://api:8000`
- Proxies WebSocket `/api/notifications/ws`
- SPA fallback to `index.html` for client routes.

### 13.3 TLS / reverse proxy (recommended)

Place **Caddy**, **Traefik**, or **host Nginx** in front of the Compose stack:

- Terminate HTTPS on 443
- Proxy to `web:80`
- Set `ALLOWED_ORIGINS` on API to your web origin(s)
- Do not expose MongoDB port publicly

### 13.4 Horizontal scaling notes

| Component | Scale strategy |
|-----------|----------------|
| API | Run multiple Fastify containers behind a load balancer; use `node --cluster` or a process manager (PM2) for vertical scaling. Sticky sessions required for WebSocket. |
| MongoDB | Managed Atlas / replica set; tune connection pool via `MONGODB_URI` options (e.g. `maxPoolSize=50`). |
| Uploads | Shared volume (NFS/S3 migration recommended at scale). |
| Web | Stateless; CDN for static assets. |

**WebSocket:** Use sticky sessions or a shared pub/sub layer (Redis) if running multiple API instances (not included in default compose).

### 13.5 Database migrations

Mongoose models are validated on read/write; schema "migrations" are change scripts rather than DDL. For production evolution:

1. Add a `migrations/` folder under `apps/api-node/` and run scripts manually or via a tool like `migrate-mongo`.
2. Disable auto-seed in production by setting `SEED_DEFAULT_ADMIN=false`.
3. Always back up MongoDB before structural changes (`mongodump`).

---

## 14. Production configuration

### 14.1 API environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://mongo:27017/iiconacademy` | MongoDB connection string |
| `DB_NAME` | `iiconacademy` | Mongo database name |
| `SECRET_KEY` | *(must change)* | JWT signing secret — use 32+ random bytes |
| `UPLOAD_DIR` | `/data/uploads` | PDF storage path |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Access token TTL (24h) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token TTL |
| `ALLOWED_ORIGINS` | `*` | Comma-separated origins or `*` |
| `ENABLE_PUBLIC_UPLOADS` | unset/false | **Keep false in production** |
| `HOST` | `0.0.0.0` | Fastify bind host |
| `PORT` | `8000` | Fastify bind port |
| `SEED_DEFAULT_ADMIN` | `true` | Disable in production after first boot |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | — | Email delivery |
| `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` | — | From address |
| `BUILDER_MAILER_*` | — | Optional transactional-email API alternative |

### 14.2 Example production `.env` (API service)

```env
SECRET_KEY=<generate-with-openssl-rand-hex-32>
MONGODB_URI=mongodb://pdfuser:STRONG_PASSWORD@mongo:27017/iiconacademy?authSource=admin
DB_NAME=iiconacademy
ALLOWED_ORIGINS=https://edu.yourdomain.com,https://www.edu.yourdomain.com
HOST=0.0.0.0
PORT=8000
SEED_DEFAULT_ADMIN=false
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=I-ICON EduShare
```

### 14.3 Post-deploy verification

```bash
# Health
curl -sf https://api.yourdomain.com/api/health
curl -sf https://api.yourdomain.com/api/ready

# Login
curl -s -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iiconacademy.com","password":"Admin@1234"}'

# Change default passwords immediately after first login
```

---

## 15. Operations

### 15.1 Routine tasks

| Task | Frequency | Action |
|------|-----------|--------|
| DB backup | Daily | `mongodump` of the `iiconacademy` database |
| Upload backup | Daily | Snapshot `uploads_data` volume or sync to object storage |
| Log review | Daily | API container logs, failed notification rows |
| Secret rotation | Quarterly | `SECRET_KEY`, SMTP, WhatsApp credentials |
| Dependency updates | Monthly | Rebuild images, run tests |
| Disk usage | Weekly | Monitor `/data/uploads` and Mongo volume growth |

### 15.2 Backups

**MongoDB:**

```bash
docker compose exec mongo sh -c 'mongodump --db iiconacademy --archive' \
  > backup_$(date +%Y%m%d).archive
```

Restore:

```bash
cat backup_YYYYMMDD.archive \
  | docker compose exec -T mongo mongorestore --drop --archive
```

**Uploads:**

```bash
docker run --rm -v pdf-portal_uploads_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

### 15.3 Monitoring

| Signal | Endpoint / source |
|--------|---------------------|
| API liveness | `GET /api/health` |
| API readiness (includes Mongo) | `GET /api/ready` |
| Container health | `docker compose ps` |
| DB connections | `db.serverStatus().connections` in `mongosh` |
| Failed notifications | Query `notifications` where `status='failed'` |
| Auth lockouts | `users.locked_until`, audit logs |

### 15.4 Maintenance mode

1. Admin → System Settings → enable maintenance **or** `PATCH /api/maintenanceMode/{id}` with `{ "isEnabled": true, "message": "..." }`.
2. Platform admins can still log in; school users see maintenance page.
3. Disable after work complete.

### 15.5 Logs

```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f mongo
```

### 15.6 Upgrades (zero-downtime goal)

1. `git pull`
2. `docker compose build api web`
3. Run a Mongo backup (see §15.2)
4. `docker compose up -d`
5. Verify `/api/health` + `/api/ready` and smoke-test login + PDF download + broadcast to one school

### 15.7 Capacity planning (1,000 concurrent users)

For ~1,000 concurrent connections in a single-host deploy:

- Run Fastify behind a process manager (PM2 / `node --cluster` / multiple Docker replicas) — one process per CPU core.
- Increase MongoDB connection pool via the URI: `mongodb://…/iiconacademy?maxPoolSize=50&minPoolSize=10`.

**Recommendations before claiming production SLA:**

1. Load-test with k6 or Artillery (login, list PDFs, download, notifications).
2. Move uploads to object storage (S3-compatible) for I/O offload.
3. Use managed MongoDB Atlas (replica set) for HA and read replicas.
4. Put CDN + WAF in front of web/API.
5. Monitor p95 latency and Mongo connection saturation.

---

## 16. Security checklist

Production go-live minimum:

- [ ] Change `SECRET_KEY` from default
- [ ] Change all seed user passwords
- [ ] `ENABLE_PUBLIC_UPLOADS` **not** enabled
- [ ] `ALLOWED_ORIGINS` restricted to real domains
- [ ] HTTPS everywhere
- [ ] MongoDB not exposed to internet (use auth + IP allowlist or private network)
- [ ] SMTP/WhatsApp credentials in secrets manager, not git
- [ ] Regular backups tested (restore drill)
- [ ] Admin accounts use strong passwords + MFA on email provider
- [ ] Review `audit_logs` and `download_logs` retention policy
- [ ] `SEED_DEFAULT_ADMIN=false` set after first boot

---

## 17. Troubleshooting

### API won't start

```bash
docker compose logs api
# Common: Mongo not ready — wait for the healthcheck; verify MONGODB_URI
```

### Web shows login but API 401

- Check Vite proxy / Nginx `location /api/`
- Verify token in browser DevTools → Application → localStorage
- Confirm `SECRET_KEY` unchanged between restarts (invalidates tokens)

### School user sees no PDFs

1. Confirm categories assigned: `GET /api/schools/{schoolId}/categories`
2. PDFs must be `status=approved` and `is_active=true`
3. User `school_id` must match school

### Email/WhatsApp test fails

- Save System Settings first (record `id` required)
- Check API logs for SMTP/WhatsApp provider errors
- For dev without SMTP, forgot-password returns `debugToken` in response body

### Mobile cannot connect

- Use correct `apiUrl` for emulator/device (see §10.3)
- Ensure API binds `0.0.0.0:8000` and firewall allows LAN access

### WebSocket notifications not live

- Confirm Nginx `proxy_set_header Upgrade` for `/api/notifications/ws`
- Use `wss://` when site is HTTPS
- Token must be passed as query param on WS URL

---

## Appendix: default seed data

When the `users` collection is empty (typically after a fresh `docker compose up`), the Fastify boot routine ensures a default platform admin exists. Additional sample schools / users can be seeded from the admin UI or scripted via the API.

| Email | Password | Role |
|-------|----------|------|
| admin@iiconacademy.com | Admin@1234 | platform_admin |

**Change this credential immediately in any shared or production environment.**

---

## Related documents

| Document | Location |
|----------|----------|
| Architecture overview      | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Mobile (Capacitor) build   | [./MOBILE.md](./MOBILE.md) |
| Mobile (Expo) deployment   | [../MOBILE_DEPLOYMENT.md](../MOBILE_DEPLOYMENT.md) |
| Run / fix local Docker stack | [../START_HERE.md](../START_HERE.md), [../FIX_SITE_CANT_BE_REACHED.md](../FIX_SITE_CANT_BE_REACHED.md) |

---

*For questions or changes to this document, update it alongside code changes in the same pull request.*
