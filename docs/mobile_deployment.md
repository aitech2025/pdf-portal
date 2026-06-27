# i-icon Academy — Android (Play Store) Deployment Guide

This guide covers everything needed to build, sign, and publish the mobile app to the Google Play Store, pointing at the production backend running on Digital Ocean (`https://iiconacademy.in`).

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│          React Native (Expo SDK ~54)         │
│  expo-router navigation, NativeWind styling  │
│  packages/shared — API client (auto token)   │
└─────────────────────┬────────────────────────┘
                      │ HTTPS
          ┌───────────▼────────────┐
          │  https://iiconacademy.in │
          │  (Digital Ocean Droplet) │
          │  Nginx → Fastify :8000   │
          └──────────────────────────┘
```

The app talks exclusively to `https://iiconacademy.in`. The production API URL is injected via `app.config.js` from the `EXPO_PUBLIC_API_URL` environment variable set per build profile in `eas.json`.

---

## Part 1 — One-Time Setup (do once per machine / per developer)

### 1.1 Install EAS CLI

```bash
npm install -g eas-cli
```

Verify installation:
```bash
eas --version   # should be >= 10.0.0
```

### 1.2 Log in to Your Expo Account

The project is already linked to EAS (project ID: `03dce7fa-888b-4d00-8a34-a7003391ebe6`, owner: `aiapptech2025s-organization`).

```bash
eas login
# Enter Expo credentials for aiapptech2025s-organization
```

Confirm the project is linked:
```bash
cd apps/mobile
eas project:info
# Should show: slug=iiconacademy, owner=aiapptech2025s-organization
```

### 1.3 Install Node dependencies

From the repo root:
```bash
pnpm install
```

---

## Part 2 — Required Assets (Create Before First Build)

The following image files **must exist** before EAS Build will succeed. Place them all in `apps/mobile/assets/`:

| File | Size | Notes |
|------|------|-------|
| `icon.png` | 1024 × 1024 px | App icon. No transparency. Rounded corners are added automatically by Android. Use the i-icon Academy logo on white/brand background. |
| `splash.png` | 1284 × 2778 px | Splash screen image. Use brand background `#4f46e5`. Logo centred in the safe area (middle 800 × 800 px). |
| `adaptive-icon.png` | 1024 × 1024 px | Android adaptive icon foreground. Logo centred in the middle 66% (safe zone). Background colour `#4f46e5` is set in `app.json`. |
| `notification-icon.png` | 96 × 96 px | Push notification icon. **Must be a plain white shape on a transparent background** (silhouette only). Android will tint it with the notification colour. |

`assets/logo-mark.png` already exists and is used inside the app UI.

**Quick approach** — use the i-icon Academy logo:
1. Export the logo as 1024 × 1024 white-on-indigo PNG → `icon.png`
2. Use the same image centred on `#4f46e5` background → `splash.png` (resize canvas to 1284 × 2778)
3. Export logo only (no background) as 1024 × 1024 → `adaptive-icon.png`
4. Export a simplified white silhouette as 96 × 96 → `notification-icon.png`

Verify all four files exist:
```bash
ls apps/mobile/assets/
# icon.png  adaptive-icon.png  splash.png  notification-icon.png  logo-mark.png
```

---

## Part 3 — Google Play Console Setup (One-Time)

### 3.1 Create a Google Play Console Account

1. Go to https://play.google.com/console
2. Sign in with a Google account (use the business account — e.g. aiapptech2025@gmail.com)
3. Pay the one-time $25 developer registration fee
4. Fill in developer profile details

### 3.2 Create the App in Play Console

1. Click **Create app**
2. App name: **i-icon Academy**
3. Default language: **English (India)** (or your primary locale)
4. App type: **App**
5. Free / Paid: **Free** (cannot change later if you choose Free)
6. Accept the declarations
7. Click **Create app**

Note the **Package name**: `com.iiconacademy.app` (set in `app.json` → `android.package`). This must match exactly.

