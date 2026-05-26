# Mobile Build Guide — i-icon academy

The mobile shell is built with **Capacitor 6** wrapping the existing React + Vite web app, so 100% of the UI is shared. This document covers Android (any OS) and iOS (macOS only).

> Looking for QA scenarios, device matrix, or release smoke tests? See [`MOBILE_TESTING.md`](./MOBILE_TESTING.md).

---

## 1. Prerequisites

| Target  | Tooling                                                                 |
| ------- | ----------------------------------------------------------------------- |
| Web/PWA | Node 20+, npm 10+                                                       |
| Android | Above **+** Android Studio (Giraffe or later), Java JDK 17, Android SDK |
| iOS     | Above **+** macOS, Xcode 15+, CocoaPods (`sudo gem install cocoapods`)  |

The Capacitor config lives at `apps/web/capacitor.config.ts`.

```
appId:   com.iiconacademy.app
appName: i-icon academy
webDir:  ../../dist/apps/web   (the Vite production build output)
```

---

## 2. One-time setup

```bash
cd apps/web
npm install
```

Android platform is already scaffolded in `apps/web/android/`. iOS must be added once on a Mac (see §4).

---

## 3. Android — build & run

```bash
# 1. Build the web bundle and copy it into the Android project
npm run mobile:sync

# 2. Open in Android Studio (recommended for first run)
npm run mobile:open:android

# OR run on a connected device / emulator from the CLI
npm run mobile:run:android
```

### Live-reload against the local Vite dev server

```bash
# Terminal 1
npm run dev                       # starts Vite on http://<your-LAN-ip>:3000

# Terminal 2
$env:CAP_SERVER_URL="http://<your-LAN-ip>:3000"   # PowerShell
npx cap sync android
npx cap run android
```

Capacitor reads `CAP_SERVER_URL` and points the WebView at your dev server so every save hot-reloads on the device.

### Release APK / AAB

1. `npm run mobile:sync`
2. Open `apps/web/android` in Android Studio.
3. **Build → Generate Signed Bundle / APK** → select **AAB** (Play Store) or **APK** (sideload).
4. Use your keystore (one will be created if you don't have one).

---

## 4. iOS — first-time setup (macOS only)

```bash
cd apps/web
npm run mobile:add:ios      # generates apps/web/ios/
npm run mobile:sync         # builds web + copies into iOS project
npm run mobile:open:ios     # opens Xcode workspace
```

In Xcode:

1. Select the `App` target → **Signing & Capabilities** → choose your Team.
2. Update **Bundle Identifier** if you want a custom one (default: `com.iiconacademy.app`).
3. Plug in an iOS device or pick a simulator and hit **Run** (⌘R).

### Release IPA

1. `Product → Archive` in Xcode.
2. Use **Distribute App → App Store Connect** or **Ad-Hoc** as needed.

---

## 5. What's wired natively

Implemented in `apps/web/src/native/`:

| File                  | Responsibility                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nativeBootstrap.js` | Runs at startup — configures **StatusBar**, hides **SplashScreen**, listens for the Android hardware back button, and routes **deep-link URLs** through React Router. No-op on the web. |
| `nativeBridge.js`    | Cross-platform helpers: `saveBlobToDevice`, `shareText`, `openExternal`, `haptic`, `subscribeNetwork`. Each prefers a Capacitor plugin and gracefully falls back to a Web API. |

### Plugins installed

`@capacitor/app` `@capacitor/browser` `@capacitor/filesystem` `@capacitor/haptics` `@capacitor/keyboard` `@capacitor/network` `@capacitor/preferences` `@capacitor/push-notifications` `@capacitor/share` `@capacitor/splash-screen` `@capacitor/status-bar`

---

## 6. UI considerations

- **Safe-area** insets are honoured automatically — every page is wrapped in layouts that use `.pt-safe`, `.pb-safe`, `.pb-mobile-nav`.
- **Bottom navigation** appears below `lg` breakpoint with the 5 most-used destinations per role.
- **Tap-zoom prevention** — all inputs default to ≥16px font size on small viewports.
- **Reduced motion** — `prefers-reduced-motion` disables transitions globally and the `PageTransition` component bypasses Framer Motion.

---

## 7. API endpoint

The mobile shell calls the same `/api/*` endpoints as the web app. Two configuration options:

1. **Production builds** — bundle the web app pointing at your production API host (set the API base in `apps/web/src/lib/apiClient.js` build config).
2. **Local dev** — use `CAP_SERVER_URL` to point Capacitor at your Vite dev server, which proxies `/api` to the local Fastify backend.

For TLS / Play Console submissions you'll need an HTTPS API origin. Self-signed certs will be rejected by Android by default (we set `allowMixedContent: false`).

---

## 8. Common issues

| Problem                                      | Fix                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `webDir not found` when running `cap sync`  | Run `npm run build` first. The web bundle lives at `dist/apps/web` relative to repo root.                                              |
| Android Studio: `SDK location not found`     | Create `apps/web/android/local.properties` with `sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk` (escape backslashes).         |
| Splash sticks                                | Make sure `bootstrapNative()` runs — it calls `SplashScreen.hide()` after init. Check the browser console / `chrome://inspect` on Android. |
| iOS build fails on `pod install`             | `cd apps/web/ios/App && pod repo update && pod install`.                                                                               |
| Hardware back button closes the app instantly | Confirm React Router has multiple history entries; the back-button handler exits only when there's nothing to pop.                     |

---

## 9. Roadmap (not yet implemented)

- App-store assets (1024×1024 icons, screenshots, marketing copy)
- Background push registration with FCM (Android) / APNs (iOS)
- Native PDF reader plugin (currently uses react-pdf in a WebView — fine for most documents)
- Biometric unlock via `@capacitor-community/biometric-auth`

The cross-platform bridges in `nativeBridge.js` are the recommended insertion point for any of these.
