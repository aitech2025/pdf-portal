# EduPortal Mobile App — Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | latest | `npm install -g eas-cli` |
| Android Studio | latest | https://developer.android.com/studio |
| Xcode | 15+ (macOS only) | Mac App Store |
| Apple Developer Account | $99/year | https://developer.apple.com |
| Google Play Console Account | $25 one-time | https://play.google.com/console |

---

## 1. Initial Setup

### 1.1 Install dependencies
```bash
cd apps/mobile
npm install
```

### 1.2 Log in to Expo
```bash
npx eas-cli login
# Enter your Expo account credentials
# Create one at https://expo.dev if you don't have one
```

### 1.3 Configure EAS for this project
```bash
cd apps/mobile
npx eas-cli init
# This creates a project on expo.dev and links it here
```

### 1.4 Create eas.json
Create `apps/mobile/eas.json`:
```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": { "credentialsSource": "remote" }
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
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### 1.5 Set production API URL
Update `apps/mobile/app.json` to point to your production backend:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.yourdomain.com"
    }
  }
}
```

---

## 2. Android — Google Play Store

### Step 1: Create app on Google Play Console
1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in: App name = "EduPortal", Default language, App/Game, Free/Paid
4. Accept policies → **Create app**

### Step 2: Set up signing (EAS handles this automatically)
```bash
cd apps/mobile
npx eas-cli credentials
# Select: Android → production → Generate new keystore
# EAS stores the keystore securely on their servers
```

### Step 3: Build the Android App Bundle (.aab)
```bash
cd apps/mobile
npx eas build --platform android --profile production
```
- Build runs on Expo's cloud servers (~10-15 min)
- Download the `.aab` file from the link provided

### Step 4: Submit to Google Play
**Option A — Automatic (recommended):**
```bash
npx eas submit --platform android --profile production
# Requires google-service-account.json (see below)
```

**Option B — Manual:**
1. Download the `.aab` from EAS build
2. Go to Play Console → Your app → **Release** → **Production**
3. Click **Create new release**
4. Upload the `.aab` file
5. Add release notes
6. Click **Review release** → **Start rollout to Production**

### Step 5: Create Google Service Account (for automatic submit)
1. Go to https://console.cloud.google.com
2. Create a project or select existing
3. Enable **Google Play Android Developer API**
4. Go to **IAM & Admin** → **Service Accounts** → **Create Service Account**
5. Name it `eas-submit`, grant role **Service Account User**
6. Create key → JSON → download as `google-service-account.json`
7. Place in `apps/mobile/google-service-account.json`
8. In Play Console → **Setup** → **API access** → link the service account

### Step 6: Complete Play Store listing
Required before publishing:
- App icon (512×512 PNG)
- Feature graphic (1024×500 PNG)
- Screenshots (phone + tablet)
- Short description (80 chars)
- Full description
- Privacy policy URL
- Content rating questionnaire
- Target audience

---

## 3. iOS — Apple App Store

> **Requires macOS with Xcode installed, or use EAS cloud build (no Mac needed)**

### Step 1: Create app on App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: EduPortal
   - Primary language: English
   - Bundle ID: `com.eduportal.app` (must match `app.json`)
   - SKU: `eduportal-ios-001`
4. Click **Create**

### Step 2: Set up Apple credentials
```bash
cd apps/mobile
npx eas-cli credentials
# Select: iOS → production
# EAS will automatically:
#   - Create a Distribution Certificate
#   - Create an App Store Provisioning Profile
# Log in with your Apple ID when prompted
```

### Step 3: Build the iOS app (.ipa)
```bash
cd apps/mobile
npx eas build --platform ios --profile production
```
- Build runs on Expo's macOS cloud servers (~15-20 min)
- No Mac required on your end

### Step 4: Submit to App Store
**Option A — Automatic:**
```bash
npx eas submit --platform ios --profile production
# Enter Apple ID and app-specific password when prompted
```

**Option B — Manual via Transporter:**
1. Download the `.ipa` from EAS build
2. Install **Transporter** from Mac App Store
3. Open Transporter → Add `.ipa` → Deliver

### Step 5: Complete App Store listing
In App Store Connect → Your app → **App Store** tab:
- App previews and screenshots (6.7", 6.5", 5.5" iPhone + iPad)
- Description
- Keywords (100 chars)
- Support URL
- Privacy Policy URL
- Age rating
- Category: Education

### Step 6: Submit for review
1. Go to **TestFlight** first to test internally
2. When ready: **App Store** → **+** next to iOS App → select build
3. Fill in **What's New**
4. Click **Add for Review** → **Submit to App Review**
5. Review takes 1-3 business days

---

## 4. TestFlight (iOS Beta Testing)

Before submitting to App Store, test with real users:

```bash
# Build for TestFlight
npx eas build --platform ios --profile preview

# Submit to TestFlight
npx eas submit --platform ios
```

Then in App Store Connect:
1. Go to **TestFlight** tab
2. Add internal testers (up to 100 Apple IDs)
3. Or create external test group (up to 10,000 users, requires brief review)

---

## 5. Android Internal Testing (APK)

Test on real Android devices before Play Store:

```bash
# Build a direct-install APK
npx eas build --platform android --profile preview

# Download APK and share the link
# Or install directly: adb install app.apk
```

Or use Play Console **Internal Testing** track:
```bash
npx eas submit --platform android --track internal
```

---

## 6. Over-the-Air (OTA) Updates

For JS/UI changes that don't require a new store submission:

```bash
# Push update instantly to all users
npx eas update --branch production --message "Fix login bug"
```

Users get the update automatically on next app launch.
**Note:** Native code changes (new packages, permissions) still require a full store build.

---

## 7. Environment Configuration

Create `apps/mobile/.env.production`:
```
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

Update `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.yourdomain.com",
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## 8. Full Release Checklist

### Before every release
- [ ] Update `version` in `app.json`
- [ ] Increment `versionCode` (Android) / `buildNumber` (iOS) in `app.json`
- [ ] Test on physical Android device
- [ ] Test on physical iPhone (via TestFlight)
- [ ] Verify API URL points to production
- [ ] Check all environment variables are set

### Android `app.json` versioning
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

### iOS `app.json` versioning
```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    }
  }
}
```

---

## 9. Quick Reference Commands

```bash
# Start dev server
npx expo start

# Build for Android (production)
npx eas build --platform android --profile production

# Build for iOS (production)
npx eas build --platform ios --profile production

# Build both platforms
npx eas build --platform all --profile production

# Submit Android to Play Store
npx eas submit --platform android

# Submit iOS to App Store
npx eas submit --platform ios

# Push OTA update
npx eas update --branch production --message "Description"

# View build status
npx eas build:list

# View submission status
npx eas submit:list
```

---

## 10. Costs Summary

| Service | Cost |
|---------|------|
| Apple Developer Program | $99/year |
| Google Play Console | $25 one-time |
| Expo EAS Build (free tier) | 30 builds/month free |
| Expo EAS Build (production) | $29/month for unlimited |
| EAS Update (OTA) | Free up to 1M updates/month |
