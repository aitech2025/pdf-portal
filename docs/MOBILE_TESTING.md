# Mobile Testing Guide — i-icon academy (Android + iOS)

This document describes **how to test** the Capacitor-wrapped React app on real devices, emulators, and simulators. For *building* the app see [`MOBILE.md`](./MOBILE.md); this guide is for QA engineers, release managers, and developers verifying a build.

> Stack under test: React 18 + Vite + Capacitor 6, talking to a Fastify + MongoDB backend.

---

## 1. Test strategy overview

| Layer | Tooling | Where it runs |
| ----- | ------- | ------------- |
| Unit / component | Vitest (web layer) | CI, local |
| API integration | Vitest + supertest against Fastify + MongoDB | CI, local |
| Web UI smoke | Vite preview + manual browser walk-through | Local |
| **Mobile shell — Android** | Capacitor + Android Studio + `adb` | Emulator + real device |
| **Mobile shell — iOS** | Capacitor + Xcode + Simulator | Simulator + real device (macOS only) |
| Distribution smoke | Signed AAB / Ad-Hoc IPA installed on real hardware | Pilot devices |

The mobile binary is a thin WebView shell around the production web build, so **any bug reproducible in the browser is also a mobile bug** — reproduce in Chrome first, then escalate to the device. Mobile-only bugs are almost always one of: safe-area, keyboard, hardware back button, network, file I/O, deep-link routing, or a native plugin.

---

## 2. Pre-flight checklist (run before every test cycle)

```bash
# Repo root
docker compose up -d              # mongo + api + web
docker compose ps                 # all three "healthy"

# Web build that the mobile shell will bundle
cd apps/web
npm install                       # only when deps changed
npm run mobile:sync               # build + cap sync (iOS + Android)
```

Sanity checks:

- `curl http://localhost/api/health` returns `{ "status": "ok" }`
- `curl http://localhost/api/ready` returns `200`
- The web app at `http://localhost` loads and you can log in as `admin@iiconacademy.com` / `Admin@1234`
- `dist/apps/web/index.html` exists and is fresh (`Get-Item dist/apps/web/index.html`)

If any of these fail, fix them before touching a device — you'll waste hours otherwise.

---

## 3. Device matrix

Test against the lowest supported OS, the most common OS, and the newest OS for each platform. Update this table when you change `minSdkVersion` or the iOS deployment target.

### 3.1 Android

| Tier | API level / Android | Form factor | Notes |
| ---- | ------------------- | ----------- | ----- |
| Min  | API 23 (Android 6) — emulator | 5.0" phone | Smallest supported screen |
| Common | API 33 (Android 13) — Pixel 6 emulator + 1 real device | 6.1" phone | Edge-to-edge / gesture nav |
| Newest | API 34 (Android 14) — Pixel 8 emulator | 6.2" phone | Predictive back-gesture |
| Tablet | API 33 (Android 13) | 10" tablet | Sidebar should expand, bottom-nav hides at `lg` breakpoint |
| Foldable | API 34 — Pixel Fold | Fold + unfolded | Verify orientation + reflow |

### 3.2 iOS

| Tier | iOS | Device | Notes |
| ---- | --- | ------ | ----- |
| Min | iOS 14 simulator | iPhone SE (2nd gen) | Smallest supported screen + no notch |
| Common | iOS 17 simulator + 1 real device | iPhone 14 / 15 | Dynamic Island, safe-area top |
| Newest | iOS 18 simulator | iPhone 15 Pro Max | Latest WebKit |
| Tablet | iPadOS 17 simulator | iPad (10th gen) | Split view + multitasking |

### 3.3 Network conditions

| Profile | Setup | Use case |
| ------- | ----- | -------- |
| Wi-Fi | Default | Happy path |
| 4G | Charles / Network Link Conditioner "LTE" | Realistic field |
| 3G | "3G" preset | Slow PDF download — confirm progress UI |
| Offline | Airplane mode | Verify `subscribeNetwork()` toast + cached routes |
| Captive portal | iOS simulator → *Conditioner → Very Bad Network* | PDF download retry |

---

## 4. Inspecting the WebView in real time

### Android — Chrome DevTools

