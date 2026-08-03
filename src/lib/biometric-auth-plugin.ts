import { registerPlugin } from '@capacitor/core';

export type BiometricAvailability = {
  available: boolean;
  status: string;
};

export type BiometricStoredSessionProbe = {
  hasSession: boolean;
};

export type BiometricSessionPayload = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
  displayName?: string;
};

export type BiometricUnlockResult = BiometricSessionPayload & {
  ok: boolean;
};

export interface BiometricAuthPlugin {
  isAvailable(): Promise<BiometricAvailability>;
  hasStoredSession(): Promise<BiometricStoredSessionProbe>;
  storeSession(options: BiometricSessionPayload): Promise<{ ok: boolean }>;
  clearSession(): Promise<{ ok: boolean }>;
  authenticate(options?: { reason?: string }): Promise<{ ok: boolean }>;
  unlockSession(options?: { reason?: string }): Promise<BiometricUnlockResult>;
}

const webStub: BiometricAuthPlugin = {
  async isAvailable() {
    return { available: false, status: 'web_unsupported' };
  },
  async hasStoredSession() {
    return { hasSession: false };
  },
  async storeSession() {
    throw new Error('Biometric sign-in is only available in the Android app.');
  },
  async clearSession() {
    return { ok: true };
  },
  async authenticate() {
    throw new Error('Biometric sign-in is only available in the Android app.');
  },
  async unlockSession() {
    throw new Error('Biometric sign-in is only available in the Android app.');
  },
};

export const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth', {
  web: () => webStub,
});

export const BIOMETRIC_UNAVAILABLE = 'BIOMETRIC_UNAVAILABLE';
export const BIOMETRIC_USER_CANCEL = 'BIOMETRIC_USER_CANCEL';
export const BIOMETRIC_FAILED = 'BIOMETRIC_FAILED';
export const BIOMETRIC_NO_SESSION = 'BIOMETRIC_NO_SESSION';

export function getBiometricErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function isBiometricUserCancel(error: unknown): boolean {
  return getBiometricErrorCode(error) === BIOMETRIC_USER_CANCEL;
}

export function isBiometricUnavailable(error: unknown): boolean {
  const code = getBiometricErrorCode(error);
  return code === BIOMETRIC_UNAVAILABLE || code === BIOMETRIC_NO_SESSION;
}