### 3.3 Complete the Store Listing (Required Before First Release)

In the Play Console for your app:

**Main store listing:**
- App name: `i-icon Academy`
- Short description (≤ 80 chars): `Access curated IIT Foundation & JEE prep content from your school`
- Full description (≤ 4000 chars): Describe the app's features — content library, PDF viewer, video lessons, school-based access
- Category: **Education**
- Contact email: `aiapptech2025@gmail.com`

**Graphics required for the store listing:**

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 512 × 512 px | Same as `icon.png` but 512 px |
| Feature graphic | 1024 × 500 px | Banner shown at the top of your Play Store page |
| Phone screenshots | Min 2, max 8 | 16:9 or 9:16, min 320 px on shortest side |

### 3.4 Set Up Google Service Account (for `eas submit`)

EAS Submit needs a Google Service Account key to automatically upload builds to Play Store.

**Step 1 — Create a Service Account:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project linked to your Play Console (or create a new one: **iicon-academy-publish**)
3. Navigate to **IAM & Admin → Service Accounts**
4. Click **+ Create Service Account**
   - Name: `eas-submit`
   - ID: `eas-submit`
   - Description: EAS Submit automation
5. Click **Create and Continue**
6. Skip optional role assignment → click **Done**
7. Click the newly created service account → **Keys** tab
8. **Add Key → Create new key → JSON** → Download the file
9. Save as `apps/mobile/google-service-account.json`

> ⚠️ Add `google-service-account.json` to `.gitignore` — never commit this file.

**Step 2 — Grant Play Store access:**
1. Go to Play Console → **Setup → API access**
2. Click **Link to a Google Cloud project** → select the project from Step 1
3. Under **Service accounts**, click **Grant access** next to `eas-submit@...`
4. **Account permissions**: check **Release apps to testing tracks** and **Manage testing tracks**
5. Click **Invite user**

**Step 3 — Verify `eas.json` points to the key:**
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "production"
    }
  }
}
```
This is already configured in `eas.json`. ✓

---

## Part 4 — App Signing (Android)

EAS Build manages signing automatically. On the first production build it will:
1. Generate an upload keystore (stored securely in EAS servers)
2. Sign the AAB with it
3. You enrol your app with Google Play's **App Signing by Google Play** (recommended)

> With App Signing by Google Play: you upload a signed AAB → Google re-signs it with their key for distribution. This is the default and recommended approach.

**First-time only:** After your first production build, go to Play Console → **Setup → App Integrity → App signing** and verify that EAS's upload certificate matches.

---

## Part 5 — Building for Production

All commands run from `apps/mobile/`.

```bash
cd apps/mobile
```

### 5.1 Verify Build Configuration

Check that `eas.json` looks like this:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "http://10.0.2.2:8000" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://iiconacademy.in" }
    },
    "production": {
      "channel": "production",
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_API_URL": "https://iiconacademy.in" }
    }
  }
}
```

Production builds create an `.aab` (Android App Bundle) — required by Play Store.
Preview builds create an `.apk` — for internal testing on physical devices.

### 5.2 Preview Build (APK — test before Play Store)

Build a testable APK pointing to the live backend:
```bash
eas build --platform android --profile preview
```

- Build runs in the cloud (EAS servers) — takes ~10–20 minutes
- When done, EAS prints a download URL for the `.apk`
- Install on an Android device: `adb install <file>.apk` or scan the QR code from the EAS dashboard

Test the APK thoroughly:
- [ ] Login with a school account
- [ ] Login with a platform admin account
- [ ] Browse PDFs, open viewer, download a PDF
- [ ] Watch a video
- [ ] Check bookmarks
- [ ] Forgot password flow

### 5.3 Production Build (AAB — for Play Store)

Once testing is complete:
```bash
eas build --platform android --profile production
```

