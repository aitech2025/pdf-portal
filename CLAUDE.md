# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**i-icon Academy** is a full-stack EduTech platform built as a monorepo using pnpm workspaces. It enables schools to access curated educational content (PDFs, videos, lessons) with granular role-based access control and comprehensive analytics.

### Tech Stack
- **API**: Fastify 5.6.1 with TypeScript, Mongoose 8.19.3 (MongoDB)
- **Web**: React 18.3.1, Vite 7.3.1, Tailwind CSS 3.4.17, Radix UI components
- **Auth**: JWT (Fastify-JWT 10.0.0), bcryptjs password hashing
- **Notifications**: Email (Nodemailer 8.0.7), WhatsApp, in-app
- **Mobile**: Capacitor 6.2.1 (iOS/Android)

### Key Features
- Multi-tenant school onboarding with program/class/subject hierarchies
- PDF content management with versioning, watermarking, bulk downloads
- Video lesson integration (Vimeo)
- Granular access control (Program → Class → Subject chains)
- Real-time notifications (WebSocket-based)
- Audit logging for all administrative actions
- Download/view analytics by school and user
- Bulk user and school creation
- Maintenance mode with super-admin bypass

## Directory Structure

`
pdf-portal/
├── apps/
│   ├── api-node/          # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/    # API endpoints (22 route files)
│   │   │   ├── models/    # Mongoose schemas (17 models)
│   │   │   ├── plugins/   # Fastify plugins (auth, jwt)
│   │   │   ├── lib/       # Utilities (permissions, auth, serialization)
│   │   │   ├── services/  # Business logic (notifications, realtime)
│   │   │   ├── config/    # Environment configuration
│   │   │   └── server.ts  # Entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── web/               # React SPA frontend
│   │   ├── src/
│   │   │   ├── pages/     # Route-level components (admin, school, auth)
│   │   │   ├── components/# Reusable UI components
│   │   │   ├── contexts/  # React Context (AuthContext)
│   │   │   ├── lib/       # Utilities (apiClient, permissions)
│   │   │   └── App.jsx    # Route definitions
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── Dockerfile
│   └── mobile/            # Capacitor mobile wrapper
├── packages/shared/       # Shared TypeScript types
└── package.json          # Root monorepo config
`

## Build, Test, and Development Commands

### Backend (apps/api-node)
- **Dev (watch mode)**: pnpm -F api-node dev
- **Build**: pnpm -F api-node build
- **Run**: pnpm -F api-node start
- **Test**: pnpm -F api-node test
- **Test (watch)**: pnpm -F api-node test --watch

### Frontend (apps/web)
- **Dev server (port 3000)**: pnpm -F web dev
- **Build**: pnpm -F web build
- **Preview**: pnpm -F web start
- **Lint**: pnpm -F web lint
- **Lint warnings**: pnpm -F web lint:warn

### Mobile (with Capacitor)
- **Add platform**: pnpm -F web mobile:add:android or mobile:add:ios
- **Run**: pnpm -F web mobile:run:android or mobile:run:ios
- **Dev with live reload**: pnpm -F web mobile:dev:android

### Monorepo
- **Install all**: pnpm install
- **List workspaces**: pnpm --list

## Architecture Decisions

### Multi-Tenant Access Control
Three-tier hierarchy for content:
1. **Program** (Category) — top-level (CBSE, IB, State Board, etc.)
2. **Class** (SubCategory) — grade/year within program
3. **Subject** — specific subject within class

Schools are granted access via three parallel models:
- **SchoolCategoryAccess** — program-level (all content under program)
- **SchoolClassAccess** — class-level (specific class within program, legacy)
- **SchoolSubjectAccess** — subject-level (program + class + subject, new/granular)

When school users request PDFs in GET /api/pdfs, filters apply: category_id must match one of their granted programs, and class_id/subject_id must match their grants (or PDFs can be legacy program-only without specific class).