1. Enable **Developer options** → **USB debugging** on the device (or use the emulator).
2. Plug in via USB, open Chrome on the host: `chrome://inspect/#devices`.
3. The device appears under **Remote Target** with the app named **i-icon academy** — click **inspect**.
4. Full DevTools opens (console, network, application storage). Use this to:
   - Reproduce a JS error
   - Check the active CSS variables (`--keyboard-height`, `--safe-area-inset-top`)
   - Verify `localStorage` / IndexedDB state
   - Inspect WebSocket frames for live notifications

### iOS — Safari Web Inspector (macOS only)

1. On the device: **Settings → Safari → Advanced → Web Inspector = ON**.
2. On the Mac: **Safari → Settings → Advanced → Show Develop menu**.
3. Plug the device in. **Develop → \[Your iPhone\] → i-icon academy** opens the inspector.
4. Same toolset as Chrome — console, network, storage. Note: cookies for the WKWebView appear under `https://localhost` even when fetching `https://api.example.com` (because of Capacitor's `iosScheme: 'https'`).

### Native logs

```bash
# Android — filter Capacitor + app logs
adb logcat -s "Capacitor:V" "Capacitor/Plugin:V" "com.iiconacademy.app:V"

# iOS — Console.app on the Mac, filter by Process = "i-icon academy"
```

---

## 5. Functional test scenarios

Each scenario has an **ID** so you can reference failures in bug reports. ✓ = required pass for release.

### 5.1 Authentication (`AUTH-*`)

| ID | Steps | Expected | ✓ |
| -- | ----- | -------- | - |
| AUTH-01 | Cold start app | Splash shows, then login page | ✓ |
| AUTH-02 | Login with platform admin | Redirect to `/admin` dashboard | ✓ |
| AUTH-03 | Login with school user (first login) | Force-password-change screen appears | ✓ |
| AUTH-04 | Wrong password 5× | Account locked + error toast | ✓ |
| AUTH-05 | Kill app + reopen | Session restored (token in `@capacitor/preferences`) | ✓ |
| AUTH-06 | Logout | Returns to login, token cleared | ✓ |
| AUTH-07 | Second device login same account | Original session invalidated (single-session) | ✓ |

### 5.2 Navigation & layout (`NAV-*`)

| ID | Steps | Expected | ✓ |
| -- | ----- | -------- | - |
| NAV-01 | Open app on phone | Bottom nav visible with 5 destinations | ✓ |
| NAV-02 | Rotate to landscape | Layout reflows, bottom nav still visible | ✓ |
| NAV-03 | Open on tablet | Sidebar replaces bottom nav at `lg` breakpoint | ✓ |
| NAV-04 | Android: hardware/gesture back | Pops one history entry, exits app at root | ✓ |
| NAV-05 | iOS: swipe-from-left | Same as browser back (handled by React Router) |  |
| NAV-06 | Tap header avatar | Dropdown opens with Profile / Settings / Logout | ✓ |
| NAV-07 | Open Notifications | List loads via WebSocket; unread badge clears | ✓ |
| NAV-08 | Toggle dark mode (mobile menu) | Theme switches; persists after reload | ✓ |

### 5.3 PDF viewer & download (`PDF-*`)

| ID | Steps | Expected | ✓ |
| -- | ----- | -------- | - |
| PDF-01 | Open a PDF from Content Library | react-pdf renders first page < 3s on Wi-Fi | ✓ |
| PDF-02 | Pinch-zoom | Smooth, no clipping under notch / status bar | ✓ |
| PDF-03 | Scroll to last page | All pages render; memory stable | ✓ |
| PDF-04 | Single download | `saveBlobToDevice()` writes file. Android: appears in Downloads. iOS: opens share sheet → "Save to Files". | ✓ |
| PDF-05 | Bulk download (3+ PDFs) | Server-side ZIP, progress UI, file saved | ✓ |
| PDF-06 | Download on 3G | Progress bar updates, no timeout under 60 s | ✓ |
| PDF-07 | Offline → open downloaded PDF | App falls back to local copy or shows clear error | ✓ |
| PDF-08 | Watermark | Logged-in user's email/ID appears on rendered + downloaded copies | ✓ |

### 5.4 Search (`SEARCH-*`)

| ID | Steps | Expected | ✓ |
| -- | ----- | -------- | - |
| SEARCH-01 | Tap mobile search icon (top-right) | Navigates to `/search`, input auto-focuses | ✓ |
| SEARCH-02 | Type "math" | Debounced API call, results stream in | ✓ |
| SEARCH-03 | Tap result | Opens PDF detail page | ✓ |
| SEARCH-04 | Empty state | "No results" copy shown, not a spinner forever | ✓ |

### 5.5 Notifications (`NOTIF-*`)

| ID | Steps | Expected | ✓ |
| -- | ----- | -------- | - |
| NOTIF-01 | Admin broadcasts a message | School user's bell badge increments within 5 s | ✓ |
| NOTIF-02 | Open notification drawer | Items render newest-first | ✓ |
| NOTIF-03 | Mark all read | Badge clears, persists across cold start | ✓ |
| NOTIF-04 | Background the app, broadcast again | (Push not yet wired — confirm bell still updates when foregrounded) |  |

### 5.6 Native bridges (`NATIVE-*`)

Verifies every helper exported from `apps/web/src/native/nativeBridge.js`.

| ID | Bridge call | Steps | Expected | ✓ |
| -- | ----------- | ----- | -------- | - |
| NATIVE-01 | `saveBlobToDevice` | Download a PDF | File saved via `@capacitor/filesystem`; appears in Downloads / Files | ✓ |
| NATIVE-02 | `shareText` | Tap "Share invitation" on school page | Native share sheet opens with prefilled URL | ✓ |
| NATIVE-03 | `openExternal` | Tap support link | Opens in `@capacitor/browser` in-app browser, not WebView | ✓ |
| NATIVE-04 | `haptic` | Long-press a list item | Light haptic on iOS, vibration on Android |  |
| NATIVE-05 | `subscribeNetwork` | Toggle airplane mode | Banner / toast appears, clears on reconnect | ✓ |
| NATIVE-06 | StatusBar | Cold start in light + dark mode | Status bar icons readable on both | ✓ |
| NATIVE-07 | SplashScreen | Cold start | Splash visible ≤ 1.2s, fades out cleanly | ✓ |
| NATIVE-08 | Keyboard | Focus a text input | Web content reflows above the keyboard (uses `--keyboard-height`) | ✓ |
| NATIVE-09 | Deep links | `adb shell am start -W -a android.intent.action.VIEW -d "https://app.iiconacademy.com/admin/schools" com.iiconacademy.app` | App opens directly on `/admin/schools` (Android). iOS: open Universal Link from Notes app. | ✓ |

### 5.7 Edge cases & error handling (`EDGE-*`)

| ID | Steps | Expected | ✓ |
| -- | ----- | -------- | - |
| EDGE-01 | Backend down | Login shows "Cannot reach server" toast, no crash | ✓ |
| EDGE-02 | Token expired mid-session | Auto-logout + redirect to login | ✓ |
| EDGE-03 | Force-kill app during PDF download | Reopen → no orphaned files, no crash | ✓ |
| EDGE-04 | Low storage (<100 MB) | Bulk download fails gracefully with toast | ✓ |
| EDGE-05 | OS dark mode change while app open | Theme follows OS if "System" selected | ✓ |
| EDGE-06 | OS font scaling = 200% | No clipping, all CTAs still tappable |  |
| EDGE-07 | App backgrounded 5 min, foreground | Session restored, no re-login needed (until token expires) | ✓ |

---

## 6. Accessibility checks

Run on at least one Android and one iOS device per release.

| Tool | What to verify |
| ---- | -------------- |
| **TalkBack** (Android) | Login form, bottom nav, PDF list, dialog dismissal |
| **VoiceOver** (iOS) | Same flows as above |
| **OS font scaling** | Crank Settings → Display → Largest. Login + dashboards must remain usable |
| **High-contrast / Bold text** | iOS Settings → Accessibility → Display | No invisible text on dark mode |
| **Reduced motion** | iOS Settings → Accessibility / Android Developer options → Animator scale = OFF | `PageTransition` and Framer Motion disabled |
| **Touch target size** | All tappable elements ≥ 44×44 pt (iOS HIG) / 48×48 dp (Material) |

---

## 7. Performance baseline

Measure on a mid-tier device (e.g. Pixel 6 + iPhone 12). Capture from Chrome / Safari Web Inspector.

| Metric | Target | How to measure |
| ------ | ------ | -------------- |
| Cold start to interactive | < 3.5 s on Wi-Fi | Stopwatch from splash to login form interactive |
| Login round-trip | < 1.5 s | Network panel: `/api/auth/login` |
| PDF first-page render | < 3 s on Wi-Fi, < 6 s on 3G | Console mark in `PDFViewer` |
| Memory (idle on dashboard) | < 150 MB | Android Studio Profiler / Xcode Debug Navigator |
| Memory (PDF open) | < 350 MB for a 50-page document | Same |
| Battery (30 min active use) | < 8% drain | OS battery report |
| APK size | < 25 MB (release AAB) | `unzip -l app-release.aab` |
| IPA size | < 35 MB | Xcode Organizer |

Regressions of more than 25% on any metric should block release.

---

## 8. Security & privacy checks

| Check | Pass criteria |
| ----- | ------------- |
| Cleartext HTTP blocked | `adb shell` → curl in WebView to `http://example.com` is rejected (we set `allowMixedContent: false`) |
| API uses HTTPS in release | `apps/web/src/lib/apiClient.js` base URL is `https://...` |
| Token storage | `@capacitor/preferences` (encrypted at rest on iOS, app-sandboxed on Android), **never** logged |
| Logs | `adb logcat` and Xcode Console contain no JWTs, passwords, or PII |
| Permissions requested | Only `INTERNET`, `READ/WRITE_EXTERNAL_STORAGE` (Android ≤ 28), Notification (when enabled) |
| App-Transport-Security (iOS) | No `NSAllowsArbitraryLoads = YES` in `Info.plist` |
| Screenshot/recording in task switcher | Login form contents are NOT visible (consider `FLAG_SECURE` for production builds with sensitive data) |

---

## 9. Release-candidate smoke test

Before publishing to TestFlight / Internal Testing track:

1. `npm run mobile:sync`
2. Generate **signed AAB** (Android Studio → Build → Generate Signed Bundle) and **archived IPA** (Xcode → Product → Archive).
3. Install on at least **one device per OS tier** (see §3).
4. Run the ✓-marked rows in §5 end-to-end on each device — record pass/fail in the release tracker.
5. Verify `versionName` / `CFBundleShortVersionString` matches the Git tag.
6. Capture screen recordings of: login → dashboard → open PDF → download → logout. Attach to the release ticket.
7. Sign-off requires zero ✓ failures and no Sev-1 / Sev-2 bugs open against the build.

---

## 10. Bug-report template

Paste into your tracker when filing a mobile bug:

```
**Test ID:**             (e.g. PDF-04)
**Platform:**            Android 13 / iOS 17.4
**Device:**              Pixel 6 / iPhone 14 (simulator or real)
**App version:**         1.0.0 (build 42)
**Backend env:**         staging
**Network:**             Wi-Fi / 4G / Offline

**Steps to reproduce:**
1.
2.
3.

**Expected:**
**Actual:**

**Logs:**
<paste from `adb logcat -s "Capacitor:V"` / Xcode console>

**Screenshots / recording:**
```

---

## 11. Continuous integration (future)

Not yet automated; recommended additions when bandwidth allows:

- **Vitest in CI** for the web layer (already runnable locally via `npm test` in `apps/api-node`; web tests should be added).
- **Android instrumentation** via Capacitor's `npx cap run android --no-sync` driven from GitHub Actions on a macOS / Linux runner with the Android SDK.
- **iOS smoke** via Xcode Cloud or a self-hosted macOS runner running `xcodebuild test-without-building` against a simulator.
- **Visual regression** with Percy / Chromatic against the web build — catches most UI breakages that bleed through to mobile.

---

## 12. Quick command reference

```bash
# Run web + API stack
docker compose up -d

# Build + sync web bundle into iOS + Android shells
cd apps/web && npm run mobile:sync

# Open native IDEs
npm run mobile:open:android
npm run mobile:open:ios

# Run on a device / emulator
npm run mobile:run:android
npm run mobile:run:ios

# Live-reload against the local Vite dev server (PowerShell)
$env:CAP_SERVER_URL = "http://<your-LAN-ip>:3000"
npx cap sync android
npx cap run android

# Tail Capacitor logs
adb logcat -s "Capacitor:V" "Capacitor/Plugin:V"

# Trigger a deep link (Android)
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://app.iiconacademy.com/admin/schools" com.iiconacademy.app
```

---

## 13. Related documents

- [`MOBILE.md`](./MOBILE.md) — Build & release pipeline (the "how do I compile this?" guide)
- [`DOCUMENTATION.md`](./DOCUMENTATION.md) — Full system docs (backend, web, deployment)
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — Monorepo layout + stack overview
