/**
 * Cooling-off after identity enrollment or home-address change before high-stakes eligibility.
 */

import type { CivicElectionSecurityClass } from './types';

/** Hours before high-stakes voting after a sensitive change. */
export const COOLING_OFF_HOURS: Record<CivicElectionSecurityClass, number> = {
  ordinary: 0,
  elevated: 24,
  constitutional: 72,
};

export type CoolingOffSource = 'home_address_change' | 'identity_enrollment' | 'face_reenrollment';

export function coolingOffHoursFor(
  securityClass: CivicElectionSecurityClass,
  source: CoolingOffSource,
): number {
  const base = COOLING_OFF_HOURS[securityClass];
  if (source === 'face_reenrollment') return Math.max(base, 24);
  if (source === 'identity_enrollment') return Math.max(base, COOLING_OFF_HOURS.elevated);
  return base;
}

export function computeCoolingOffUntil(input: {
  changedAt: Date;
  securityClass: CivicElectionSecurityClass;
  source: CoolingOffSource;
}): Date | null {
  const hours = coolingOffHoursFor(input.securityClass, input.source);
  if (hours <= 0) return null;
  return new Date(input.changedAt.getTime() + hours * 60 * 60 * 1000);
}

export function isCoolingOffActive(input: {
  now: Date;
  coolingOffUntil: Date | null | undefined;
}): boolean {
  if (!input.coolingOffUntil) return false;
  return input.now.getTime() < input.coolingOffUntil.getTime();
}

export function remainingCoolingOffHours(input: {
  now: Date;
  coolingOffUntil: Date | null | undefined;
}): number {
  if (!input.coolingOffUntil) return 0;
  const ms = input.coolingOffUntil.getTime() - input.now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (60 * 60 * 1000));
}

/**
 * Merge multiple cooling-off deadlines — the latest wins.
 */
export function mergeCoolingOffUntil(dates: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (!date) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  return latest;
}
