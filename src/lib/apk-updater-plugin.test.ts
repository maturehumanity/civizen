import { describe, expect, it } from 'vitest';

import { isApkInstallPermissionError } from '@/lib/apk-updater-plugin';

describe('apk updater plugin helpers', () => {
  it('detects Capacitor install-permission reject codes', () => {
    expect(isApkInstallPermissionError({ code: 'INSTALL_PERMISSION_REQUIRED', message: 'x' })).toBe(true);
    expect(isApkInstallPermissionError({ code: 'OTHER', message: 'x' })).toBe(false);
    expect(isApkInstallPermissionError(new Error('nope'))).toBe(false);
    expect(isApkInstallPermissionError(null)).toBe(false);
  });
});
