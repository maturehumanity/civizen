import { describe, expect, it } from 'vitest';

import {
  BIOMETRIC_FAILED,
  BIOMETRIC_NO_SESSION,
  BIOMETRIC_UNAVAILABLE,
  BIOMETRIC_USER_CANCEL,
  getBiometricErrorCode,
  isBiometricUnavailable,
  isBiometricUserCancel,
} from '@/lib/biometric-auth-plugin';

describe('biometric auth plugin helpers', () => {
  it('reads Capacitor reject codes', () => {
    expect(getBiometricErrorCode({ code: BIOMETRIC_USER_CANCEL })).toBe(BIOMETRIC_USER_CANCEL);
    expect(getBiometricErrorCode(new Error('x'))).toBeNull();
    expect(getBiometricErrorCode(null)).toBeNull();
  });

  it('detects cancel and unavailable codes', () => {
    expect(isBiometricUserCancel({ code: BIOMETRIC_USER_CANCEL })).toBe(true);
    expect(isBiometricUserCancel({ code: BIOMETRIC_FAILED })).toBe(false);
    expect(isBiometricUnavailable({ code: BIOMETRIC_UNAVAILABLE })).toBe(true);
    expect(isBiometricUnavailable({ code: BIOMETRIC_NO_SESSION })).toBe(true);
    expect(isBiometricUnavailable({ code: BIOMETRIC_USER_CANCEL })).toBe(false);
  });
});