- Creates a signed `.aab` file
- Takes ~15–25 minutes
- When complete, the build appears in your [EAS dashboard](https://expo.dev) and can be downloaded or submitted directly

### 5.4 Monitor the Build

Watch the log output in the terminal, or open the URL EAS prints (e.g. `https://expo.dev/accounts/aiapptech2025s-organization/projects/iiconacademy/builds/...`).

---

## Part 6 — Submitting to Google Play Store

### Option A — Automatic via EAS Submit (Recommended)

After the production build finishes:
```bash
eas submit --platform android --profile production
```

EAS will:
1. Use `google-service-account.json` to authenticate with Play API
2. Upload the `.aab` to the **Production** track (as configured in `eas.json`)
3. Print a link to the Play Console release

> **First submission must be done manually** (Option B) because Play requires you to complete content rating, privacy policy, and other forms before the first automated submit can work.

### Option B — Manual Upload via Play Console

1. Download the `.aab` from your EAS dashboard or the terminal download link
2. Go to **Play Console → Production → Releases → Create new release**
3. Upload the `.aab` file
4. Under **What's new in this release?**, write release notes (required):
   ```
   Initial release of i-icon Academy — access curated educational content,
   PDF viewer with watermarking, and video lessons for your school.
   ```
5. Click **Save → Review release → Start rollout to Production**

### 6.1 Pre-Launch Checklist (Play Console)

Before the first submission, complete these Play Console sections:

**App content:**
- [ ] **Privacy Policy URL** — Host a privacy policy page (e.g. `https://iiconacademy.in/privacy`) and enter the URL
- [ ] **App access** — Select "All or some functionality is restricted" → explain login required → add a test account
- [ ] **Content rating** — Complete the questionnaire (select Education, no violence/mature content → should get Everyone rating)
- [ ] **Target audience** → Select age 13+ or appropriate age range
- [ ] **News apps** → No
- [ ] **COVID-19 contact tracing** → No
- [ ] **Data safety** → Fill in what data the app collects (email, name for login; no data sold to third parties; data encrypted in transit)
- [ ] **Financial features** → No

---

## Part 7 — OTA Updates with EAS Update (JS Changes Only)

For JavaScript/React Native code changes that **don't** require a new Play Store release (no new native modules, same permissions, same app.json), use EAS Update for instant over-the-air delivery:

```bash
# From apps/mobile/
eas update --branch production --message "Fix PDF filter bug"
```

Users will get the update automatically on the next app launch (within ~5 minutes, or immediately if they have background fetch enabled).

**When to use EAS Update vs. a full build:**

| Change | Use |
|--------|-----|
| Bug fix in `.tsx`/`.ts` files | `eas update` |
| New screen or UI change | `eas update` |
| New API endpoint call | `eas update` |
| New npm package (native module) | Full `eas build` + Play Store submit |
| Change to `app.json` (permissions, icons, splash) | Full `eas build` + Play Store submit |
| Version bump for Play Store listing | Full `eas build` + Play Store submit |

---

## Part 8 — Version Management

When you release a new version to the Play Store:

**1. Bump `versionCode`** (integer, must always increase):
```json
// app.json
"android": {
  "versionCode": 2
}
```

**2. Bump `version`** (human-readable, shown to users):
```json
// app.json
"version": "1.0.1"
```

**3. Run a new production build:**
```bash
eas build --platform android --profile production
```

**4. Submit or upload to Play Console.**

---

## Part 9 — Backend Configuration for Mobile

The backend at `https://iiconacademy.in` must be accessible from mobile devices. Verify:

### 9.1 CORS / HTTPS
The Fastify backend should be serving on HTTPS (via Nginx SSL termination). Mobile apps **require** HTTPS for all API calls in production — HTTP will be blocked by Android by default.

If you see `Network request failed` errors:
1. Confirm `https://iiconacademy.in/api/auth/login` returns a valid response in a browser
2. Check Nginx is forwarding `/api/*` to the Fastify process
3. Verify the SSL certificate is valid and not expired

### 9.2 WebSocket (Real-time Notifications)
The app connects to `wss://iiconacademy.in/api/notifications/ws`. Ensure Nginx is configured to proxy WebSocket connections:

```nginx
# Add to the /api/notifications/ws location block in nginx.conf
location /api/notifications/ws {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

### 9.3 File Downloads
PDF downloads use `FileSystem.downloadAsync()` which makes a direct authenticated GET to:
```
https://iiconacademy.in/api/pdfs/<id>/download
```
No additional configuration needed — the auth token is sent as `Authorization: Bearer <token>`.

---

## Part 10 — Testing Checklist (Before Each Play Store Release)

Run through this on a physical Android device using the **preview APK**:

**Authentication:**
- [ ] Login with school_viewer account → redirects to School section
- [ ] Login with admin account → redirects to Admin section
- [ ] Forgot password flow sends email
- [ ] Session persists after app restart (no re-login required)
- [ ] Logout clears session

**School Section:**
- [ ] Content Library loads PDFs
- [ ] Program / Class / Subject filters work
- [ ] PDF opens in full-screen viewer
- [ ] Watermark overlay visible on PDF
- [ ] PDF download works, file opens
- [ ] Bookmark toggle persists after refresh
- [ ] Video page loads

**Admin Section:**
- [ ] Dashboard loads metrics
- [ ] Schools page loads
- [ ] Users page loads
- [ ] Notifications badge shows count

**Network:**
- [ ] All features work on 4G (not just Wi-Fi)
- [ ] Graceful error messages when offline

---

## Part 11 — Troubleshooting

### "Network request failed" on physical device
- **Cause:** App is pointing to `http://` instead of `https://`, or the IP/domain is wrong
- **Fix:** Verify `EXPO_PUBLIC_API_URL=https://iiconacademy.in` in eas.json for the build profile used. Rebuild after fixing.

### "Build failed: icon.png not found"
- **Cause:** Missing required asset files
- **Fix:** Add all four assets to `apps/mobile/assets/` as described in Part 2

### "eas submit failed: Google Service Account unauthorized"
- **Cause:** Service account not granted Play Store access
- **Fix:** In Play Console → Setup → API access, grant the service account **Release apps** permission

### "App crashes on launch"
- **Cause:** JS bundle error, usually a failed import or uncaught exception
- **Fix:** Run `eas build --profile development` and use the Expo Dev Client to see the error in the Metro bundler

### "PDF does not load in viewer"
- **Cause:** Auth token expired or `react-native-pdf` can't reach the backend
- **Fix:** Verify token refresh works (logout and log back in); confirm `trustAllCerts: false` is appropriate for your SSL setup

---

## Quick Reference

```bash
# Navigate to mobile app
cd apps/mobile

# Log in to EAS (once)
eas login

# Preview build (APK for physical device testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production

# Submit production build to Play Store automatically
eas submit --platform android --profile production

# OTA update (JS-only changes, no store review needed)
eas update --branch production --message "Description of changes"

# Check build status
eas build:list

# View project in EAS dashboard
eas project:info
```

---

## File Reference

| File | Purpose |
|------|---------|
| `apps/mobile/app.json` | Static Expo config (app name, package, icons, permissions) |
| `apps/mobile/app.config.js` | Dynamic config — injects `EXPO_PUBLIC_API_URL` into `extra.apiUrl` |
| `apps/mobile/eas.json` | Build profiles and env vars per environment |
| `apps/mobile/src/lib/apiClient.js` | Mobile-specific API client init (SecureStore token storage) |
| `apps/mobile/src/context/AuthContext.tsx` | Auth state management (login, logout, session restore) |
| `packages/shared/src/api/client.js` | Shared fetch client (token injection, auto-refresh) |
| `apps/mobile/assets/google-service-account.json` | ⚠️ Google Play Service Account key (gitignored, keep secret) |