### Role-Based Permissions
All permissions defined in pps/api-node/src/lib/permissions.ts:
- **SUPER_ADMIN_ROLES** (platform_admin, admin, super_admin): all permissions
- **SCHOOL_ADMIN_ROLES** (school_admin, school)
- **SCHOOL_USER_ROLES** (school_viewer, teacher)
- **PLATFORM_ROLES**: super admins + moderator, platform_viewer

Use equirePermission(PERMISSIONS.PDF_VIEW) middleware to guard routes. Each role maps to static permission set via ROLE_PERMISSIONS object.

### Master Data + Instance Data Split
- **Master Tables**: ClassMaster, SubjectMaster (global reference)
- **Assignment Tables**: SchoolClassAccess, SchoolSubjectAccess (per-school)
- **Legacy**: Old Subject model still used for backward compatibility

### PDF Versioning
- PdfVersion stores historical file data
- Pdf.current_version + Pdf.version_count track state
- New version upload auto-clears old is_current flags, marks new as is_current
- Watermark headers injected on download/preview (X-Watermark-User, X-Watermark-School)

### Notification Channels
Single createAndSendNotification() function fans out to:
- **Email** via Nodemailer (SMTP in SystemSettings)
- **WhatsApp** (configuration validated)
- **In-App** (stored in Notification model, WebSocket push)

### Authentication Flow
1. User: POST /api/auth/login (email + password)
2. Backend: verify, issue access JWT + refresh token (hashed, stored in AuthToken)
3. Frontend: store both in localStorage (AuthStore in apiClient.js)
4. Protected routes: preHandler: requireAuth verifies JWT
5. Token refresh: POST /api/auth/refresh (refresh token → new access token)

Forgot-password sends temporary token (60 min expiry), verified before password reset.

### Audit Logging
writeAudit() logs all admin actions: user_id, action, action_details, resource_type, resource_id, ip_address, timestamp. CSV export via GET /api/auditLogs/export.

### Analytics
Dashboard aggregates: user count, school count, PDF count, pending onboarding, active sessions, storage usage (total + per-school), top downloads, recent PDFs, school-specific stats.

## API Routes (22 Modules, 100+ Endpoints)

