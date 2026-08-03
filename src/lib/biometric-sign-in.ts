import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
  isBiometricUnavailable,
  isBiometricUserCancel,
  type BiometricSessionPayload,
} from '@/lib/biometric-auth-plugin';

export type BiometricSignInCapability = {
  /** Device can present a biometric prompt (native Android with enrolled biometrics). */
  deviceReady: boolean;
  /** A session is stored and can be unlocked with biometrics. */
  canUnlock: boolean;
  status: string;
};

export function isBiometricSignInSupportedPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getBiometricSignInCapability(): Promise<BiometricSignInCapability> {
  if (!isBiometricSignInSupportedPlatform()) {
    return { deviceReady: false, canUnlock: false, status: 'unsupported_platform' };
  }

  try {
    const [availability, stored] = await Promise.all([
      BiometricAuth.isAvailable(),
      BiometricAuth.hasStoredSession(),
    ]);
    return {
      deviceReady: availability.available,
      canUnlock: availability.available && stored.hasSession,
      status: availability.status,
    };
  } catch {
    return { deviceReady: false, canUnlock: false, status: 'error' };
  }
}

export async function enableBiometricSignIn(
  session: BiometricSessionPayload,
  options?: { reason?: string },
): Promise<{ error: Error | null }> {
  if (!isBiometricSignInSupportedPlatform()) {
    return { error: new Error('Biometric sign-in is only available in the Android app.') };
  }

  try {
    const availability = await BiometricAuth.isAvailable();
    if (!availability.available) {
      return {
        error: new Error(
          availability.status === 'none_enrolled'
            ? 'Set up a fingerprint or face unlock on this device first.'
            : 'Biometrics are not available on this device.',
        ),
      };
    }

    await BiometricAuth.authenticate({
      reason: options?.reason ?? 'Enable biometric sign-in',
    });
    await BiometricAuth.storeSession(session);
    return { error: null };
  } catch (error) {
    if (isBiometricUserCancel(error)) {
      return { error: new Error('Biometric confirmation was cancelled.') };
    }
    if (isBiometricUnavailable(error)) {
      return { error: new Error('Biometrics are not available on this device.') };
    }
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function disableBiometricSignIn(): Promise<{ error: Error | null }> {
  if (!isBiometricSignInSupportedPlatform()) {
    return { error: null };
  }

  try {
    await BiometricAuth.clearSession();
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Refresh stored tokens after a password sign-in when biometric unlock is already enabled.
 * Does not prompt — the user just authenticated with their password.
 */
export async function syncBiometricSessionIfEnabled(
  session: BiometricSessionPayload,
): Promise<void> {
  if (!isBiometricSignInSupportedPlatform()) return;

  try {
    const stored = await BiometricAuth.hasStoredSession();
    if (!stored.hasSession) return;
    await BiometricAuth.storeSession(session);
  } catch {
    // Ignore vault sync failures; password sign-in already succeeded.
  }
}

export async function unlockBiometricSession(options?: {
  reason?: string;
}): Promise<{ session: BiometricSessionPayload | null; error: Error | null }> {
  if (!isBiometricSignInSupportedPlatform()) {
    return {
      session: null,
      error: new Error('Biometric sign-in is only available in the Android app.'),
    };
  }

  try {
    const unlocked = await BiometricAuth.unlockSession({
      reason: options?.reason ?? 'Sign in to Civizen',
    });
    return {
      session: {
        accessToken: unlocked.accessToken,
        refreshToken: unlocked.refreshToken,
        userId: unlocked.userId,
        email: unlocked.email,
        displayName: unlocked.displayName,
      },
      error: null,
    };
  } catch (error) {
    if (isBiometricUserCancel(error)) {
      return { session: null, error: new Error('Biometric sign-in was cancelled.') };
    }
    if (isBiometricUnavailable(error)) {
      return {
        session: null,
        error: new Error('Biometric sign-in is not set up on this device.'),
      };
    }
    return {
      session: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
