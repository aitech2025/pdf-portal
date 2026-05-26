/**
 * Wires up Capacitor native niceties (status bar, splash, keyboard, hardware
 * back button, deep links) when the app runs inside the native shell.
 *
 * Safe to call from web — every Capacitor module is dynamically imported only
 * when running on a native platform, so it adds zero weight to the web bundle.
 */

let bootstrapped = false;

const isCapacitorAvailable = () => {
  try {
    // Capacitor 6 exposes window.Capacitor on both web & native
    return Boolean(window?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

const safeImport = async (modulePromise) => {
  try {
    return await modulePromise;
  } catch (err) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.debug('[native] optional plugin unavailable', err?.message);
    }
    return null;
  }
};

/**
 * Initialise native APIs. Returns a teardown function for tests / HMR.
 */
export const bootstrapNative = async (router) => {
  if (bootstrapped) return () => {};
  bootstrapped = true;

  if (!isCapacitorAvailable()) {
    // Web — install a small "mark as launched" hook so manifest UI is visible
    document.documentElement.dataset.platform = 'web';
    return () => {};
  }

  const platform = window.Capacitor.getPlatform?.() ?? 'unknown';
  document.documentElement.dataset.platform = platform;
  document.documentElement.classList.add('cap', `cap-${platform}`);

  const teardowns = [];

  const StatusBarMod = await safeImport(import('@capacitor/status-bar'));
  if (StatusBarMod?.StatusBar) {
    try {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      await StatusBarMod.StatusBar.setStyle({
        style: prefersDark ? StatusBarMod.Style.Dark : StatusBarMod.Style.Light,
      });
      if (platform === 'android') {
        await StatusBarMod.StatusBar.setBackgroundColor({ color: '#ffffff' });
      }
      await StatusBarMod.StatusBar.setOverlaysWebView({ overlay: false });
    } catch {
      // Some Android skins reject these; ignore
    }
  }

  const SplashMod = await safeImport(import('@capacitor/splash-screen'));
  if (SplashMod?.SplashScreen) {
    try {
      await SplashMod.SplashScreen.hide({ fadeOutDuration: 250 });
    } catch {
      /* noop */
    }
  }

  const KeyboardMod = await safeImport(import('@capacitor/keyboard'));
  if (KeyboardMod?.Keyboard) {
    try {
      KeyboardMod.Keyboard.addListener('keyboardWillShow', (info) => {
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${info.keyboardHeight}px`,
        );
        document.documentElement.classList.add('cap-keyboard-open');
      });
      KeyboardMod.Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.removeProperty('--keyboard-height');
        document.documentElement.classList.remove('cap-keyboard-open');
      });
      teardowns.push(() => KeyboardMod.Keyboard.removeAllListeners());
    } catch {
      /* noop */
    }
  }

  const AppMod = await safeImport(import('@capacitor/app'));
  if (AppMod?.App) {
    try {
      // Hardware back button — pop history, exit if at root
      AppMod.App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) {
          window.history.back();
        } else {
          AppMod.App.exitApp();
        }
      });

      // Deep links — strip origin and push into React Router
      AppMod.App.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          const target = `${url.pathname}${url.search}${url.hash}`;
          if (router?.navigate) {
            router.navigate(target);
          } else {
            window.history.pushState({}, '', target);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } catch {
          /* invalid URL */
        }
      });

      teardowns.push(() => AppMod.App.removeAllListeners());
    } catch {
      /* noop */
    }
  }

  return () => {
    teardowns.forEach((fn) => {
      try { fn(); } catch { /* noop */ }
    });
    bootstrapped = false;
  };
};

export const isNative = () => isCapacitorAvailable();
export const getPlatform = () => {
  if (!isCapacitorAvailable()) return 'web';
  return window.Capacitor.getPlatform?.() ?? 'web';
};
