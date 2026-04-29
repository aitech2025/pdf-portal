# EduPortal — Monorepo Architecture

## Project Structure

```
eduportal/
├── apps/
│   ├── api/          # Python FastAPI backend
│   ├── web/          # React web app (Vite + Tailwind)
│   └── mobile/       # React Native (Expo) — iOS & Android
├── packages/
│   └── shared/       # Shared code: API client, types, constants
├── docker-compose.yml
└── package.json      # Workspace root
```

---

## Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Python 3.12, FastAPI, SQLAlchemy, PostgreSQL |
| Web      | React 18, Vite, Tailwind CSS, shadcn/ui |
| Mobile   | React Native, Expo SDK 51, NativeWind |
| Shared   | Plain JS/TS — API client, constants, utils |

---

## Shared Package (`packages/shared`)

Both web and mobile import from `@eduportal/shared`:

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

## Mobile App (`apps/mobile`)

Built with **Expo** (managed workflow) targeting iOS and Android from a single codebase.

```
apps/mobile/
├── app/                    # Expo Router file-based routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (admin)/
│   │   ├── index.tsx       # Admin dashboard
│   │   ├── schools.tsx
│   │   ├── users.tsx
│   │   └── _layout.tsx
│   ├── (school)/
│   │   ├── index.tsx       # School dashboard
│   │   ├── portal.tsx
│   │   └── _layout.tsx
│   └── _layout.tsx         # Root layout with auth context
├── components/
│   ├── ui/                 # NativeWind-styled primitives
│   ├── MetricCard.tsx
│   ├── PDFViewer.tsx
│   └── NotificationBell.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useNotifications.ts
├── context/
│   └── AuthContext.tsx
├── app.json                # Expo config
├── babel.config.js
├── tailwind.config.js      # NativeWind config
└── package.json
```

---

## How Web → Mobile Conversion Works

### 1. Shared API Layer
Both apps import the same API functions from `@eduportal/shared`. No duplication.

### 2. UI Components
Web uses Tailwind CSS + shadcn/ui (DOM).  
Mobile uses NativeWind (React Native StyleSheet from Tailwind classes) + custom native components.  
Business logic (hooks, state management) is identical.

### 3. Navigation
Web: React Router v7  
Mobile: Expo Router (file-based, same mental model)

### 4. Storage
Web: `localStorage` for JWT token  
Mobile: `expo-secure-store` for JWT token

### 5. PDF Viewing
Web: `react-pdf`  
Mobile: `expo-file-system` + `react-native-pdf`

### 6. Push Notifications
Mobile adds: `expo-notifications` for push notifications  
Web uses: WebSocket (already implemented)

---

## Running the Project

### Backend + Database
```bash
docker compose up -d
```

### Web App
```bash
npm run dev --prefix apps/web
```

### Mobile App
```bash
cd apps/mobile
npx expo start
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
# Scan QR with Expo Go app for physical device
```

### Build Mobile for Production
```bash
# Android APK/AAB
cd apps/mobile && npx eas build --platform android

# iOS IPA
cd apps/mobile && npx eas build --platform ios
```

---

## Environment Variables

```
# .env (root)
API_URL=http://localhost:8000   # web dev
API_URL=http://10.0.2.2:8000   # Android emulator
API_URL=http://localhost:8000   # iOS simulator
```

---

## Single Codebase Change Management

When you update an API endpoint:
1. Update `apps/api/app/routers/` (Python)
2. Update `packages/shared/src/api/` (JS client)
3. Both web and mobile automatically get the change

When you add a new feature:
1. Add API endpoint in `apps/api`
2. Add shared API function in `packages/shared`
3. Build UI in `apps/web` (React + Tailwind)
4. Build UI in `apps/mobile` (React Native + NativeWind)
5. Business logic hooks can often be shared directly
