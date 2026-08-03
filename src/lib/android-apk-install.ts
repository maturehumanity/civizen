import { Capacitor } from '@capacitor/core';

import {
  ApkUpdater,
  isApkInstallPermissionError,
} from '@/lib/apk-updater-plugin';
import { canUseExternalAndroidApkUpdates, DISTRIBUTION_CHANNEL } from '@/lib/distribution';

export type AndroidApkInstallMode = 'native' | 'browser' | 'needs_permission';

export class AndroidApkInstallPermissionError extends Error {
  readonly code = 'INSTALL_PERMISSION_REQUIRED';

  constructor(message = 'Install permission required') {
    super(message);
    this.name = 'AndroidApkInstallPermissionError';
  }
}

export function canUseInAppApkInstall() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'android' &&
    canUseExternalAndroidApkUpdates(DISTRIBUTION_CHANNEL)
  );
}

async function openExternalDownload(url: string) {
  if (canUseInAppApkInstall()) {
    try {
      // Keep the Capacitor WebView on the app origin — do not location.assign the APK URL.
      await ApkUpdater.openExternalUrl({ url });
      return;
    } catch (error) {
      console.warn('ApkUpdater.openExternalUrl failed; using window.open fallback', error);
    }
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    // Last resort for restricted WebViews; avoid replacing the running app document when possible.
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

/**
 * Prefer native download + system installer on Android sideload builds.
 * Falls back to an external download activity when the native plugin is unavailable.
 * Throws {@link AndroidApkInstallPermissionError} when the OS needs install permission —
 * callers must keep the update UI and retry (do not treat as a hard failure loop).
 */
export async function installAndroidApkFromUrl(downloadUrl: string): Promise<AndroidApkInstallMode> {
  const url = new URL(downloadUrl);
  url.searchParams.set('install_attempt', Date.now().toString());
  const finalUrl = url.toString();

  if (!canUseInAppApkInstall()) {
    await openExternalDownload(finalUrl);
    return 'browser';
  }

  try {
    await ApkUpdater.downloadAndInstall({ url: finalUrl });
    return 'native';
  } catch (error) {
    if (isApkInstallPermissionError(error) || error instanceof AndroidApkInstallPermissionError) {
      throw new AndroidApkInstallPermissionError(
        error instanceof Error ? error.message : 'Install permission required',
      );
    }

    console.warn('ApkUpdater.downloadAndInstall failed; falling back to external download', error);
    await openExternalDownload(finalUrl);
    return 'browser';
  }
}
