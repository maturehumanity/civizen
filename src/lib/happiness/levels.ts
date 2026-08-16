import {
  CHECKIN_FEELINGS,
  HAPPINESS_LEVELS,
  type CheckInFeeling,
  type HappinessLevel,
} from './types';

/** Inclusive lower bounds on the internal 0–100 scale. Never shown in UI. */
export const HAPPINESS_LEVEL_BOUNDS: Record<HappinessLevel, { min: number; max: number }> = {
  struggling: { min: 0, max: 19 },
  unsettled: { min: 20, max: 39 },
  balanced: { min: 40, max: 59 },
  flourishing: { min: 60, max: 79 },
  thriving: { min: 80, max: 100 },
};

export const FEELING_INTERNAL: Record<CheckInFeeling, number> = {
  very_difficult: 10,
  difficult: 30,
  okay: 50,
  good: 70,
  very_good: 90,
};

export const LEVEL_INTERNAL_MIDPOINT: Record<HappinessLevel, number> = {
  struggling: 10,
  unsettled: 30,
  balanced: 50,
  flourishing: 70,
  thriving: 90,
};

export function isHappinessLevel(value: string | null | undefined): value is HappinessLevel {
  return Boolean(value && (HAPPINESS_LEVELS as readonly string[]).includes(value));
}

export function isCheckInFeeling(value: string | null | undefined): value is CheckInFeeling {
  return Boolean(value && (CHECKIN_FEELINGS as readonly string[]).includes(value));
}

export function levelFromInternal(value: number): HappinessLevel {
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped <= HAPPINESS_LEVEL_BOUNDS.struggling.max) return 'struggling';
  if (clamped <= HAPPINESS_LEVEL_BOUNDS.unsettled.max) return 'unsettled';
  if (clamped <= HAPPINESS_LEVEL_BOUNDS.balanced.max) return 'balanced';
  if (clamped <= HAPPINESS_LEVEL_BOUNDS.flourishing.max) return 'flourishing';
  return 'thriving';
}

export function internalFromLevel(level: HappinessLevel): number {
  return LEVEL_INTERNAL_MIDPOINT[level];
}

export function internalFromFeeling(feeling: CheckInFeeling): number {
  return FEELING_INTERNAL[feeling];
}

export function compareLevels(a: HappinessLevel, b: HappinessLevel): number {
  return HAPPINESS_LEVELS.indexOf(a) - HAPPINESS_LEVELS.indexOf(b);
}

/** Phrase keys — states, not identities. Never "You are Struggling." */
export function overallLevelPhraseKey(level: HappinessLevel): string {
  return `happiness.levelPhrase.${level}`;
}

export function domainLevelPhraseKey(domain: string, level: HappinessLevel): string {
  return `happiness.domainPhrase.${level}`;
}

export function recentWellbeingPhraseKey(level: HappinessLevel): string {
  return `happiness.recentPhrase.${level}`;
}

export function levelMovedPhraseKey(): string {
  return 'happiness.levelMoved';
}
