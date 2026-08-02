# Android Production Deployment Guide: i-icon Academy

A complete, beginner-friendly guide to publishing the i-icon Academy mobile application to the Google Play Store Production track.

---

## 1. Introduction

### What This Guide Covers

This guide walks you through every step required to publish the **i-icon Academy** mobile application to the **Google Play Store** in the Production track. You'll learn how to:

- Set up your development environment
- Configure the Android application for production
- Generate cryptographic signing credentials
- Build a production-ready app bundle
- Create a Google Play Console application entry
- Configure required store information and assets
- Upload and publish your application
- Monitor releases and handle updates

### What Will Be Achieved

By following this guide, you will:
1. ✅ Have a fully configured local development environment for Android app deployment
2. ✅ Successfully generate a signed Android App Bundle (AAB) file
3. ✅ Create and configure your application in Google Play Console
4. ✅ Upload required store assets (screenshots, icons, descriptions)
5. ✅ Comply with all Google Play policies and requirements
6. ✅ Publish your free application to millions of Android users worldwide
7. ✅ Be equipped to release future updates and monitor app performance

### Estimated Deployment Time

- **First deployment:** 4-6 hours (most time spent waiting for builds and Google review)
- **Future updates:** 1-2 hours (process becomes faster with experience)

### Required Accounts

Before you begin, ensure you have:
- **Google Account** — Your personal or business Google account (e.g., aiapptech2025@gmail.com)
- **Google Play Console Developer Account** — Created via Google Play Console ($25 one-time fee)
- **Expo Account** — Already created (aiapptech2025s-organization) with project linked

### Required Software & Tools

All of the following must be installed on your computer:
- **Node.js** (v18 or later) — JavaScript runtime
- **npm or pnpm** — Package manager (the project uses pnpm)
- **Git** — Version control system
- **Android SDK** — Android development toolkit
- **Java JDK** — Java Development Kit (required by Android SDK)

---

## 2. Prerequisites

Before starting, verify that all required tools are installed and properly configured on your computer.

### 2.1 Google Account

**Why it's needed:** Google accounts are the identity used to access Google Play Console and manage your application listing.

**What to do:**
- Use an existing Google account (e.g., aiapptech2025@gmail.com)
- Ensure you have access to this email address and can receive verification codes
- If this is a business account, ensure you have permission to spend $25 on the developer registration fee

**How to verify:**
1. Visit https://accounts.google.com
2. Sign in with your email address
3. You should see your Google Account dashboard
4. If prompted, complete any security verification (2FA codes, etc.)

### 2.2 Google Play Console Developer Account

**Why it's needed:** Google Play Console is the platform where you create, configure, and publish apps to the Play Store.

**Cost:** $25 one-time registration fee (required before publishing any app)

