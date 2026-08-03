import type { CivicElectionSecurityClass } from './types';

/** Default primary voting window: 5 minutes. */
export const DEFAULT_PRIMARY_WINDOW_SECONDS = 300;

/** Default max attempts: primary + 2 retries. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/** Default spacing between retries: every other day. */
export const DEFAULT_RETRY_SPACING_HOURS = 48;

export type SecurityClassGatePolicy = {
  primaryWindowSeconds: number;
  maxAttempts: number;
  retrySpacingHours: number;
  requireHomePresence: boolean;
  requireSolitude: boolean;
  requireFaceLiveness: boolean;
  requireNativeApp: boolean;
};

export function securityClassGatePolicy(
  securityClass: CivicElectionSecurityClass,
): SecurityClassGatePolicy {
  switch (securityClass) {
    case 'constitutional':
      return {
        primaryWindowSeconds: DEFAULT_PRIMARY_WINDOW_SECONDS,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        retrySpacingHours: DEFAULT_RETRY_SPACING_HOURS,
        requireHomePresence: true,
        requireSolitude: true,
        requireFaceLiveness: true,
        requireNativeApp: true,
      };
    case 'elevated':
      return {
        primaryWindowSeconds: DEFAULT_PRIMARY_WINDOW_SECONDS,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        retrySpacingHours: DEFAULT_RETRY_SPACING_HOURS,
        requireHomePresence: true,
        requireSolitude: false,
        requireFaceLiveness: true,
        requireNativeApp: true,
      };
    case 'ordinary':
    default:
      return {
        primaryWindowSeconds: 900,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        retrySpacingHours: DEFAULT_RETRY_SPACING_HOURS,
        requireHomePresence: false,
        requireSolitude: false,
        requireFaceLiveness: false,
        requireNativeApp: true,
      };
  }
}

export function isHighStakesSecurityClass(securityClass: CivicElectionSecurityClass): boolean {
  return securityClass === 'elevated' || securityClass === 'constitutional';
}

/** National executive-style contests use constitutional class by convention. */
export function recommendedSecurityClassForTier(
  tier: 'neighborhood' | 'local' | 'district' | 'regional' | 'national' | 'supranational',
  isExecutiveOffice = false,
): CivicElectionSecurityClass {
  if (tier === 'national' || tier === 'supranational') {
    return isExecutiveOffice ? 'constitutional' : 'elevated';
  }
  if (tier === 'regional' || tier === 'district') {
    return 'elevated';
  }
  return 'ordinary';
}
