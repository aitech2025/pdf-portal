import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for i-icon academy mobile shell.
 *
 * Web assets are produced by `npm run build` (outputs to ../../dist/apps/web).
 * Use `npm run mobile:sync` to build the web app and copy assets into iOS + Android.
 *
 * Development tip: set CAP_SERVER_URL=http://<your-LAN-ip>:3000 before running
 * `npx cap run android` to live-reload directly against your Vite dev server.
 */
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.iiconacademy.app',
  appName: 'i-icon academy',
  // Web assets are built to ../../dist/apps/web relative to this file
  webDir: '../../dist/apps/web',
  // Enable HTTPS scheme on Android so cookies/CORS behave like the production web
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
    ...(devServerUrl
      ? {
          url: devServerUrl,
          cleartext: true,
        }
      : {}),
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#ffffff',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: '#5b5ff1',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