**What to do:**
1. Visit https://play.google.com/console
2. Sign in with your Google account
3. If this is your first time, you'll see a message: "No apps yet"
4. Click the **Create app** button (we'll detail this in Section 7)
5. Accept the terms and conditions
6. Complete your developer profile with:
   - Developer name
   - Developer email
   - Phone number
   - Website (can be your organization's website)
   - Address (must be a physical address)

**How to verify:**
- After creating your developer account, you should see the Google Play Console dashboard
- You should be able to navigate to **All apps** and see an empty list (or existing apps)
- The $25 registration fee should have been processed

💡 **Tip:** Use a business Google account if this is for an organization. Personal accounts work too, but business accounts may be easier to manage if multiple people need access later.

### 2.3 Node.js and npm/pnpm

**Why it's needed:** The mobile app is built using React Native/Expo, which requires Node.js and a package manager to install dependencies and build the application.

**How to install Node.js:**

Visit https://nodejs.org and download the **LTS (Long Term Support)** version:
1. Go to https://nodejs.org
2. Click the **LTS** button (recommended for most users)
3. Download the installer for your operating system (Windows, Mac, or Linux)
4. Run the installer and follow the prompts
5. Accept default installation settings
6. When the installer completes, close it

**How to verify Node.js installation:**

Open a terminal (Command Prompt on Windows or Terminal on Mac/Linux) and run:

```bash
node --version
# Expected output: v18.x.x or higher (e.g., v20.10.0)

npm --version
# Expected output: 9.x.x or higher (e.g., 10.2.5)
```

If you see version numbers, Node.js and npm are installed correctly.

**pnpm (Project Package Manager):**

The i-icon Academy project uses pnpm instead of npm. Install it globally:

```bash
npm install -g pnpm
```

Verify pnpm installation:

```bash
pnpm --version
# Expected output: 8.x.x or higher
```

### 2.4 Git

**Why it's needed:** Git allows you to clone (download) the project repository and manage version control.

**How to install Git:**

Visit https://git-scm.com:
1. Go to https://git-scm.com
2. Click **Download** for your operating system
3. Run the installer with default settings
4. Verify installation by opening a terminal and running:

```bash
git --version
# Expected output: git version 2.x.x
```

**Configure Git (one-time setup):**

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2.5 Java JDK (Java Development Kit)

**Why it's needed:** The Android SDK requires Java to compile Android applications.

**How to install Java JDK:**

1. Visit https://www.oracle.com/java/technologies/downloads/ (Oracle's official Java downloads)
2. Download **JDK 17** or **JDK 21** (latest LTS version)
3. Accept the Oracle License Agreement
4. Download the installer for your operating system
5. Run the installer and follow prompts
6. Use default installation paths
7. Accept the license terms

**How to verify Java installation:**

Open a terminal and run:

```bash
java -version
# Expected output: java version "17.0.x" or higher

javac -version
# Expected output: javac 17.0.x or higher
```

⚠️ **Common Mistake:** Installing Java without setting the JAVA_HOME environment variable. After installation, you may need to:
1. Find your Java installation directory (typically `C:\Program Files\Java\jdk-17` on Windows)
2. Add it to your system PATH and create a JAVA_HOME variable

**Windows:** 
- Right-click **This PC** → **Properties** → **Advanced system settings** → **Environment Variables**
- Create new variable: **JAVA_HOME** = `C:\Program Files\Java\jdk-17`
- Edit PATH and add: `%JAVA_HOME%\bin`

### 2.6 Android SDK

**Why it's needed:** The Android SDK provides all the tools, emulators, and libraries needed to build Android applications.

**How to install Android SDK:**

The easiest way is to install **Android Studio**, which includes the Android SDK.

1. Visit https://developer.android.com/studio
2. Click **Download Android Studio** for your operating system
3. Run the installer and follow prompts
4. During setup, select:
   - **Standard Installation** (not Custom)
   - Agree to all license agreements
   - Install recommended components (Android SDK, Android SDK Platform-Tools, Android Emulator)
5. Complete installation (this may take 10-15 minutes as it downloads large files)

**How to verify Android SDK installation:**

After Android Studio opens, verify the SDK:
1. Open Android Studio
2. Go to **Tools** → **SDK Manager**
3. You should see:
   - **Android SDK Location:** (typically `C:\Users\YourName\AppData\Local\Android\Sdk` on Windows)
   - **SDK Platforms:** Android 14 (API 34) or higher installed
   - **SDK Tools:** Build Tools, Android SDK Platform-Tools, Google Play services

💡 **Tip:** If Android Studio doesn't open properly or shows errors, you may need to set the ANDROID_HOME environment variable:
- **Windows:** Create environment variable `ANDROID_HOME` = `C:\Users\YourName\AppData\Local\Android\Sdk`
- Add to PATH: `%ANDROID_HOME%\platform-tools`

### 2.7 EAS CLI (Expo Application Services)

**Why it's needed:** EAS CLI builds and submits your app to Google Play Store. It's a cloud-based build service that makes building Android apps much easier (you don't need to install Android Studio or complex toolchains).

**How to install EAS CLI:**

```bash
npm install -g eas-cli
```

**How to verify installation:**

```bash
eas --version
# Expected output: eas-cli/x.x.x (should be version 10.0.0 or higher)
```

### 2.8 Internet Connection

**Why it's needed:** Building and publishing apps requires downloading large amounts of data from Google Play, Expo servers, and Maven repositories.

**Requirements:**
- Stable, reliable internet connection
- At least 5 Mbps download speed (faster is better for large build files)
- Ability to leave builds running for 15-30 minutes without interruption

---

## 3. Verify Project Readiness

Before proceeding with deployment, verify that the project is ready for production.

### 3.1 Clone or Navigate to Project

If you haven't already, clone the repository:

```bash
git clone https://github.com/your-org/pdf-portal.git
cd pdf-portal
```

Or navigate to an existing clone:

```bash
cd c:\Users\navee\OneDrive\Desktop\Pet-Projects\EduTech\pdf-portal
```

### 3.2 Install All Dependencies

From the repository root, install all project dependencies:

```bash
pnpm install
```

**Expected output:**
- No errors (warnings are usually OK)
- Completion message: "Done in X seconds"
- New `node_modules` directories created in the project

⚠️ **Common Mistake:** Running `npm install` instead of `pnpm install`. This can cause dependency conflicts. Always use `pnpm` for this project.

### 3.3 Verify Mobile App Structure

Check that the mobile app directory exists and has required files:

```bash
# List the mobile app directory
ls -la apps/mobile/

# Expected files/directories:
# - app.json (Expo configuration)
# - app.config.js (Dynamic Expo configuration)
# - eas.json (Build and submit profiles)
# - package.json (Mobile app dependencies)
# - assets/ (Icons and splash screens)
# - src/ (React Native source code)
```

### 3.4 Verify Required Assets Exist

The following image files must exist before building for production:

```bash
# Check if assets directory has required files
ls -la apps/mobile/assets/

# Required files:
# - icon.png (1024 × 1024 px)
# - splash.png (1284 × 2778 px)
# - adaptive-icon.png (1024 × 1024 px)
# - notification-icon.png (96 × 96 px)
# - logo-mark.png (optional, already exists)
```

If any of these files are missing, see **Section 9: Create Store Assets** to create them.

### 3.5 Verify Environment Configuration

Check that `app.config.js` exists and is properly configured:

```bash
cat apps/mobile/app.config.js
```

Look for:
- `EXPO_PUBLIC_API_URL` environment variable being injected
- Production profile pointing to `https://iiconacademy.in`
- Correct package name (`com.iiconacademy.app`)

### 3.6 Verify Backend Connectivity

Test that the production backend is accessible:

```bash
# On any computer with internet access, test the backend
curl https://iiconacademy.in/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Expected: Either valid JSON response or error message (not network timeout)
```

If this fails with network timeout, the backend is not accessible. The app won't work if it can't reach the backend.

### 3.7 Verify Build Configuration

Check that `eas.json` has the correct production profile:

```bash
cat apps/mobile/eas.json
```

Look for:
```json
"production": {
  "channel": "production",
  "android": { "buildType": "app-bundle" },
  "env": { "EXPO_PUBLIC_API_URL": "https://iiconacademy.in" }
}
```

### Verification Summary

✅ **Before proceeding to Section 4, confirm:**
- [ ] All prerequisites (Java, Android SDK, Node.js, pnpm, Git, EAS CLI) are installed
- [ ] `pnpm install` completed successfully from project root
- [ ] Mobile app directory (`apps/mobile/`) exists with expected structure
- [ ] All 4 required image assets exist in `apps/mobile/assets/`
- [ ] `app.config.js` is configured correctly
- [ ] Backend (`https://iiconacademy.in`) is accessible
- [ ] `eas.json` has correct production profile

If any of these checks fail, go back and fix the issue before continuing.

---

## 4. Configure Android Project

The Android project configuration determines how your app appears on the Play Store, what device features it can access, and how it identifies itself. This section explains each configuration file.

### 4.1 Understanding app.json

**Location:** `apps/mobile/app.json`

**Purpose:** Static Expo configuration file that defines basic app information that never changes.

**What it contains:**

```json
{
  "expo": {
    "name": "i-icon Academy",
    "slug": "iiconacademy",
    "version": "1.0.0",
    "description": "Access curated educational content for your school",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#4f46e5"
    },
    "assetBundlePatterns": ["**/*"],
    "plugins": ["expo-router"],
    "android": {
      "package": "com.iiconacademy.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#4f46e5"
      },
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**Key fields to verify:**

| Field | Purpose | Current Value | Notes |
|-------|---------|---|---|
| `name` | App display name on Play Store | i-icon Academy | Must match Play Console app name |
| `slug` | Internal identifier | iiconacademy | Used in URLs and identifiers |
| `version` | Human-readable version (shown to users) | 1.0.0 | Bump this for store releases |
| `icon` | App icon file | ./assets/icon.png | 1024×1024 px PNG required |
| `package` | Unique Android package name | com.iiconacademy.app | Cannot change after first Play Store submission |
| `versionCode` | Internal version number (must increase) | 1 | Increment for each Play Store release |
| `adaptiveIcon` | Icon for newer Android devices | ./assets/adaptive-icon.png | 1024×1024 px PNG |
| `permissions` | Android features the app uses | See above | Only include needed permissions |

### 4.2 Understanding app.config.js

**Location:** `apps/mobile/app.config.js`

**Purpose:** Dynamic Expo configuration that changes based on build environment. This is where you inject environment-specific variables like different API URLs for dev/test/production.

**What it typically contains:**

```javascript
export default ({ config }) => {
  return {
    ...config,
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://iiconacademy.in",
      environment: process.env.EAS_BUILD_PROFILE || "development",
    },
  };
};
```

**How it works:**
1. Reads environment variables from `eas.json` build profiles
2. Injects them into the app's `expo.extra` object
3. Your app code accesses these via `Constants.expoConfig.extra.apiUrl`

**For production:**
- Should inject `EXPO_PUBLIC_API_URL=https://iiconacademy.in`
- This is configured in `eas.json` under the production profile

**How to verify:**
```bash
# Check that environment variable is being set
grep -A 5 "EXPO_PUBLIC_API_URL" apps/mobile/eas.json
# Should see: "env": { "EXPO_PUBLIC_API_URL": "https://iiconacademy.in" }
```

### 4.3 Understanding eas.json

**Location:** `apps/mobile/eas.json`

**Purpose:** EAS-specific configuration for building and submitting apps. Defines different build profiles for different purposes (development, preview, production).

**What it contains:**

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
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

**Understanding build profiles:**

| Profile | Purpose | Output | API URL |
|---------|---------|--------|---------|
| **development** | Local testing with Expo Dev Client | .apk | Local dev backend (http://...) |
| **preview** | Testing before Play Store release | .apk | Production backend (https://...) |
| **production** | Final release to Play Store | .aab (App Bundle) | Production backend (https://...) |

**Key fields for production:**

- `buildType: "app-bundle"` — Creates `.aab` file (required by Play Store, smaller than APK)
- `EXPO_PUBLIC_API_URL` — Must be `https://iiconacademy.in` for production
- `serviceAccountKeyPath` — Path to Google Service Account JSON (created in Section 5)
- `track: "production"` — Submit directly to Production track (not testing tracks)

### 4.4 Verify AndroidManifest.xml

**Location:** `apps/mobile/android/app/src/main/AndroidManifest.xml`

**Purpose:** Defines Android-specific permissions and app configuration.

**What it defines:**
- App permissions (camera, internet, storage, etc.)
- Activities (screens) the app has
- Services and receivers
- Push notification configuration

**For this app, required permissions:**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**How to verify:**
```bash
# Check that permissions are declared
grep -i "uses-permission" apps/mobile/android/app/src/main/AndroidManifest.xml
# Should see INTERNET and STORAGE permissions at minimum
```

⚠️ **Important:** Every permission declared here must be justified to Google Play. Only include permissions the app actually uses.

### 4.5 Configure Package Name (One-Time)

**Package Name:** `com.iiconacademy.app`

This is the unique identifier for your app on Google Play. It **cannot be changed** after the first Play Store submission, so verify it's correct now.

**Location:** `apps/mobile/app.json`

```json
"android": {
  "package": "com.iiconacademy.app"
}
```

**Rules for package names:**
- Must be unique across all Play Store (no two apps can have the same package name)
- Typically follows reverse domain notation: `com.company.appname`
- Must contain only letters, numbers, and periods
- Cannot start or end with a period
- No single component can be more than 64 characters

**Verification:**
```bash
# Verify package name in app.json
grep -i '"package"' apps/mobile/app.json
# Expected: "package": "com.iiconacademy.app"
```

### 4.6 Configure Version Numbers

**Two version numbers must be tracked:**

**1. `versionCode` (internal):**
- Integer that increments with each build
- Android uses this to determine which app is "newer"
- Must always increase, even if human-readable version doesn't change
- Example progression: 1, 2, 3, 4, 5 ...

**2. `version` (human-readable):**
- Shown to users on Play Store
- Format: MAJOR.MINOR.PATCH (e.g., 1.0.0, 1.0.1, 1.1.0)
- Users care about this more than versionCode

**In app.json:**
```json
"version": "1.0.0",
"android": {
  "versionCode": 1
}
```

**For first production release:**
- `version`: "1.0.0" (or current version)
- `versionCode`: 1

**For future releases:**
```json
// Release 2
"version": "1.0.1",  // Minor bug fixes
"versionCode": 2

// Release 3
"version": "1.1.0",  // New features
"versionCode": 3

// Release 4
"version": "2.0.0",  // Major rewrite
"versionCode": 4
```

### 4.7 Configure Permissions Correctly

**Location:** `apps/mobile/app.json`

**Why permissions matter:** Google Play reviews apps to ensure they only request permissions they actually use. Requesting permissions you don't use can get your app rejected.

**Common permissions this app uses:**

```json
"permissions": [
  "android.permission.INTERNET",              // Network access
  "android.permission.READ_EXTERNAL_STORAGE", // Download PDFs
  "android.permission.WRITE_EXTERNAL_STORAGE",// Save PDFs locally
  "android.permission.CAMERA",                // Video lessons (if using camera)
  "android.permission.ACCESS_NETWORK_STATE"   // Check connectivity
]
```

**Permissions to avoid (unless used):**
- `ACCESS_FINE_LOCATION` — GPS tracking (will be questioned)
- `SEND_SMS` — Text message sending
- `RECORD_AUDIO` — Microphone access
- `READ_CONTACTS` — Contact list access

**How to verify:**
1. Check that each permission in `app.json` is actually used in the app code
2. Search codebase for permission usage:
   ```bash
   grep -r "INTERNET\|EXTERNAL_STORAGE\|CAMERA" apps/mobile/src/
   ```
3. If permission isn't used anywhere, remove it from `app.json`

### Configuration Verification

✅ **Verify before proceeding:**
- [ ] `app.json` has correct app name, package, and icon paths
- [ ] `app.config.js` is configured to inject `EXPO_PUBLIC_API_URL`
- [ ] `eas.json` has production profile with correct settings
- [ ] Package name is unique and final: `com.iiconacademy.app`
- [ ] Version and versionCode are set correctly (e.g., 1.0.0 and 1)
- [ ] All permissions in `app.json` are actually used by the app
- [ ] Required image assets (icon, splash, adaptive-icon, notification-icon) exist

---

## 5. Generate Android Signing Key

Your app must be digitally signed before submission to Google Play. This section explains the signing process and walks you through generating the required keys.

### 5.1 Understanding Digital Signing

**What is signing?**
Digital signing proves that your app was created by you and hasn't been tampered with. It's done using cryptographic keys (mathematically generated).

**Two types of keys in Android:**

**1. Upload Key (created by you)**
- You use this to sign the app bundle you upload to Google Play
- You keep this key private and secure
- If you lose this key, you cannot upload new versions of your app
- After first upload, Google Play takes over and manages this key

**2. App Signing Key (managed by Google)**
- Google creates this key from your upload key
- Google uses this key to sign the actual app that users download
- Users don't need to know about this key
- It's more secure because Google controls it

**Why this matters:** Google manages the key that users trust, but you manage the upload key. Both are important.

### 5.2 EAS CLI Handles Signing Automatically

**The good news:** EAS CLI (Expo's build service) handles key generation and signing automatically. You don't need to manually create keystores.

**Here's what happens:**

1. **First production build:**
   - You run: `eas build --platform android --profile production`
   - EAS CLI prompts: "Set up signing for Android?"
   - You respond: Yes
   - EAS generates a keystore (signing key) and stores it securely on EAS servers
   - Your app is signed with this key
   - The signed AAB is uploaded to Google Play

2. **Subsequent builds:**
   - EAS uses the same key from its servers
   - Your app continues to be signed with the same key
   - This is required for Play Store updates (must use same key)

### 5.3 Local Keystore Backup (Optional)

**Note:** Backing up your keystore locally is optional because EAS stores it on their secure servers. However, for extra security, you can download and back up your keystore.

**Why backup locally:**
- Insurance if EAS servers are compromised
- Ability to build offline or without EAS
- Compliance requirements

**How to download keystore from EAS:**

1. Run a production build first (this creates the keystore):
   ```bash
   cd apps/mobile
   eas build --platform android --profile production
   ```

2. After build completes, go to EAS dashboard:
   https://expo.dev/accounts/aiapptech2025s-organization/projects/iiconacademy/builds

3. Click on the production build
4. In the build details, look for **Keystores** section
5. Download the Android keystore file

4. Save the keystore securely:
   ```bash
   # Create a secure backups directory
   mkdir ~/keystores-backup
   
   # Copy keystore there (replace FILENAME with actual filename)
   cp keystore-file.jks ~/keystores-backup/
   
   # Secure it
   chmod 600 ~/keystores-backup/keystore-file.jks
   ```

⚠️ **Critical Security:** 
- Never commit keystore files to Git
- Store backups in an encrypted external drive or password-protected cloud storage
- Keep the keystore password (and alias password) in a secure password manager
- If your keystore is compromised, anyone can upload fake updates to your app

### 5.4 Keystore Information You'll Need to Remember

During the first EAS build, you'll be asked for keystore information. Write these down and store securely (password manager):

**Information to save:**
- Keystore file path / filename
- Keystore password
- Key alias (nickname for the key)
- Key password
- Key distinguished name (DN) — optional, EAS can generate this

**Example (don't use these values, create your own):**
```
Keystore file: iiconacademy.jks
Keystore password: SecurePassword123!@#
Key alias: iiconacademy-key
Key password: KeyPassword456!@#
```

Store this in a password manager with category "Mobile Deployment" or similar.

### 5.5 Signing Key Verification

After your first production build, verify the signing key was created correctly:

**In EAS Dashboard:**
1. Go to https://expo.dev/accounts/aiapptech2025s-organization/projects/iiconacademy/builds
2. Click on the production build
3. Scroll to **Keystores** section
4. You should see:
   - Android keystore created
   - Creation date
   - Fingerprint (SHA1)

**In Google Play Console (after first upload):**
1. Go to Google Play Console
2. Go to your app: **i-icon Academy**
3. Navigate to **Setup** → **App Integrity** → **App signing**
4. You should see:
   - Upload certificate (from EAS)
   - App signing certificate (from Google)
   - Both certificates have fingerprints matching

If these don't match, there's a signing configuration problem. Go to Section 11: Troubleshooting.

### Signing Verification

✅ **Verify signing is configured:**
- [ ] You understand what signing means and why it's required
- [ ] You've received confirmation that you'll use EAS-managed signing
- [ ] You know where to find signing key information if needed
- [ ] You understand not to lose or compromise your keystore

---

## 6. Build Production App Bundle

An App Bundle (AAB file) is the format Google Play requires for app distribution. It's smaller and more efficient than APK files and allows Play Store to automatically create optimized APKs for each device type.

### 6.1 What is an App Bundle?

**App Bundle (AAB):**
- File format required by Google Play Store
- Combines all resources (code, images, strings) into one package
- Google Play creates optimized APKs for each device type
- ~20% smaller than distributing single APK
- Faster downloads for users
- You upload the AAB; Google generates the APKs

**APK (Android Package):**
- Traditional Android app file format
- Contains everything in one file (not optimized)
- Useful for testing, not recommended for production
- We use APK for preview builds (testing before Play Store)

### 6.2 Prerequisites for Building

Before building, ensure:

1. **All dependencies installed:**
   ```bash
   cd /path/to/pdf-portal
   pnpm install
   ```

2. **Logged into EAS CLI:**
   ```bash
   eas login
   # Follow prompts to sign in with Expo account
   ```

3. **Project linked to EAS:**
   ```bash
   cd apps/mobile
   eas project:info
   # Should show: Project: iiconacademy, Owner: aiapptech2025s-organization
   ```

4. **All required assets in place:**
   ```bash
   ls apps/mobile/assets/
   # Must have: icon.png, splash.png, adaptive-icon.png, notification-icon.png
   ```

5. **Configuration verified (see Section 4)**

### 6.3 Build Preview APK First (Recommended)

**Before building for Play Store, build a preview APK to test on actual devices.**

This catches configuration errors early and lets you test the app thoroughly.

```bash
cd apps/mobile

# Build preview APK (points to production backend)
eas build --platform android --profile preview
```

**What happens:**
1. EAS CLI connects to your Expo account
2. Uploads your code to EAS servers
3. Compiles your React Native code
4. Creates an APK file
5. Takes 10-20 minutes
6. Prints a QR code and download link

**Expected output:**
```
Build queued: ...
Build ID: abc123...
Waiting for app to build...
Build logs:
  ...compiling...
  ...bundling...
  ...signing...

Build finished successfully!

You can download the build at:
https://expo.dev/artifacts/abc123...

Or scan the QR code below to download and install immediately:
[QR CODE]
```

**Install on test device:**

Option A — Scan QR code:
1. On Android device, open camera
2. Point at QR code displayed
3. Tap notification to install

Option B — Download and install via ADB:
```bash
# Download the APK
# Then install with ADB
adb install preview-build.apk
```

**Test thoroughly:**
- [ ] App launches without crashing
- [ ] Login works with test account
- [ ] Can browse content
- [ ] Can download PDFs
- [ ] Can watch videos
- [ ] Logout works
- [ ] No obvious errors or warnings

If there are errors, fix them in code and rebuild before proceeding to production build.

### 6.4 Build Production App Bundle

Once preview build is tested and working, build the production AAB:

```bash
cd apps/mobile

# Build production app bundle
eas build --platform android --profile production
```

**First time only — signing configuration:**

If this is your first production build, EAS will ask:

```
Set up Android signing credentials? (y/n) › y

Are you sure you want to set up signing credentials for Android? (y/n) › y

Use existing keystore or create new? 
  › Create new
  
Keystore password: ••••••••
Confirm password: ••••••••
Key alias: iiconacademy-key
Key password: ••••••••
Confirm password: ••••••••
Distinguished Name: (press enter for default)
```

**Fill in:**
- **Keystore password:** Create a strong password (12+ characters, mix upper/lower/numbers/symbols)
- **Key alias:** `iiconacademy-key` (or any name you prefer)
- **Key password:** Can be same as keystore password or different
- **Distinguished Name:** Press Enter to use defaults (EAS generates this)

**Save these values securely** in a password manager!

**Expected output:**
```
Keystore created successfully!
Build queued: ...
Build ID: xyz789...

Building...
  ...compiling...
  ...creating bundle...
  ...signing...
  ...uploading artifacts...

Build finished successfully!

You can download the build at:
https://expo.dev/artifacts/xyz789...
```

Build time: 15-25 minutes

### 6.5 Download the App Bundle

After build completes, download the `.aab` file:

```bash
# Option 1: Use the link printed by EAS
# Copy the download link to your browser

# Option 2: Use EAS CLI
eas build:download --platform android --profile production
```

**What you get:**
- File named something like: `iiconacademy-production-abc123.aab`
- File size: 50-100 MB (depending on app size)
- Can only be uploaded to Google Play (not for direct installation)

### 6.6 Verify the App Bundle

Verify the AAB file is valid:

```bash
# Check file exists and has reasonable size
ls -lh iiconacademy-production-*.aab
# Expected: ~50-100 MB file

# Verify it's a valid ZIP archive (AAB is a ZIP file)
unzip -t iiconacademy-production-*.aab | head -20
# Should show list of files without errors
```

**Common issues:**
- File is 0 bytes — Build failed, download correct file from EAS dashboard
- Cannot unzip — File is corrupted, try downloading again
- File is too small (< 30 MB) — Check that build included all assets

### 6.7 Store the App Bundle Safely

Keep the AAB file secure until upload:

```bash
# Create a releases directory
mkdir -p releases/production

# Move the AAB there
mv iiconacademy-production-*.aab releases/production/

# Verify it's there
ls -lh releases/production/
```

💡 **Tip:** Save the AAB file with a version number for tracking:
```bash
mv iiconacademy-production-xyz789.aab releases/production/iiconacademy-v1.0.0.aab
```

### Build Verification

✅ **Verify build was successful:**
- [ ] Preview APK built and tested successfully on device
- [ ] No crashes or major errors in preview
- [ ] Production AAB built without errors
- [ ] AAB file downloaded and verified
- [ ] AAB file stored safely for upload

⚠️ **Common Mistakes:**
- Trying to upload APK instead of AAB to Play Store (won't work)
- Building with wrong profile (dev or preview instead of production)
- Using wrong API URL (app would point to development backend)
- Assets missing during build (icons or splash not found)

If any step failed, check Section 11: Troubleshooting.

---

## 7. Create Google Play Console App

Google Play Console is where you manage your app on the Play Store. This section walks you through creating your app listing step-by-step.

### 7.1 Login to Google Play Console

1. Visit https://play.google.com/console
2. Sign in with your Google account (aiapptech2025@gmail.com)
3. You should see the **All apps** page with a list of apps (or empty if this is first app)

### 7.2 Create New App

On the **All apps** page:

1. Click the **Create app** button (top right corner)
2. You'll see the **Create app** dialog with several fields to fill:

#### Step 1: App Name
**Field:** "App name"
**Enter:** `i-icon Academy`
**Why:** This is the name users see on Play Store

#### Step 2: Default Language
**Field:** "Default language"
**Select:** English (United States) or English (India)
**Why:** This is the primary language for your store listing

#### Step 3: App Type
**Field:** "App or game"
**Select:** "App"
**Why:** Your application is not a game

#### Step 4: Free or Paid
**Field:** "Free or Paid"
**Select:** "Free"
**Why:** This app doesn't charge users
**⚠️ Important:** Cannot change this after first submission! Free apps stay free.

#### Step 5: Declarations
Check all applicable boxes:
- [ ] "I confirm this app complies with Google Play policies"
- [ ] "I acknowledge that I must complete all required declarations and questionnaires to keep the app on Google Play"

**Click to accept:**
- "Google Play App Distribution Agreement"
- "Google Play Program Policies" 
- "Content rating questionnaire"

3. Click **Create app** button

**Expected result:**
- App dashboard appears
- Shows "App details", "Store listing", "Release" sections
- Status shows as "Draft" (not yet published)

### 7.3 Note Your Package Name

After creating the app, verify the package name is correct:

1. On the app dashboard, click **App details** (left sidebar)
2. Look for **App details** section
3. Find **Package name:** field
4. Should show: `com.iiconacademy.app`
5. This must exactly match the `package` field in `app.json`

If it doesn't match, you have a configuration error. Fix `app.json` and rebuild.

### App Creation Verification

✅ **Verify app created successfully:**
- [ ] Logged into Google Play Console
- [ ] App "i-icon Academy" appears in apps list
- [ ] Can access app dashboard
- [ ] Package name is correct: `com.iiconacademy.app`
- [ ] App status shows as "Draft"

---

## 8. Configure Google Play Console

Before uploading your app, you must fill in required information and provide assets. Google Play won't publish your app without these.

### 8.1 Dashboard Overview

Your app's dashboard in Google Play Console has these sections on the left:

**Important for first release:**
- Store listing (app name, description, screenshots)
- App details (ratings, categories, pricing)
- Content rating
- App access (login info for testers)
- Data safety
- Release management

### 8.2 Store Listing Configuration

**Location:** Click **Store listing** (left sidebar)

This is where you create the "store page" users see when they search for your app.

#### Store Name
**Field:** "App name (50 characters max)"
**Enter:** `i-icon Academy`
**Why:** Shown prominently at top of store page

#### Short Description
**Field:** "Short description (80 characters max)"
**Enter:** `Access curated educational content for your school`
**Why:** Shown in search results and store listing preview

#### Full Description
**Field:** "Full description (4000 characters max)"
**Template:**
```
i-icon Academy is a mobile application designed for students
and educators to access high-quality educational content curated
specifically for each school.

Features:
• Browse a comprehensive library of educational PDFs
• View high-quality video lessons
• Download content for offline viewing
• Track your learning progress
• Bookmark your favorite materials
• Watermarked PDFs ensure content security

The app is connected to your school's curriculum and provides
access to content relevant to your program, class, and subjects.

Login with your school account to get started.
```

#### Category
**Field:** "Category"
**Select:** "Education"
**Why:** Correct category for educational app

#### Contact Email
**Field:** "Email address"
**Enter:** `aiapptech2025@gmail.com`
**Why:** Google uses this to contact you about policy violations or urgent issues

#### Website
**Field:** "Website (optional)"
**Enter:** Your organization's website (or leave blank)

#### Graphics & Media
This section requires images. See **Section 9: Create Store Assets** for creating these images.

**Required images:**
- App icon (512×512 px)
- Feature graphic (1024×500 px)
- Screenshots (min 2, max 8)

We'll upload these in Section 9.

### 8.3 App Details Configuration

**Location:** Click **App details** (left sidebar)

#### App Category
**Field:** "Category"
**Select:** "Education"

#### Content Rating
**Status:** Mark as "Complete" (do this in **Content rating** section separately)

#### Target Audience
**Field:** "Users may be"
**Select:** "All" or specify age range if you want (e.g., 13+ for teen-focused content)

#### Privacy Policy
**Status:** Mark as required (we'll add URL in step 8.7)

### 8.4 Content Rating

**Location:** Click **Content rating** (left sidebar)

Content rating is mandatory. Google uses a questionnaire to assign appropriate rating.

#### Complete the Questionnaire
1. Click **Continue** or **Complete questionnaire**
2. Answer questions honestly:
   - Does app contain violence? → No
   - Does app contain mature content? → No
   - Does app collect personal information? → Yes (email, name for login)
   - Does app contain alcohol/drugs references? → No
   - Other content categories → No

3. Click **Save**

**Expected result:**
- Google assigns rating (usually "Everyone" or "Everyone 10+"" for educational apps)
- You'll see: "Content rating: Everyone"

### 8.5 App Access

**Location:** Click **App access** (left sidebar)

This section requires you to specify how the app's content is accessed.

#### Access Level
**Field:** "How do users access your app's core functionality?"

**Select:** "All or some functionality is restricted"

**Explain:** Select this because login is required to access content

#### Restricted Functionality Reason
**Text:** "Users must log in with their school account to access educational content. This ensures content is only available to authorized students and educators."

#### Test Account
**Provide test account credentials:**
- Email: `test.student@example.com` (create this in your backend first)
- Password: Strong password (e.g., `TestPassword123!@`)
- Any additional info: "Login as student; can browse content"

**Why:** Google reviewers need to test your app during review process

### 8.6 Data Safety

**Location:** Click **Data safety** (left sidebar)

This is where you declare what data the app collects and how it's used.

#### Data Collected
1. Click **Manage**
2. Add data types that your app collects:

**Personal Information:**
- ✅ Name (for login)
- ✅ Email address (for login)
- ✅ User IDs (account identification)

**App Activity:**
- ✅ App interactions (user actions for analytics)

**Sensitive Information:**
- ✅ Educational data (if tracking grades/progress)

For each data type, specify:
- **Required/Optional:** Required for login, Optional for analytics
- **Ephemeral:** No (data is stored on servers)
- **Purpose:** User authentication, personalization, analytics

#### Data Sharing
1. Click **Manage**
2. Specify if data is shared with third parties
3. For this app: "No, data is not shared with third parties"

#### Data Security
1. Encryption in transit: "Yes" (backend uses HTTPS)
2. Encryption at rest: "Yes" (MongoDB on secure server)
3. Allow users to request deletion: "Yes" (if you support this, otherwise "No")

### 8.7 Privacy Policy

**Location:** Click **Privacy policy** (left sidebar)

#### Why Privacy Policy is Required
Every app on Google Play must have a privacy policy explaining:
- What data is collected
- How it's used
- How users can delete data
- How long data is kept

#### Add Privacy Policy URL
1. Create or host a privacy policy (see template below)
2. Enter the URL in the **Privacy policy (optional)** field on Store listing page
3. Must be accessible via HTTPS (must start with https://)

#### Privacy Policy Template

Create a file at `https://iiconacademy.in/privacy` with content:

```markdown
# Privacy Policy for i-icon Academy

**Last Updated:** [Current Date]

## 1. Information We Collect

We collect the following information when you use our app:

**Information you provide:**
- Email address and password (for account login)
- Full name (for personalization)
- School affiliation (to provide school-specific content)

**Information collected automatically:**
- Device information (device type, OS version)
- Usage data (which content you view, download, or bookmark)
- Analytics events (app crashes, feature usage)
- IP address (to detect location and prevent abuse)

## 2. How We Use Information

We use collected information to:
- Authenticate your account
- Provide personalized content relevant to your school
- Improve app performance and stability
- Fix bugs and prevent abuse
- Analyze usage patterns to improve features
- Send notifications about new content

## 3. Data Security

We protect your data using:
- HTTPS encryption for all data in transit
- Encrypted storage on secure servers
- Regular security audits
- Limited access to personal data (only authorized staff)

## 4. Data Sharing

We do **not** share your personal data with third parties, except:
- Service providers who help us operate (hosting providers, analytics)
- Law enforcement if legally required

## 5. Data Retention

We retain your data for:
- Active accounts: Duration of account use
- Deleted accounts: 30 days (backup retention)
- Usage logs: 1 year
- Analytics data: 2 years (anonymized)

## 6. Your Rights

You have the right to:
- Access your personal data
- Request correction of inaccurate data
- Request deletion of your data
- Request export of your data in standard format

To exercise these rights, contact: aiapptech2025@gmail.com

## 7. Children's Privacy

This app is not intended for children under 13. We do not knowingly
collect data from children under 13.

## 8. Changes to This Policy

We may update this privacy policy from time to time. We'll notify you
of changes by updating the "Last Updated" date.

## 9. Contact Us

If you have questions about this privacy policy:

Email: aiapptech2025@gmail.com
Address: [Your organization's address]
```

### 8.8 Sensitive Permissions

**Location:** Click **App permissions** (left sidebar) or **Sensitive permissions** section

This is where Google reviews your permission declarations.

#### Camera Permission
If your app uses camera:
1. Explain why: "Used for video lessons playback (optional, if user enables video)"
2. If you don't actually use camera, remove it from permissions in `app.json`

#### Storage Permission
1. Explain why: "Required to download and save PDFs locally for offline viewing"
2. This is expected and normal

#### Internet Permission
1. Explain why: "Required to fetch educational content from our servers"
2. All apps need this

#### Location Permission
If you don't use GPS:
1. Remove from `app.json` permissions
2. If included, Google will question why

### 8.9 Content Declarations

**Location:** Click **Declarations** (left sidebar) or **Policy declarations**

Confirm:
- [ ] "This app does **not** contain ads" (unless it does)
- [ ] "This app does **not** use Google Play Billing" (correct for free app)
- [ ] "This app does **not** require SSO (Single Sign-On)" (only if you don't use Google Sign-In)

Answer honestly. False declarations can result in app removal.

### Console Configuration Verification

✅ **Verify Google Play Console is configured:**
- [ ] Store listing: app name, short description, full description
- [ ] Category set to "Education"
- [ ] Contact email provided
- [ ] Content rating questionnaire completed (rating assigned)
- [ ] App access: restricted functionality explained
- [ ] Test account provided for Google reviewers
- [ ] Data safety: data collection and sharing declared
- [ ] Privacy policy URL provided (and accessible)
- [ ] Permissions explained
- [ ] Policy declarations answered correctly

---

## 9. Create Store Assets

Store assets are images and graphics that appear on your app's Play Store page. Without these, your app cannot be published.

### 9.1 Required Assets Summary

| Asset | Dimensions | Format | Required | Where Used |
|-------|------------|--------|----------|-----------|
| **App Icon** | 512×512 px | PNG | ✅ Yes | Search results, app listing |
| **Feature Graphic** | 1024×500 px | PNG | ✅ Yes | Top of Play Store listing page |
| **Screenshots** | 1080×1920 px (vertical) or 1920×1080 px (horizontal) | PNG/JPG | ✅ Yes (min 2, max 8) | Play Store listing |
| **Promo Graphic (7-inch tablet)** | 1024×500 px | PNG | ❌ No | Tablets (optional) |

### 9.2 Design Best Practices

**App Icon (512×512 px):**
- Should be the same as your app icon (1024×1024 px from assets, scaled down)
- Include brand colors and logo
- Keep text minimal (hard to read at small sizes)
- Ensure it's recognizable at small sizes (96×96 px on device)
- Don't include shadows or gradients (usually)

**Feature Graphic (1024×500 px):**
- This is the "banner" shown at top of Play Store page
- Should feature your app's key features or logo
- Must be visually striking (users see this first)
- Include text describing the app (e.g., "Access Educational Content")
- Use your brand colors

**Screenshots (1080×1920 px):**
- Show the most important features of your app
- Minimum 2, recommended 5-6, maximum 8
- Should tell a story: login → browse → download → success
- Add text overlays explaining features
- Use actual app screenshots (not mockups)
- Can use both English and localized languages

### 9.3 Create App Icon (512×512 px)

**Option 1: Scale existing 1024×1024 icon**

If you have a 1024×1024 icon already:
```bash
# Using ImageMagick (if installed)
convert apps/mobile/assets/icon.png -resize 512x512 app-icon-512.png

# Or use an online tool: https://icoconvert.com/
# Or use image editor (Photoshop, GIMP, Figma)
```

**Option 2: Use an online tool**

1. Visit https://icoconvert.com/
2. Upload your 1024×1024 icon
3. Download 512×512 version
4. Save as `app-icon-512.png`

**What to include:**
- i-icon Academy logo
- Brand indigo color (#4f46e5)
- Clear and recognizable
- No background transparency (should have solid background or logo on background)

### 9.4 Create Feature Graphic (1024×500 px)

**Using Figma (free, recommended):**

1. Go to https://figma.com
2. Create new design file
3. Set canvas size: 1024×500 px
4. Design:
   - Background: Brand indigo (#4f46e5) or gradient
   - Add logo/mark (centered)
   - Add headline text (e.g., "Access Your School's Educational Content")
   - Add 2-3 feature icons/text
   - Export as PNG

**Using Canva (free):**

1. Go to https://canva.com
2. Search for "Google Play feature graphic"
3. Select 1024×500 template
4. Customize with your logo and text
5. Download as PNG

**Design guidelines:**
- Text is readable at 500×1024 (not too small)
- Brand colors used (indigo and white)
- Professional appearance
- No watermarks or copyright symbols

### 9.5 Create Screenshots (1080×1920 px)

**Minimum 2 screenshots recommended. Best practices:**

**Screenshot 1: Login Screen**
```
- Show login page
- Add text: "Secure Login"
- Explain: "Sign in with your school account"
```

**Screenshot 2: Content Library**
```
- Show PDF list
- Add text: "Browse Content"
- Explain: "Access curated educational materials"
```

**Screenshot 3: PDF Viewer**
```
- Show PDF open in viewer
- Add text: "View with Watermark"
- Explain: "Secure viewing with watermarks"
```

**Screenshot 4: Video Lessons**
```
- Show video list
- Add text: "Video Lessons"
- Explain: "Learn from engaging video content"
```

**Screenshot 5: Bookmarks**
```
- Show bookmarked PDFs
- Add text: "Save Your Favorites"
- Explain: "Bookmark important materials"
```

**Creating screenshots:**

**Option A: From actual device**
```bash
# Take screenshot on Android device
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshot.png
```

**Option B: From Android emulator**
- Run app in emulator
- Click camera icon in emulator toolbar
- Screenshot automatically saved

**Option C: Using design tool**
- Import app mockups into Figma
- Add text overlays and callouts
- Export as PNG

**Add text overlays using:**
- Photoshop
- GIMP (free)
- Figma
- Canva
- Online tool: https://pixlr.com (free)

### 9.6 Upload Assets to Google Play Console

**Location:** Go to app dashboard → **Store listing** → Graphics section

#### Upload App Icon
1. Scroll to **App icon (512×512 px)**
2. Click "Choose file"
3. Select `app-icon-512.png`
4. Click "Upload"

#### Upload Feature Graphic
1. Scroll to **Feature graphic (1024×500 px)**
2. Click "Choose file"
3. Select your feature graphic file
4. Click "Upload"

#### Upload Screenshots
1. Scroll to **Phone screenshots (1080×1920 px)**
2. Click "Add screenshot"
3. Upload each screenshot (one at a time)
4. Recommended: Upload 5-6 screenshots
5. You can drag to reorder screenshots

**Each screenshot:**
- Must be 1080×1920 px (portrait, full screen)
- Must be PNG or JPG format
- Can include text overlays
- Should show real app (not mockups)

### 9.7 Verify Assets

After uploading, Google Play shows previews:

1. Go to **Store listing** page
2. Scroll down
3. You should see:
   - App icon displayed
   - Feature graphic displayed as banner
   - Screenshots in carousel
   - All images clear and crisp

If images look pixelated or stretched:
- Check dimensions are correct
- Reupload with correct size
- Or edit and resize before uploading

### Asset Verification

✅ **Verify assets are uploaded:**
- [ ] App icon (512×512 px) uploaded
- [ ] Feature graphic (1024×500 px) uploaded
- [ ] At least 2 screenshots uploaded
- [ ] All images are clear and professional
- [ ] Screenshot sequence tells a story (login → browse → use)
- [ ] Text on screenshots is readable
- [ ] All images match brand guidelines

---

## 10. Privacy Policy

A privacy policy is legally required for all apps on Google Play. This section explains what should be included and where to host it.

### 10.1 Is Privacy Policy Required?

**Yes.** Google Play requires all apps to have a privacy policy, regardless of whether your app collects data. The policy explains:
- What data is collected
- How it's used
- How it's protected
- User rights

Without a privacy policy, Google will reject your app during review.

### 10.2 When Privacy Policy is Mandatory

Privacy policy is mandatory for:
- ✅ All apps requesting permissions (camera, location, storage, etc.)
- ✅ All apps collecting user data (email, name, usage logs, etc.)
- ✅ All apps that require login
- ✅ All apps that use analytics

**Bottom line:** Nearly every app needs a privacy policy.

### 10.3 Create Your Privacy Policy

**Option 1: Using a generator (easiest)**

1. Visit https://www.privacypolicygenerator.info/
2. Fill in app details:
   - App name: "i-icon Academy"
   - Company/Developer name: Your organization
   - Collect email? Yes
   - Collect analytics? Yes
   - Sell data? No
3. Generate policy
4. Copy the text

**Option 2: Manually write (recommended for accuracy)**

Create a file with your privacy policy. See the template in **Section 8.7** above.

**Option 3: Use a lawyer**

If you want a fully custom, legally-reviewed policy, hire a lawyer or use a service like Termly or iubenda (paid services).

### 10.4 Host Privacy Policy Online

Your privacy policy must be accessible via HTTPS (secure URL).

**Option 1: Host on your website**

If you have a website (e.g., https://iiconacademy.in):
1. Create a file: `privacy.html` or `privacy.md`
2. Add privacy policy text
3. Upload to your server
4. Access at: https://iiconacademy.in/privacy

**Option 2: Use a free service**

If you don't have a website, use:
- GitHub Pages (free): Create GitHub account, push file, get HTTPS URL
- Google Sites (free): Create a page with privacy policy
- Termly (free limited version): https://termly.io

**Option 3: Host on your app's backend**

Add privacy policy endpoint to Fastify backend:

```typescript
// In apps/api-node/src/routes
export const registerPrivacyRoutes = (app: FastifyInstance) => {
  app.get('/privacy', async (request, reply) => {
    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head><title>Privacy Policy</title></head>
      <body>
        <h1>Privacy Policy for i-icon Academy</h1>
        <p>Last Updated: ${new Date().toISOString().split('T')[0]}</p>
        <!-- Rest of privacy policy -->
      </body>
      </html>
    `);
  });
};
```

Then access at: https://iiconacademy.in/privacy

### 10.5 Enter Privacy Policy URL in Google Play Console

1. Go to **Store listing** page
2. Scroll to **Links** section
3. Find **Privacy policy**
4. Enter your privacy policy URL: `https://iiconacademy.in/privacy`
5. Make sure the URL starts with `https://` (not `http://`)
6. Test the URL — it should load without errors

### 10.6 Privacy Policy Checklist

Your privacy policy should include:

- [ ] App name and company/developer name
- [ ] Last updated date
- [ ] Information collected (email, name, usage, analytics, IP address)
- [ ] How information is used (authentication, personalization, improvements)
- [ ] Data security measures (encryption, secure servers)
- [ ] Data sharing (do you share with third parties?)
- [ ] Data retention period (how long is data kept?)
- [ ] User rights (access, deletion, export of data)
- [ ] Contact information for privacy questions
- [ ] Children's privacy statement (if app is for kids under 13)
- [ ] Changes policy (how users are notified of changes)

### Privacy Policy Verification

✅ **Verify privacy policy is complete:**
- [ ] Privacy policy written and reviewed
- [ ] Privacy policy hosted on secure (HTTPS) URL
- [ ] URL is accessible and doesn't return errors
- [ ] Privacy policy URL entered in Google Play Console
- [ ] Privacy policy covers all data collected by app
- [ ] Privacy policy is written in clear, understandable language
- [ ] Contact email provided for privacy questions

---

## 11. Upload the Release

Now that everything is configured, it's time to upload your app bundle to Google Play and create your first release.

### 11.1 Prepare for Upload

Before uploading, ensure:

1. **App bundle built and downloaded** (see Section 6)
   ```bash
   ls -lh iiconacademy-production-*.aab
   # File should exist and be ~50-100 MB
   ```

2. **Google Play Console configured** (see Section 8)
   - Store listing complete
   - Content rating assigned
   - Privacy policy URL entered
   - All required fields filled
   - App details configured

3. **Store assets uploaded** (see Section 9)
   - App icon, feature graphic, screenshots

### 11.2 Upload via Google Play Console (Manual)

This is the recommended first-time method. For subsequent releases, you can use automated submission.

**Step 1: Navigate to Release Page**

1. Open Google Play Console
2. Go to your app: **i-icon Academy**
3. Click **Release** (left sidebar)
4. Click **Production** section
5. Click **Create new release** button

**Expected state:**
- You should see "Production" section with "Create new release" button
- No releases yet (first time)

**Step 2: Upload App Bundle**

1. You're now in the release creation form
2. Find the **Android App Bundle** section
3. Click **Browse files** or drag & drop
4. Select your `.aab` file (e.g., `iiconacademy-production-xyz789.aab`)
5. Wait for upload to complete (shows progress bar)
6. Once uploaded, Google scans the bundle (takes 1-2 minutes)

**Expected result:**
- Bundle appears in the release form
- Shows: "Android App Bundle uploaded successfully"
- Displays bundle size and configuration

**Step 3: Review Bundle Information**

Google Play displays:
- Bundle ID
- Package name: `com.iiconacademy.app`
- Version: (from app.json)
- versionCode: (from app.json)
- Supported ABIs (architectures)
- Supported screen sizes
- Supported locales (languages)

Verify this information matches your expectations.

**Step 4: Add Release Notes**

1. Find **Release notes** section
2. Select language: **English (United States)**
3. Add release notes (what's new in this version):

```
Initial release of i-icon Academy

Features:
• Browse a library of educational PDFs
• Download content for offline viewing
• Watch video lessons
• Watermarked PDFs for content security
• School-based access control
• Bookmark your favorite materials

This is the first production release.
```

Keep release notes clear and user-focused (not technical).

**Step 4: Save Release Draft**

Click **Save** button (bottom right).

**Expected state:**
- Release appears in "Production" section with status "Draft"
- Release can be reviewed and edited
- "Start rollout to Production" button appears

### 11.3 Review Release Before Publishing

Before publishing, review everything:

**Checklist in Play Console:**

1. Bundle uploaded successfully → ✅ Confirm green checkmark
2. Release notes added → ✅ Confirm notes are clear
3. No validation errors → ✅ Confirm no red warnings
4. Store listing complete → ✅ Confirm at top of page
5. Graphics uploaded → ✅ Confirm icon/screenshots visible
6. Content rating assigned → ✅ Confirm rating shows
7. Privacy policy URL works → ✅ Test the URL

If anything is red or incomplete, fix it before publishing.

### 11.4 Start Rollout to Production

Once review is complete:

1. Click **Start rollout to Production** button
2. Confirm dialog appears: "Start rollout of this release to Production?"
3. Click **Confirm** or **Start rollout**

**What happens next:**

1. Release is submitted for review by Google Play team
2. Typically takes 2-4 hours for review
3. Review checks:
   - App complies with Play Store policies
   - App doesn't crash or have major bugs
   - Permissions are justified
   - Privacy policy is complete
   - No false claims in description

4. After review:
   - If approved: App is published and visible on Play Store
   - If rejected: You get detailed feedback (email)

### 11.5 Monitor Review Status

**Location:** Google Play Console → your app → **Release**

**Release status options:**

- **Draft** → Initial state (being prepared)
- **Scheduled** → Waiting for rollout date
- **In review** → Google is reviewing
- **Live** → Published to Play Store
- **Rejected** → Review failed (see feedback)
- **Halted** → You paused the rollout

**Check status:**
1. Go to **Release** → **Production**
2. Click the release
3. Look at status at top of page
4. Check for feedback or error messages

**Email notifications:**
- Google sends email when review completes
- Includes approval or rejection details

### 11.6 Troubleshoot Rejected Releases

If your release is rejected:

1. **Read the feedback email carefully** — Google explains what's wrong
2. **Common rejection reasons:**
   - Crashes on startup
   - Permissions not justified
   - Policy violations
   - Misleading description
   - Inappropriate content

3. **Fix the issue:**
   - Debug crashes (see Section 11: Troubleshooting)
   - Remove unjustified permissions
   - Update description
   - Fix content/claims

4. **Build new version:**
   ```bash
   # Increment version
   # Edit app.json: version to "1.0.1", versionCode to 2
   
   eas build --platform android --profile production
   ```

5. **Create new release:**
   - Upload new AAB
   - Add release notes explaining fix
   - Resubmit for review

### Upload Verification

✅ **Verify upload was successful:**
- [ ] App bundle uploaded to Google Play Console
- [ ] Bundle information displays correctly
- [ ] Release notes added
- [ ] No validation errors shown
- [ ] Release status is "In review" or "Live"
- [ ] Email confirmation received from Google

⚠️ **First Release Expectations:**
- Review usually takes 2-4 hours
- Might be longer (up to 24 hours) for first app from new developer
- You'll receive email when status changes
- If rejected, carefully read feedback and fix issues

---

## 12. Testing Before Production

This section explains how to thoroughly test your app before Play Store release.

### 12.1 Internal Testing (Cloud Build)

**Purpose:** Test with small group of people before publishing to all users.

**How to do internal testing:**

1. Build app using EAS:
   ```bash
   eas build --platform android --profile production
   ```

2. In Google Play Console, go to **Testing** → **Internal testing**

3. Click **Create new release**

4. Upload the `.aab` file

5. Click **Manage testers**

6. Enter emails of people to test (internal team, trusted friends)

7. Send them the internal testing link via email

8. Testers download the app from Play Store (test version, not public)

9. Testers report any issues

**Internal testing is fast (no Google review), so you can iterate quickly.**

### 12.2 Closed Testing (Limited Audience)

**Purpose:** Test with larger audience before public release.

**Process:**
1. Go to **Testing** → **Closed testing**
2. Upload your AAB
3. Add release notes
4. Invite testers by email or share test link
5. Review feedback and crash reports
6. Make fixes if needed

**Typical duration:** 1-2 weeks before moving to Production.

### 12.3 Open Testing (Public Beta)

**Purpose:** Test with anyone on Play Store before final release.

**Risk:** App appears in search results as "Beta" version.

**Process:**
1. Go to **Testing** → **Open testing**
2. Upload your AAB
3. Set availability: Everyone or by country
4. Add description: "Beta version — help us find bugs!"
5. Collect feedback

### 12.4 Preview APK Testing (Local Devices)

**Before any Play Store testing, test locally on physical devices:**

**Build preview APK:**
```bash
eas build --platform android --profile preview
```

**Install on test device:**
```bash
adb install preview-build.apk
```

**Test checklist:**

- [ ] **Startup:** App launches without crashing
- [ ] **Login:** Can log in with test account
- [ ] **Navigation:** Can navigate between screens (content, videos, settings)
- [ ] **PDFs:** Can open, view, and download PDFs
- [ ] **Videos:** Can view video lessons
- [ ] **Offline:** Works on offline mode (downloads from cache)
- [ ] **Performance:** App is fast, no freezing
- [ ] **Crashes:** No crashes or force closes
- [ ] **Logout:** Can log out and see login screen again
- [ ] **Orientation:** App works in landscape and portrait
- [ ] **Notifications:** Test notifications if applicable
- [ ] **Permissions:** App properly requests permissions

### 12.5 Monitor Crashes During Testing

**In EAS Dashboard:**

1. Go to https://expo.dev/accounts/aiapptech2025s-organization/projects/iiconacademy/builds
2. Click on a test build
3. Look for **Crash reports** section
4. Review any crashes reported

**In Google Play Console (after uploading to internal testing):**

1. Go to **Android Vitals** → **Crashes**
2. See list of crashes reported by testers
3. Click each crash to see:
   - Stack trace
   - Device info
   - How many users affected
   - Reproduction steps

**Fix crashes:**
1. Reproduce crash locally
2. Debug and fix in code
3. Build new version
4. Upload and retest

### Testing Best Practices

💡 **Tips:**
- Test on multiple devices (different Android versions)
- Test on real devices, not just emulator
- Test on slow internet connection
- Test with and without permissions enabled
- Test login/logout flows thoroughly
- Test all user roles (student, teacher, admin)

⚠️ **Common Issues Found During Testing:**
- Login fails on real devices (but works locally)
- PDFs don't download (permission issues)
- Videos don't play (network issues)
- Crashes on certain Android versions
- Notification not working

---

## 13. Publish to Production

After testing is complete and release is approved, your app goes live on Google Play.

### 13.1 What Happens When Released

**Step 1: Google Review** (2-4 hours typically)
- Your app is reviewed by Google Play team
- They check for crashes, policy violations, security issues
- They install and test the app themselves

**Step 2: Approved** (or rejected with feedback)
- If approved: Status changes to "Live" or "In rollout"
- If rejected: You get detailed feedback email

**Step 3: Gradual Rollout** (optional)
- You can rollout to 5% of users first
- Monitor for crashes and issues
- Gradually increase to 10%, 25%, 50%, 100%
- This reduces risk if there's a critical bug

**Step 4: Fully Live** (100% rollout)
- App appears in Play Store for all users
- Users can search for it and download it
- Reviews and ratings start coming in

### 13.2 Monitor Release Status

**Check status in Play Console:**

1. Go to your app
2. Click **Release**
3. Click **Production**
4. Look at release status:
   - "Submitted" = Waiting for review
   - "In review" = Being reviewed
   - "Live" = Published (users can download)
   - "Rejected" = Needs fixes (see feedback)

### 13.3 First Appearance on Play Store

**When release is live:**

1. Wait a few minutes (Play Store takes time to sync)
2. Search for "i-icon Academy" on Google Play
3. App should appear in search results
4. Click app to see:
   - App icon
   - Description
   - Screenshots
   - Ratings (starts with 0 ratings)
   - Download button (for users)

### 13.4 Gradual Rollout (Risk Reduction)

Instead of releasing to everyone at once, you can roll out gradually:

**In Google Play Console:**

1. Go to **Release** → **Production**
2. Look for **Rollout** options
3. Select percentage:
   - Start: 5% (test with limited users)
   - Day 2: 10%
   - Day 3: 25%
   - Day 5: 50%
   - Day 7: 100%

**Benefits:**
- Catch critical bugs before full release
- Monitor crash rates
- Read early user reviews
- Pause rollout if issues found

**If critical bug found:**
- Pause rollout at current percentage
- Build new version with fix
- Create new release and push update

### 13.5 Handle Rejections

If release is rejected by Google:

1. **Read feedback email** — Google explains what's wrong
2. **Common rejection reasons:**
   - App crashes on launch
   - Permissions not used properly
   - Policy violation (ads shown when not declared, etc.)
   - Misleading description
   - Content issues

3. **Fix the issue:**
   - Debug and fix code
   - Update description
   - Remove policy-violating content
   - Adjust permissions

4. **Build new version:**
   - Increment `versionCode` in `app.json`
   - Increment `version` if significant change
   - Build with `eas build --profile production`

5. **Create new release:**
   - Upload new AAB
   - Add release notes: "Fixed issue: [what was fixed]"
   - Submit for review again

### Production Launch Verification

✅ **Verify production launch:**
- [ ] App status is "Live" in Google Play Console
- [ ] App appears in Play Store search
- [ ] App can be downloaded by anyone
- [ ] Crash reports are being collected
- [ ] User ratings visible
- [ ] No critical crashes reported

---

## 14. Post-Release Monitoring

After your app is published, monitoring continues to ensure it works well for users.

### 14.1 Android Vitals

**Location:** Google Play Console → **Analytics** → **Android Vitals**

**What it tracks:**

- **Crashes:** Number of crashes, crash rate, affected users
- **ANR (Application Not Responding):** App freezes, hangs
- **Slow frames:** App lags or stutters
- **Frozen frames:** App completely freezes for 5+ seconds
- **Battery drain:** Power consumption issues
- **Excessive network usage:** Data consumption problems

**How to check:**

1. Go to **Android Vitals**
2. Look at each metric
3. Google marks metrics as "Good" (green) or "Needs attention" (red)
4. Click each metric to see details:
   - Devices affected
   - Android version affected
   - Stack traces for crashes

**Act on issues:**

If a metric is red (needs attention):
1. Click to see details
2. Identify pattern (specific device? specific action?)
3. Debug and fix in code
4. Build new version and release

### 14.2 Monitor Crash Reports

**Location:** Google Play Console → **Analytics** → **Crash reports**

**Review crashes:**

1. Crashes are grouped by type
2. Each crash shows:
   - Error message and stack trace
   - Device and Android version
   - Number of users affected
   - First seen / last seen dates

**Fix critical crashes:**

1. Identify top crash (most users affected)
2. Try to reproduce locally
3. Fix root cause
4. Test thoroughly
5. Build and release new version with fix

### 14.3 User Reviews and Ratings

**Location:** Google Play Console → **User reviews**

**Monitor reviews:**

1. Check rating (1-5 stars)
2. Look for patterns:
   - Feature requests (many 3-4 star reviews ask for X)
   - Bugs (1-2 star reviews report crashes)
   - Compliments (5 star reviews praise what works)

3. Respond to reviews:
   - Thank positive reviews
   - Address concerns in negative reviews
   - Provide support info (email, website)

**Example response:**
```
Thank you for reporting this issue! We're aware of the PDF download 
bug and will have a fix in the next version. In the meantime, try 
clearing app cache. If you need help, email aiapptech2025@gmail.com.
```

### 14.4 Version Tracking

**Track which versions are active:**

1. Go to **Release** → **Production**
2. You see all released versions
3. For each version, see:
   - Release date
   - Users on this version (gradually decreases as users update)
   - Crash rate for this version

**Most users update within 1-2 days. If old version has higher crash rate, it's not from new bugs.**

### 14.5 Download and Installation Stats

**Location:** Google Play Console → **Statistics**

**Key metrics:**

- **Install:** Total app installs
- **Uninstall:** Users who removed app
- **Daily active users (DAU):** Users using app each day
- **Monthly active users (MAU):** Users using app each month
- **Install retention:** % of users who keep app after 7/30 days

**Trends to watch:**

- Declining DAU after release = app has issue or user lost interest
- High uninstall rate after 1 day = crash or critical bug
- Flat or growing DAU = app is stable and users like it

### Post-Release Best Practices

🔒 **Security Recommendations:**
- Regularly check crash reports
- Fix critical bugs within 1-2 days
- Monitor for security issues in dependencies
- Update third-party libraries regularly
- Monitor for data access anomalies (unusual API calls)

✅ **Best Practices:**
- Respond to user reviews
- Release updates monthly (new features) or as needed (bug fixes)
- Monitor analytics weekly
- Maintain Android Vitals "Good" status
- Document known issues and workarounds

---

## 15. Troubleshooting

This section covers common issues and solutions.

### Troubleshooting Table

| Issue | Possible Cause | Resolution | Verification |
|-------|---|---|---|
| **eas login fails** | Wrong Expo credentials | Verify email/password correct. Check Expo account is active. Reset password if needed. | `eas login` succeeds, `eas project:info` shows correct project |
| **eas build fails: icon.png not found** | Missing required asset files | Add all 4 assets to `apps/mobile/assets/`: icon.png, splash.png, adaptive-icon.png, notification-icon.png | `ls apps/mobile/assets/` shows all files |
| **eas build fails: package name mismatch** | app.json package doesn't match Play Console | Update app.json android.package to match Play Console OR update Play Console to match app.json (before first submission) | Both values identical |
| **eas build fails: build timeout** | Build taking too long | This is rare. Usually not the issue. Check EAS dashboard. May indicate server issue. Try rebuilding. | Check EAS status page, rebuild succeeds |
| **App crashes on launch** | JS bundle error, missing import, or exception | Check EAS build logs for error. Look for SyntaxError, ImportError, etc. Use Expo Dev Client to see exact error. | App launches and shows content, no crash on navigate |
| **App crashes on login** | Backend unreachable, wrong API URL, auth issue | Verify EXPO_PUBLIC_API_URL in eas.json points to correct backend (https://iiconacademy.in). Test backend connectivity: `curl https://iiconacademy.in/api/auth/login` | Login succeeds, user data loads |
| **Network request failed on device** | App pointing to wrong API URL or HTTP instead of HTTPS | Check eas.json production profile has EXPO_PUBLIC_API_URL=https://iiconacademy.in | App can fetch data, PDFs load |
| **PDF doesn't load in viewer** | Auth token expired, PDF not found, viewer issue | Logout and login again (refreshes token). Check PDF ID in URL is valid. Verify storage permissions granted. | PDF opens, watermark visible, can download |
| **eas submit fails: service account unauthorized** | Service account not granted Play Store permission | Go to Play Console → Setup → API access. Grant eas-submit service account "Release apps" permission. | Submit succeeds, prints release URL |
| **eas submit fails: build not found** | Wrong build ID or build doesn't exist | Verify build completed successfully. Check build ID in eas submit command. | Build appears in EAS dashboard, succeeded status |
| **Google Play Console shows validation error on upload** | Bundle configuration mismatch, wrong versionCode | Increment versionCode in app.json. Verify package name matches Play Console. Rebuild and reupload. | Upload succeeds, no validation errors |
| **Google rejects app: missing or invalid permissions justification** | Permissions not used by app, or not explained well | Remove unused permissions from app.json. Explain each permission clearly in App access section. | All permissions have clear justification |
| **Google rejects app: crashes during review** | App crashes on startup or during testing | Reproduce crash locally. Check EAS logs for errors. Debug and fix. Rebuild and resubmit. | No crashes in preview APK testing |
| **Google rejects app: misleading description** | Description doesn't accurately reflect app features | Rewrite description to accurately describe what app does. Don't make false claims. Match features to actual functionality. | Description factually accurate, matches app capabilities |
| **App not appearing in Play Store search** | App still in review, not yet live, wrong search term | Check release status in Google Play Console (should be "Live"). Wait 24 hours for Play Store indexing. Try exact app name search. | App appears when searching "i-icon Academy" |
| **Users can't install app** | Device not compatible, low Android version | Check app requires Android 7.0+ (API 24). Older devices can't install. Users on older Android can't get app. | Users on Android 10+ can install |
| **App uses excessive battery** | Constant network requests, not dismissing notifications, GPS always on | Check if background sync running when not needed. Verify GPS permission not requested. Stop unnecessary timers/polling. | Battery usage normal, app doesn't drain battery quickly |
| **User reviews say app is slow** | Large PDF files loading slowly, unoptimized images, network latency | Compress PDF files. Optimize images. Implement caching. Test on slow connection (2G). | App loads reasonable, PDFs display within 2-3 seconds |
| **Large crash spike after update** | Breaking change in API, security cert expiration, library incompatibility | Check backend API didn't change. Verify SSL certificate not expired. Check third-party library updates. | Crash rate returns to normal after fix release |
| **versionCode conflict** | Uploaded same versionCode twice | versionCode must always increase. If you re-upload with same versionCode, it fails. Increment versionCode and rebuild. | New versionCode (e.g., 2) in app.json, build succeeds |
| **Play Store shows rating as 0 stars** | App just released, no users rated yet | Wait 7-14 days for ratings to come in. Get early users to rate. Respond positively to all reviews. | Ratings appear once users install and rate |
| **Can't download from Play Console link** | Link expired or account not authorized | Download links expire after 90 days. Download fresh AAB from EAS dashboard or rebuild. | AAB downloads successfully |
| **App stopped working after OS update** | Android OS deprecation, API changes, library compatibility | Check if app uses deprecated APIs. Update libraries. Test on new Android version. | App works on latest Android version |
| **Background services not working** | Background execution restrictions in Android 8+ | Use WorkManager instead of background service. Implement battery optimization exemption if needed. | Notifications and background tasks work |

### Common Mistakes to Avoid

⚠️ **Mistakes When Deploying:**

1. **Uploading APK instead of AAB to Play Store**
   - ❌ Wrong: Upload `.apk` file
   - ✅ Right: Upload `.aab` file (App Bundle)

2. **Using wrong API URL in production**
   - ❌ Wrong: Pointing to localhost (http://10.0.2.2:8000)
   - ✅ Right: Pointing to production backend (https://iiconacademy.in)

3. **Not incrementing versionCode**
   - ❌ Wrong: Re-uploading same versionCode
   - ✅ Right: Increment versionCode for every release

4. **Including passwords in code**
   - ❌ Wrong: Hardcoding passwords, API keys in source
   - ✅ Right: Use environment variables via eas.json

5. **Committing keystore or secrets to Git**
   - ❌ Wrong: `git add google-service-account.json`
   - ✅ Right: Add to .gitignore, store securely

6. **Testing on emulator only**
   - ❌ Wrong: Building and testing only on Android emulator
   - ✅ Right: Test on real physical Android devices

7. **Not testing on different Android versions**
   - ❌ Wrong: Testing only on Android 14
   - ✅ Right: Test on Android 10, 12, 14, etc.

8. **Ignoring crash reports**
   - ❌ Wrong: Not checking Android Vitals after release
   - ✅ Right: Check crashes daily first week, weekly after

9. **Changing package name after first release**
   - ❌ Wrong: Reusing package name for different app
   - ✅ Right: Package name is permanent once submitted

10. **Not backing up keystore**
    - ❌ Wrong: Only relying on EAS-managed keystore
    - ✅ Right: Download and securely backup keystore locally

### Debugging Techniques

**For app crashes:**

1. **Check EAS build logs:**
   ```bash
   eas build:log --platform android --id BUILD_ID
   ```

2. **Use Expo Dev Client for local testing:**
   ```bash
   cd apps/mobile
   eas build --platform android --profile development
   # Installs Expo Go on device to show detailed error messages
   ```

3. **Check Android logcat on device:**
   ```bash
   adb logcat | grep -i "error\|crash\|exception"
   ```

4. **Test on multiple real devices:**
   - iPhone users can't run Android, so test on Android devices only
   - Try different Android versions (10, 12, 14)
   - Try different screen sizes (phone, tablet)
   - Try different network speeds (Wi-Fi, 4G, low signal)

**For performance issues:**

1. **Profile app startup time:**
   - Use Android Studio Profiler
   - Check time to first screen

2. **Monitor memory usage:**
   - Use Android Studio Profiler
   - Watch for memory leaks

3. **Check network requests:**
   - Use Charles Proxy or Fiddler
   - See what APIs are being called
   - Verify response times

---

## 16. Deployment Checklist

Use this checklist before each deployment to ensure nothing is forgotten.

### Pre-Deployment

- [ ] **Code review:** All changes reviewed and approved
- [ ] **Tests passing:** Unit and integration tests pass
- [ ] **No console errors:** Check for warnings and errors in dev tools
- [ ] **Preview APK tested:** Built and tested on real Android devices
- [ ] **All features working:** Login, content viewing, download, etc.
- [ ] **No hardcoded secrets:** No passwords, API keys, or tokens in code
- [ ] **Environment variables correct:** EXPO_PUBLIC_API_URL set to production
- [ ] **Version numbers updated:** Updated version and versionCode in app.json
- [ ] **Changelog prepared:** Release notes written and ready
- [ ] **Assets created:** App icon, feature graphic, screenshots uploaded

### Production Build

- [ ] **Logged into EAS:** `eas login` successful
- [ ] **Project linked:** `eas project:info` shows correct project
- [ ] **All dependencies installed:** `pnpm install` completed
- [ ] **Production build created:** `eas build --platform android --profile production` succeeded
- [ ] **App bundle downloaded:** `.aab` file downloaded from EAS
- [ ] **Bundle verified:** `unzip -t` confirms valid format

### Google Play Console

- [ ] **App created:** "i-icon Academy" appears in console
- [ ] **Package name correct:** `com.iiconacademy.app` matches app.json
- [ ] **Store listing complete:** Description, category, screenshots
- [ ] **Content rating assigned:** Rating questionnaire completed
- [ ] **Privacy policy URL:** Valid HTTPS URL provided and tested
- [ ] **Test account provided:** Email and password for Google testers
- [ ] **Permissions justified:** Each permission explained in app access
- [ ] **Assets uploaded:** Icon, feature graphic, screenshots displayed

### Upload & Review

- [ ] **App bundle uploaded:** No validation errors shown
- [ ] **Release notes added:** Clear, user-friendly description of changes
- [ ] **Submitted for review:** Status shows "In review" or waiting
- [ ] **Review feedback monitored:** Watched for approval/rejection email
- [ ] **No rejections:** If rejected, all feedback items addressed

### Post-Release

- [ ] **App published:** Status shows "Live" in Play Console
- [ ] **App discoverable:** App appears in Play Store search
- [ ] **Crash reports checked:** Android Vitals reviewed for crashes
- [ ] **User reviews monitored:** Reading reviews and responding
- [ ] **Analytics reviewed:** DAU, retention, uninstalls checked
- [ ] **No critical issues:** No surge in crash rates or 1-star reviews
- [ ] **Gradual rollout done:** Released to 5% → 10% → 25% → 50% → 100%
- [ ] **Fully live:** 100% of users have access to new version

---

## 17. Appendix

### A. Useful Commands

**EAS CLI Commands:**

```bash
# Login to Expo account
eas login

# Check project information
eas project:info

# Build preview APK (testing)
eas build --platform android --profile preview

# Build production AAB (Play Store)
eas build --platform android --profile production

# Check build status
eas build:list

# Download build artifact
eas build:download --platform android --id BUILD_ID

# View build logs
eas build:log --platform android --id BUILD_ID

# Submit to Play Store automatically
eas submit --platform android --profile production

# Send OTA update (JS changes only)
eas update --branch production --message "Description of changes"

# List update channels
eas update:list
```

**Gradle Commands (Android):**

```bash
# From apps/mobile directory

# Validate Gradle setup
./gradlew --version

# Clean build
./gradlew clean

# Check Gradle configuration
./gradlew tasks

# Lint check
./gradlew lint
```

**ADB Commands (Android Debug Bridge):**

```bash
# Connect device via USB
adb devices

# Install APK
adb install app.apk

# Uninstall app
adb uninstall com.iiconacademy.app

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# View device logs
adb logcat

# Filter logs for errors
adb logcat | grep -i "error"

# Clear app cache
adb shell pm clear com.iiconacademy.app

# List installed packages
adb shell pm list packages
```

### B. Google Play Console Pages

| Page | URL | Purpose |
|------|-----|---------|
| Play Console Home | https://play.google.com/console | Dashboard for all apps |
| Your App Dashboard | https://play.google.com/console/apps/details?id=com.iiconacademy.app | App-specific management |
| Store Listing | Play Console → App → Store listing | Edit description, screenshots, graphics |
| Releases | Play Console → App → Release → Production | Upload builds and manage releases |
| Android Vitals | Play Console → Analytics → Android Vitals | Monitor app health and crashes |
| User Reviews | Play Console → User reviews | Read and respond to user feedback |
| API Access | Play Console → Setup → API access | Manage Service Account for automated uploads |
| App Integrity | Play Console → Setup → App Integrity | View signing certificates |

### C. Official Documentation Links

**Essential Reading:**

- [Google Play Console Help](https://support.google.com/googleplay/android-developer) — Official Google Play help
- [Google Play Policies](https://play.google.com/intl/en-US/about/play-policies/) — Policies your app must follow
- [Android Development](https://developer.android.com/) — Android development official docs
- [Expo Documentation](https://docs.expo.dev/) — Expo and EAS docs
- [React Native Documentation](https://reactnative.dev/docs/getting-started) — React Native reference

**Specific Topics:**

- [App Signing](https://developer.android.com/studio/publish/app-signing) — How Android app signing works
- [Upload an app](https://support.google.com/googleplay/android-developer/answer/7159011) — Play Store upload guide
- [Pre-launch reports](https://support.google.com/googleplay/android-developer/answer/7002494) — Test reports from Google
- [Android Vitals](https://developer.android.com/studio/build/vitals) — Monitor app health
- [Privacy Policy](https://support.google.com/googleplay/answer/10964491) — Privacy policy requirements

### D. Directory Structure Reference

```
pdf-portal/
├── apps/
│   └── mobile/                          # React Native Expo app
│       ├── app.json                     # Static Expo config
│       ├── app.config.js                # Dynamic Expo config (env injection)
│       ├── eas.json                     # EAS build profiles
│       ├── package.json                 # Mobile dependencies
│       ├── assets/                      # App images
│       │   ├── icon.png                 # 1024×1024 app icon
│       │   ├── splash.png               # 1284×2778 splash screen
│       │   ├── adaptive-icon.png        # 1024×1024 adaptive icon
│       │   ├── notification-icon.png    # 96×96 notification icon
│       │   └── logo-mark.png            # App internal logo
│       ├── src/                         # React Native source code
│       │   ├── app/                     # Screens (expo-router)
│       │   ├── components/              # Reusable components
│       │   ├── context/                 # Auth context
│       │   ├── lib/                     # Utilities
│       │   └── App.tsx                  # App entry point
│       ├── android/                     # Android-specific config
│       │   └── app/src/main/
│       │       └── AndroidManifest.xml  # Android manifest
│       └── google-service-account.json  # Google API key (NOT in Git!)
│
├── packages/
│   └── shared/                          # Shared types and utilities
│       └── src/api/
│           └── client.js                # Shared API client
│
├── docs/
│   └── mobile_deployment.md             # This file
│
└── .gitignore                           # Lists files to exclude from Git
    # Includes: google-service-account.json, *.aab, *.apk
```

### E. Environment Variables Reference

**Used in eas.json build profiles:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_API_URL` | `https://iiconacademy.in` (production) | Backend API URL |
| `EXPO_PUBLIC_API_URL` | `http://10.0.2.2:8000` (development) | Local backend for dev testing |

**Set in app.config.js:**

```javascript
process.env.EXPO_PUBLIC_API_URL  // injected from eas.json
process.env.EAS_BUILD_PROFILE     // "development", "preview", "production"
```

**Accessed in app code:**

```typescript
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;
// Result: "https://iiconacademy.in" (from production profile)
```

### F. Understanding File Sizes

**Typical file sizes:**

| File | Size | Notes |
|------|------|-------|
| Preview APK | 80-150 MB | For local testing (larger, includes resources) |
| Production AAB | 50-100 MB | For Play Store (compressed, Play Store generates APKs) |
| Downloaded app by user | 30-60 MB | Varies by device (Play Store generates optimized APK) |
| After app install | 100-200 MB | Including all resources, cache, data |

**If your AAB seems too large:**
1. Check for unused assets
2. Compress images
3. Remove unused dependencies
4. Check for bundled native modules

### G. Communication Template

**Email template for stakeholders after release:**

```
Subject: i-icon Academy — Now Available on Google Play Store

Hi [Team/Users],

The i-icon Academy mobile app is now live on Google Play Store!

📲 Download it here: https://play.google.com/store/apps/details?id=com.iiconacademy.app

✨ Features:
• Browse educational PDFs
• Watch video lessons
• Bookmark your favorites
• Watermarked content for security
• School-based access

🔐 To use the app:
1. Download from Google Play Store
2. Sign in with your school account
3. Start accessing educational content

📧 For support: aiapptech2025@gmail.com

Thank you!
[Your Name]
```

---

## Summary

You've now completed a full production deployment of the i-icon Academy mobile app to Google Play Store. 

**Key achievements:**
- ✅ Set up development environment
- ✅ Built production-ready app bundle
- ✅ Created and configured Google Play Console app
- ✅ Provided all required store assets and information
- ✅ Submitted app for Google review
- ✅ Published to production
- ✅ Set up monitoring and post-release processes

**Next steps:**
- Monitor Android Vitals daily for first week
- Respond to user reviews
- Plan future updates and features
- Maintain regular release schedule (monthly updates recommended)

**Remember:**
- Increment versionCode for each release
- Always test on real devices before production
- Respond to crash reports quickly
- Keep users engaged with regular updates

Good luck! 🚀

---

**Last Updated:** August 1, 2026
**Version:** 1.0
**For questions or feedback:** aiapptech2025@gmail.com
