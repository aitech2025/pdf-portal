# i-icon Academy — Mobile App Deployment Guide

Deploy the **i-icon Academy** mobile app to Android (Google Play Store) and iOS (Apple App Store) using **Expo Application Services (EAS)**.

- **Framework**: Expo SDK 54 + React Native 0.81
- **Routing**: Expo Router 6
- **Build service**: EAS Build (cloud — no local Xcode/Android Studio required for builds)
- **Bundle ID (iOS)**: `com.iiconacademy.app`
- **Package name (Android)**: `com.iiconacademy.app`
- **EAS project ID**: `03dce7fa-888b-4d00-8a34-a7003391ebe6`

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-time Setup](#2-first-time-setup)
3. [Environment Variables](#3-environment-variables)
4. [eas.json Reference](#4-easjson-reference)
5. [Building for Android](#5-building-for-android)
6. [Building for iOS](#6-building-for-ios)
7. [Submitting to Stores](#7-submitting-to-stores)
8. [Over-the-Air Updates](#8-over-the-air-updates)
9. [Local Development](#9-local-development)
10. [Store Listing Assets](#10-store-listing-assets)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### Required accounts

| Account | Purpose | URL |
|---------|---------|-----|
| Expo account | EAS Build & Submit | https://expo.dev |
| Google Play Console | Android distribution | https://play.google.com/console |
| Apple Developer Program ($99/yr) | iOS distribution | https://developer.apple.com |

### Required tools

```bash
# Node.js 20+ (LTS)
node --version   # should print v20.x or later

# pnpm (used by this monorepo)
npm install -g pnpm

# Expo CLI
npm install -g expo-cli

# EAS CLI
npm install -g eas-cli

# Verify login
eas whoami
# If not logged in:
eas login
```

### Optional (for local device builds only)

| Tool | Platform | Notes |
|------|---------|-------|
| Xcode 16+ | iOS (macOS only) | Required for local iOS builds & Simulator |
| Android Studio Ladybug+ | Android | Required for local Android builds & Emulator |
| JDK 17 | Android | `brew install openjdk@17` |

> **Cloud builds via EAS do not require Xcode or Android Studio** on your local machine. EAS runs builds on managed infrastructure. You only need the local tools if you want to run the app in a simulator/emulator during development.

---

## 2. First-time Setup

### 2.1 Install dependencies

From the **monorepo root**:

```bash
pnpm install
```

This installs all workspaces including `apps/mobile`, `packages/shared`, etc.

### 2.2 Link project to EAS

```bash
cd apps/mobile
eas init --id 03dce7fa-888b-4d00-8a34-a7003391ebe6
```

If you are setting up a fresh EAS project (not using the existing project ID):

```bash
eas init
# Creates a new EAS project and updates app.json with the new projectId
```

### 2.3 Configure app.json for your environment

Open `apps/mobile/app.json` and verify:

```json
{
  "expo": {
    "name": "i-icon academy",
    "slug": "iiconacademy",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.iiconacademy.app"
    },
    "android": {
      "package": "com.iiconacademy.app"
    },
    "extra": {
      "apiUrl": "https://iiconacademy.in",
      "eas": {
        "projectId": "03dce7fa-888b-4d00-8a34-a7003391ebe6"
      }
    },
    "owner": "aiapptech2025s-organization"
  }
}
```

**Important**: Change `extra.apiUrl` to `https://iiconacademy.in` (your production API URL) before building. During development, keep it pointing at your local server.

---

## 3. Environment Variables

The app uses `Constants.expoConfig.extra.apiUrl` at runtime. EAS `env` blocks in `eas.json` inject `EXPO_PUBLIC_*` variables at build time.

### Current eas.json env mapping

| Build profile | `EXPO_PUBLIC_API_URL` | Use case |
|---|----|---|
| `development` | `http://localhost:8000` | Local dev client |
| `preview` | *(set per deployment)* | Internal testing APK/IPA |
| `production` | `https://iiconacademy.in` | Store builds |

### Update production API URL

Edit `eas.json`:

```json
"production": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://iiconacademy.in"
  }
}
```

Also update `app.json`:

```json
"extra": {
  "apiUrl": "https://iiconacademy.in"
}
```

### Secrets (never commit to git)

Store sensitive values as EAS secrets (not in `eas.json`):

```bash
eas secret:create --scope project --name SENTRY_DSN --value "your-dsn"
eas secret:list
```

---

## 4. eas.json Reference

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "http://YOUR_LOCAL_IP:8000" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_API_URL": "https://iiconacademy.in" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": { "credentialsSource": "remote" },
      "env": { "EXPO_PUBLIC_API_URL": "https://iiconacademy.in" }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "your@apple.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

**Build profiles explained:**

| Profile | Distribution | Format | Use |
|---------|-------------|--------|-----|
| `development` | Internal | Dev client | Hot-reload development on physical device |
| `preview` | Internal | APK / IPA | QA testing, share with testers via EAS |
| `production` | Store | AAB / IPA | Google Play / App Store submission |

---

## 5. Building for Android

### 5.1 One-time: Create a keystore

EAS can manage the keystore for you (recommended):

```bash
cd apps/mobile
eas credentials
# Select Android → production → Keystore → Generate new keystore
# EAS stores it securely in the cloud
```

To use your own existing keystore, add to `eas.json`:

```json
"production": {
  "android": {
    "credentialsSource": "local"
  }
}
```

And create `credentials.json` in `apps/mobile/`:

```json
{
  "android": {
    "keystore": {
      "keystorePath": "release.keystore",
      "keystorePassword": "...",
      "keyAlias": "iiconacademy",
      "keyPassword": "..."
    }
  }
}
```

> Never commit `release.keystore` or `credentials.json` to git. Add both to `.gitignore`.

### 5.2 Build APK (internal testing / QA)

```bash
cd apps/mobile
eas build --platform android --profile preview
```

- Output: `.apk` file directly installable on Android devices
- EAS dashboard: https://expo.dev/accounts/aiapptech2025s-organization/projects/iiconacademy/builds
- After the build completes, EAS emails you a QR code to install the APK

### 5.3 Build AAB (Play Store)

```bash
eas build --platform android --profile production
```

- Output: `.aab` (Android App Bundle) — required by Google Play for new apps
- Build takes 10–20 min on EAS servers

### 5.4 Version bumps

Before each release, increment `versionCode` in `app.json`:

```json
"android": {
  "versionCode": 2
}
```

Also bump `"version"` (semantic version shown to users):

```json
"version": "1.0.1"
```

### 5.5 Monitor the build

```bash
eas build:list --platform android
eas build:view  # opens dashboard in browser
```

---

## 6. Building for iOS

### 6.1 One-time: Apple credentials

EAS automates iOS provisioning profile and certificate management. Run:

```bash
cd apps/mobile
eas credentials
# Select iOS → production → Apple Distribution Certificate → Generate
# Then: Provisioning Profile → Generate
```

You will be prompted to log in to Apple ID. EAS will:
1. Create a distribution certificate in your Apple Developer account
2. Create (or reuse) an App ID for `com.iiconacademy.app`
3. Create a provisioning profile linking the certificate to the App ID

> For CI environments, use `credentialsSource: "remote"` in `eas.json` (already set) so EAS fetches credentials automatically without prompting.

### 6.2 Register the app in App Store Connect

1. Go to https://appstoreconnect.apple.com → My Apps → `+` → New App
2. Platform: **iOS**, Name: **i-icon academy**
3. Bundle ID: `com.iiconacademy.app` (must match `app.json`)
4. SKU: `iiconacademy` (internal identifier, any unique string)
5. Note the **App ID** (numeric) — needed for `eas.json` submit config

### 6.3 Build for iOS (Simulator — no Apple Developer account needed)

```bash
eas build --platform ios --profile development --local
# Only works on macOS with Xcode installed
```

### 6.4 Build for device / App Store

```bash
eas build --platform ios --profile production
```

- EAS builds on macOS servers with the latest Xcode
- Output: `.ipa` file
- Build takes 15–30 min

### 6.5 Version bumps

Before each release:

```json
"ios": {
  "buildNumber": "2"
}
```

```json
"version": "1.0.1"
```

`buildNumber` is what Apple uses for uniqueness; `version` is displayed to users.

### 6.6 TestFlight distribution

After a successful production build:

```bash
eas submit --platform ios --profile production
```

Or upload manually:
1. Download the `.ipa` from the EAS dashboard
2. Open **Transporter** (Mac App Store) → Add `.ipa` → Deliver
3. Wait ~10 min for processing, then find it in **TestFlight** in App Store Connect
4. Add internal/external testers, get the TestFlight link

---

## 7. Submitting to Stores

### 7.1 Android — Google Play

#### First-time setup: service account

1. In Google Play Console → Setup → API access → Link to Google Cloud project
2. Google Cloud Console → IAM → Service Accounts → Create service account
3. Grant role: **Release Manager** (or Editor)
4. Create a JSON key → download as `google-service-account.json`
5. Place at `apps/mobile/google-service-account.json` (gitignored)

The `eas.json` already references this file:

```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "production"
}
```

#### Submit

```bash
cd apps/mobile
eas submit --platform android --profile production
```

EAS uploads the AAB to Google Play `production` track. Alternatively use `"track": "internal"` for internal testing first.

#### Play Store tracks

| Track | Audience | Notes |
|-------|---------|-------|
| `internal` | Up to 100 testers | Instant publish, no review |
| `alpha` | Closed group | Fast review |
| `beta` | Open beta | Broader audience |
| `production` | All users | Full review (1–3 days) |

Change track in `eas.json` under `submit.production.android.track`.

### 7.2 iOS — App Store

#### Update eas.json with App Store Connect details

```json
"ios": {
  "appleId": "admin@iiconacademy.in",
  "ascAppId": "YOUR_NUMERIC_APP_ID",
  "appleTeamId": "YOUR_10_CHAR_TEAM_ID"
}
```

Find these at:
- `appleId`: your Apple ID email
- `ascAppId`: App Store Connect → App → General → Apple ID field (numeric)
- `appleTeamId`: developer.apple.com → Account → Membership → Team ID

#### Submit

```bash
eas submit --platform ios --profile production
```

The build goes to **TestFlight** first. Then in App Store Connect:
1. Click `+` next to Version
2. Select the TestFlight build
3. Fill in release notes, screenshots, privacy policy URL
4. Submit for Review

Apple review: typically 1–3 business days for new apps, hours for updates.

### 7.3 Build + Submit in one command

```bash
# Android
eas build --platform android --profile production --auto-submit

# iOS
eas build --platform ios --profile production --auto-submit
```

---

## 8. Over-the-Air Updates

EAS Update lets you push JS/asset changes to users **without a new store submission** (native code changes still require a full build).

### 8.1 Setup

```bash
# Add expo-updates to the project (if not already present)
cd apps/mobile
npx expo install expo-updates
```

Add to `eas.json`:

```json
"build": {
  "production": {
    "channel": "production"
  }
}
```

Add to `app.json`:

```json
"updates": {
  "url": "https://u.expo.dev/03dce7fa-888b-4d00-8a34-a7003391ebe6"
}
```

### 8.2 Publish an OTA update

```bash
eas update --branch production --message "Fix login screen layout"
```

Users get the update silently on next app launch (within the same runtime version).

### 8.3 OTA limitations

Changes that require a **full store build** (not OTA):
- Adding/removing native packages (`react-native-webview`, `react-native-pdf`, etc.)
- Changing `app.json` native config (`permissions`, `bundleIdentifier`, `scheme`)
- Upgrading Expo SDK version
- Changing splash screen or app icon

Changes that **can** be pushed via OTA:
- UI/logic changes in `.tsx`/`.ts` files
- Bug fixes in JS code
- Asset changes (images, fonts loaded via JS)

---

## 9. Local Development

### 9.1 Start the dev server (Expo Go — for quick testing)

> Expo Go does not support native packages like `react-native-pdf` or `react-native-webview`. Use the development client for those.

```bash
# Start API (from monorepo root)
pnpm -F api-node dev

# Start mobile dev server (from apps/mobile)
pnpm start
# or
npx expo start
```

Scan the QR code with Expo Go on your device.

### 9.2 Development client (supports all native packages)

The development client is a custom Expo Go built with your native packages.

```bash
# Build dev client (one time per new native package)
eas build --platform android --profile development
# or iOS
eas build --platform ios --profile development

# After installing the dev client APK/IPA on your device:
npx expo start --dev-client
```

Scan the QR code with the **custom dev client** (not Expo Go).

### 9.3 Android Emulator

```bash
# Ensure an emulator is running in Android Studio
npx expo start --android
# or
pnpm android
```

### 9.4 iOS Simulator (macOS only)

```bash
npx expo start --ios
# or
pnpm ios
```

### 9.5 Update API URL for local dev

In `app.json`:

```json
"extra": {
  "apiUrl": "http://192.168.1.X:8000"
}
```

Use your machine's LAN IP (not `localhost`) so the device/emulator can reach it. Find it with:

```bash
# macOS
ipconfig getifaddr en0

# Windows
ipconfig
# look for IPv4 Address under your Wi-Fi adapter
```

The API must be running and reachable on that IP.

---

## 10. Store Listing Assets

Prepare these before submission. All dimensions are in pixels.

### Android (Google Play)

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 512 × 512 PNG | No transparency |
| Feature graphic | 1024 × 500 PNG/JPG | Shown at top of Play Store listing |
| Phone screenshots | Min 2, max 8 | 16:9 or 9:16, min 320px on short side |
| Tablet screenshots | Optional | 7-inch and 10-inch |
| Short description | Max 80 chars | Shown in search results |
| Full description | Max 4000 chars | |

Existing assets in `apps/mobile/assets/`:
- `icon.png` → resize to 512 × 512 for Play Console upload
- `adaptive-icon.png` → already used by Android adaptive icon

### iOS (App Store)

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 1024 × 1024 PNG | No alpha channel, no rounded corners |
| iPhone 6.9" screenshots | 1320 × 2868 | Required (iPhone 16 Pro Max) |
| iPhone 6.5" screenshots | 1284 × 2778 | Required (iPhone 11 Pro Max) |
| iPad 13" screenshots | 2064 × 2752 | Required if `supportsTablet: true` |
| Privacy policy URL | — | Required. Host a simple page at `iiconacademy.in/privacy` |

> `app.json` has `"supportsTablet": true` — you must provide iPad screenshots.

---

## 11. Troubleshooting

### Build fails: "Missing credentials"

```bash
eas credentials  # re-configure credentials
```

### Build fails: "react-native-blob-util" not found

`react-native-pdf` requires it as a peer dep. Ensure it is in `package.json`:

```json
"react-native-blob-util": "^0.21.0"
```

Then:

```bash
pnpm install
eas build --platform android --profile production --clear-cache
```

### "Metro bundler cannot resolve @shared/..."

The monorepo alias is configured in `babel.config.js`. If you see this in EAS builds, ensure your `eas.json` does not use a custom `appDir` that breaks the relative path `../../packages/shared/src`.

### iOS build fails: provisioning profile expired

```bash
eas credentials  # select iOS → Provisioning Profile → Delete → Regenerate
eas build --platform ios --profile production
```

### Android: app installed but crashes immediately

Usually a native library init issue. Check:

```bash
eas build:view  # open build logs in browser
# or stream logs during a local debug build:
npx expo run:android
```

### Version code already in Play Store

Increment `android.versionCode` in `app.json` before each build:

```json
"android": { "versionCode": 3 }
```

### "Your bundle is not compatible" (OTA update rejected)

The runtimeVersion has changed (a native package was added). You need a full store build, not just an OTA update.

### NETWORK_ERROR in app pointing to `localhost`

The device cannot reach `localhost` — it resolves to the device itself, not your dev machine. Use your LAN IP in `app.json`:

```json
"extra": { "apiUrl": "http://192.168.1.X:8000" }
```

---

## Quick Reference

```bash
# Install dependencies
pnpm install                                           # from monorepo root

# Local dev
npx expo start                                         # Expo Go (no native packages)
npx expo start --dev-client                            # Full native (after building dev client)

# Build
eas build -p android -e preview                        # Internal APK
eas build -p android -e production                     # Play Store AAB
eas build -p ios    -e production                      # App Store IPA

# Submit
eas submit -p android -e production                    # Upload to Google Play
eas submit -p ios    -e production                     # Upload to TestFlight

# OTA update
eas update --branch production --message "..."

# Credentials
eas credentials                                        # Manage signing keys
eas secret:list                                        # View EAS secrets
```

---

## File Reference

| File | Purpose |
|------|---------|
| `app.json` | App metadata, native config, bundle ID, icons |
| `eas.json` | Build profiles, submit config, env vars |
| `babel.config.js` | Metro bundler aliases (`@shared`, `@`) |
| `tailwind.config.js` | NativeWind class configuration |
| `assets/icon.png` | App icon (used by Expo, resize for stores) |
| `assets/splash.png` | Splash screen |
| `assets/adaptive-icon.png` | Android adaptive icon foreground |
| `google-service-account.json` | Google Play submit credentials — **gitignored** |
