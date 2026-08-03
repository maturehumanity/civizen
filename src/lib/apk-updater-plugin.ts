import { registerPlugin } from '@capacitor/core';

export type ApkUpdaterDownloadResult = {
  ok: boolean;
  path?: string;
};

export type ApkUpdaterOpenResult = {
  ok: boolean;
};

export interface ApkUpdaterPlugin {
  downloadAndInstall(options: { url: string }): Promise<ApkUpdaterDownloadResult>;
  openExternalUrl(options: { url: string }): Promise<ApkUpdaterOpenResult>;
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater', {
  web: () => ({
    async downloadAndInstall() {
      throw new Error('In-app APK install is only available on Android sideload builds.');
    },
    async openExternalUrl() {
      throw new Error('External URL open is only available on Android sideload builds.');
    },
  }),
});

export const APK_INSTALL_PERMISSION_REQUIRED = 'INSTALL_PERMISSION_REQUIRED';

export function isApkInstallPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === APK_INSTALL_PERMISSION_REQUIRED;
}
