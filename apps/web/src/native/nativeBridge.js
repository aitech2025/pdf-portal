/**
 * Cross-platform helpers that prefer Capacitor plugins on native and degrade
 * gracefully to web APIs in the browser. Always returns a Promise.
 */

import { isNative, getPlatform } from './nativeBootstrap.js';

const lazy = (importer) => importer().catch(() => null);

// ----------------------------- File save ------------------------------------
/**
 * Save a Blob to the user's device. On native, writes to the app Documents
 * directory via @capacitor/filesystem and returns the URI. On the web, falls
 * back to triggering a browser download.
 */
export const saveBlobToDevice = async (blob, filename) => {
  if (isNative()) {
    const Fs = await lazy(() => import('@capacitor/filesystem'));
    if (Fs?.Filesystem) {
      try {
        const base64 = await blobToBase64(blob);
        const res = await Fs.Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Fs.Directory.Documents,
          recursive: true,
        });
        // Notify user via Share so they can move/open the file
        const Share = await lazy(() => import('@capacitor/share'));
        if (Share?.Share) {
          try {
            await Share.Share.share({
              title: filename,
              url: res.uri,
              dialogTitle: 'Save or share',
            });
          } catch { /* dismissed */ }
        }
        return res.uri;
      } catch (err) {
        console.warn('[native] filesystem save failed, falling back to download', err);
      }
    }
  }

  // Web fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return url;
};

// ----------------------------- Haptics --------------------------------------
export const haptic = async (style = 'light') => {
  if (!isNative()) return;
  const mod = await lazy(() => import('@capacitor/haptics'));
  if (!mod?.Haptics) return;
  try {
    if (style === 'success') {
      await mod.Haptics.notification({ type: mod.NotificationType.Success });
    } else if (style === 'warning') {
      await mod.Haptics.notification({ type: mod.NotificationType.Warning });
    } else if (style === 'error') {
      await mod.Haptics.notification({ type: mod.NotificationType.Error });
    } else {
      await mod.Haptics.impact({
        style:
          style === 'heavy'
            ? mod.ImpactStyle.Heavy
            : style === 'medium'
            ? mod.ImpactStyle.Medium
            : mod.ImpactStyle.Light,
      });
    }
  } catch {
    /* noop */
  }
};

// ----------------------------- Share ----------------------------------------
export const shareText = async ({ title, text, url }) => {
  if (isNative()) {
    const Share = await lazy(() => import('@capacitor/share'));
    if (Share?.Share) {
      try {
        await Share.Share.share({ title, text, url, dialogTitle: title });
        return true;
      } catch {
        return false;
      }
    }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(url ?? text ?? title ?? '');
    return true;
  } catch {
    return false;
  }
};

// ----------------------------- Network --------------------------------------
export const subscribeNetwork = async (handler) => {
  if (isNative()) {
    const Net = await lazy(() => import('@capacitor/network'));
    if (Net?.Network) {
      const sub = await Net.Network.addListener('networkStatusChange', handler);
      Net.Network.getStatus().then(handler).catch(() => {});
      return () => sub.remove?.();
    }
  }
  const fire = () =>
    handler({
      connected: typeof navigator === 'undefined' ? true : navigator.onLine,
      connectionType: 'unknown',
    });
  fire();
  window.addEventListener('online', fire);
  window.addEventListener('offline', fire);
  return () => {
    window.removeEventListener('online', fire);
    window.removeEventListener('offline', fire);
  };
};

// ----------------------------- Open URL -------------------------------------
export const openExternal = async (url) => {
  if (isNative()) {
    const B = await lazy(() => import('@capacitor/browser'));
    if (B?.Browser) {
      try {
        await B.Browser.open({ url, presentationStyle: 'popover' });
        return;
      } catch {
        /* fallthrough */
      }
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

export { isNative, getPlatform };

// ----------------------------- Internals ------------------------------------
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('FileReader did not return a string'));
      // Strip the "data:<mime>;base64," prefix that Capacitor doesn't want
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