### Core Endpoints
**Auth** (/api/auth/*)
- POST /api/auth/login, /refresh, /forgot-password, /reset-password
- POST /api/auth/verify-email, /send-verification, /change-password, /logout
- GET /api/auth/me, PATCH /api/auth/me (profile update)

**Users** (/api/users/*)
- GET /api/users (list, search, filter), GET /api/users/:user_id
- POST /api/users, PATCH /api/users/:user_id, DELETE /api/users/:user_id
- POST /api/users/:user_id/reset-password (admin reset)

**Schools** (/api/schools/*)
- GET /api/schools, GET /api/schools/:school_id
- POST /api/schools, PATCH /api/schools/:school_id, DELETE /api/schools/:school_id
- POST /api/schools/bulk, GET /api/schools/:school_id/stats
- POST /api/schools/:school_id/toggle-users

**Programs & Categories** (/api/programs/*, /api/categories*)
- GET /api/programs, POST/PATCH/DELETE /api/programs/:program_id
- GET /api/categories (enriched with counts), GET /api/categories/:cat_id/pdfs
- POST/PATCH/DELETE /api/categories/:cat_id
- GET/POST /api/subCategories, PATCH/DELETE /api/subCategories/:sub_id

**Program Structure** (/api/programs/:program_id/*)
- GET /structure (full hierarchy), GET /classes, POST /classes (assign), DELETE /classes/:class_id
- GET /classes/:class_id/subjects, POST /classes/:class_id/subjects, DELETE /classes/:class_id/subjects/:subject_id
- PUT /structure (replace all)

**Classes & Subjects**
- GET/POST /api/masterClasses, PATCH/DELETE /api/masterClasses/:class_id
- GET/POST /api/masterSubjects, PATCH/DELETE /api/masterSubjects/:subject_id
- GET/POST /api/subjects (per-class, legacy), PATCH/DELETE /api/subjects/:subject_id

**PDFs** (/api/pdfs/*)
- GET /api/pdfs (school-filtered), GET /api/pdfs/:pdf_id
- GET /api/pdfs/:pdf_id/preview (stream + view log), GET /api/pdfs/:pdf_id/download (stream + download log)
- POST /api/pdfs/:pdf_id/print, POST /api/pdfs/bulk-download (ZIP up to 200)

**PDF Versions** (/api/pdfVersions/*)
- GET /api/pdfVersions, GET /api/pdfVersions/:version_id/download
- POST /api/pdfVersions (upload new version), PATCH/DELETE /api/pdfVersions/:version_id

**Video Lessons** (/api/videoLessons/*)
- GET /api/videoLessons (school-filtered), GET /api/videoLessons/admin (all)
- POST/PATCH/DELETE /api/videoLessons/:lesson_id (platform admin only)
- GET /api/programs/:program_id/videos, POST /api/programs/:program_id/videos (assign)
- DELETE /api/programs/:program_id/videos/:video_id (unassign)
- POST /api/videoLessons/:lesson_id/view (increment), POST /api/videoLessons/:lesson_id/download

**Notifications** (/api/notifications*)
- GET /api/notifications (user's), POST /api/notifications (create in-app)
- POST /api/notifications/admin/send (bulk email/whatsapp/in-app)
- PATCH /api/notifications/:notif_id (mark read), DELETE /api/notifications/:notif_id

**School Access** (/api/schools/:school_id/*)
- GET /categories, POST /categories (assign), DELETE /categories/:category_id
- GET /classes, POST /classes (assign), DELETE /classes/:class_id
- GET /subjects, POST /subjects (assign), DELETE /subjects/:subject_id

**Search & Favorites** (/api/search, /api/favorites*)
- GET /api/search (full-text, school-filtered)
- GET /api/favorites, POST /api/favorites, DELETE /api/favorites/:pdf_id

**Analytics** (/api/analytics/*, /api/dashboard)
- GET /api/dashboard (high-level stats)
- GET /api/analytics/overview (event aggregations)
- GET /api/analytics/school (per-school stats)

**Audit & Logs** (/api/auditLogs*, /api/downloadLogs)
- GET /api/auditLogs (paginated, filterable), GET /api/auditLogs/export (CSV)
- GET /api/downloadLogs (per-school/user)

**Onboarding & Requests** (/api/onboardingRequests*, /api/userRequests*)
- GET /api/onboardingRequests, POST /api/onboardingRequests
- PATCH /api/onboardingRequests/:req_id (approve creates school + admin)
- GET/POST/PATCH /api/userRequests

**Bulk & System** (/api/bulk/*, /api/systemSettings*, /api/maintenanceMode*)
- POST /api/bulk/users (bulk create)
- GET /api/systemSettings, PATCH /api/systemSettings/:ss_id
- POST /api/systemSettings/:ss_id/test-email, /test-whatsapp
- GET /api/maintenanceMode (public), PATCH /api/maintenanceMode/:mm_id
- GET /api/userPreferences, PATCH /api/userPreferences/:pref_id

## Frontend Architecture

### Routes (App.jsx)
**Public**: /, /login, /forgot-password, /reset-password, /signup, /verify-email, /maintenance
**Protected**:
- /admin/* — Dashboard, Analytics, Schools, Users, Programs, Classes, Subjects, Videos, PDFs, Audit, Settings
- /school/* — Dashboard, Browse, Videos, Bookmarks, Analytics, User Requests, Settings
- /notifications, /profile, /search, /settings, /help

### Authentication (AuthContext.jsx)
- useAuth() hook provides: currentUser, isAuthenticated, isPlatform, isSchool, canWrite, login(), logout()
- AuthStore persists JWT + refresh in localStorage
- Auto-syncs on login/logout

### API Client (apiClient.js)
Custom REST client (not PocketBase):
- AuthStore manages JWT in localStorage
- apiFetch(path, method, body, params, token) core helper
- Auto-includes Authorization header
- Handles JSON + FormData

### Sidebar & Navigation (Sidebar.jsx)
Platform admins see: Dashboard, Analytics, Schools, Users, Programs, Classes, Subjects, Video Repository, Content Library, PDFs, Bulk Create, Broadcast, Audit Logs, Settings
School admins/viewers see: Dashboard, Content Library, Videos, Bookmarks, Messages, Analytics, Settings

### Vite Config
- **Proxy**: /api → http://localhost:8000, /uploads → http://localhost:8000
- **Alias**: @ → src/
- **Plugins**: React, inline editor, selection mode (dev only)
- **Build Output**: ../../dist/apps/web

### Component Library
Radix UI + Tailwind + shadcn/ui pattern. Uses react-hook-form + zod for validation. Framer Motion for animations, Recharts for dashboards, Lucide icons.

## Database Models (17 Total)

**User Management**: User, UserRequest, OnboardingRequest
**School & Tenancy**: School, SchoolCategoryAccess, SchoolClassAccess, SchoolSubjectAccess
**Content**: Program, Category, SubCategory, ClassMaster, SubjectMaster, ProgramClassMap, ProgramClassSubjectMap, Subject
**Content Files**: Pdf, PdfVersion, VideoLesson
**Logging**: ViewLog, DownloadLog, AuditLog, AnalyticsEvent
**System**: Notification, AuthToken, SystemSettings, UserPreferences, MaintenanceMode, Favorite

All models: unique string id, created/updated timestamps, no __v version key.

## Dependencies (Key Versions)

**Backend**: fastify 5.6.1, mongoose 8.19.3, bcryptjs 3.0.3, zod 4.1.12, nodemailer 8.0.7, archiver 7.0.1, typescript 5.9.3, vitest 4.0.8
**Frontend**: react 18.3.1, vite 7.3.1, tailwindcss 3.4.17, react-router-dom 7.13.0, zod 4.3.6, react-hook-form 7.71.2, pdfjs-dist 4.8.69, recharts 2.15.4, Radix UI suite 1.1.x–2.x

## Common Workflows

### New API Endpoint
1. Create route module in pps/api-node/src/routes/myFeature.ts
2. Export registerMyFeatureRoutes(app: FastifyInstance)
3. Use Zod for validation, serializeDoc() for responses, writeAudit() for actions
4. Import & register in routes/index.ts

### New Data Model
1. Define Mongoose Schema in models/index.ts
2. Add indexes for frequent queries
3. Use timestamps + versionKey: false options
4. Export via mongoose.model()

### New Frontend Page
1. Create in pages/ or pages/admin/
2. Use useAuth() for permissions
3. Use client.request() for API calls
4. Add route in App.jsx
5. Add nav item in Sidebar.jsx if needed

### Grant School Access
1. POST /api/schools/:school_id/categories (assign programs)
2. POST /api/schools/:school_id/classes (assign classes)
3. POST /api/schools/:school_id/subjects (assign subjects)

## Naming Conventions

- **DB Fields**: snake_case (email, user_id, is_active, created)
- **API**: Accept both snake_case and camelCase in requests
- **Routes**: /api/plural, /api/resource/:id/action, /api/bulk/type
- **Components**: PascalCase files (HomePage.jsx)
- **Permissions**: Strings in PERMISSIONS object, used with requirePermission() middleware

## Gotchas

1. **Platform vs. School Roles**: Platform roles never have school_id. Middleware auto-nulls it. Check isPlatformRole() before assuming school context.

2. **PDF Access**: Use canAccessCategory() utility before streaming. Three grant models = complex filtering logic.

3. **Legacy Compat**: Old Subject model exists. New structure: ClassMaster + SubjectMaster + ProgramClassSubjectMap. Code checks both.

4. **Refresh Tokens**: Hashed before storage. Always hash before comparing.

5. **Notifications**: Async fan-out. Email config must be valid in SystemSettings.

6. **Vite Dev**: Port 3000, proxies /api to http://localhost:8000. Update if backend elsewhere.

7. **Capacitor**: Mobile wrapper around web SPA. Native features need plugin calls in React.

8. **CSV Export**: Custom csvEscape() handles quotes + newlines. Max 50k rows per call.
