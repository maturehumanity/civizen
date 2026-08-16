import { HAPPINESS_LEVELS, type HappinessLevel } from './types';

/** Presentation helpers only. Do not derive Happiness level here. */

/** Mouth paths in a 24×24 lucide-style circle. Distinct at ~20px, not color-alone. */
export const HAPPINESS_SHORTCUT_MOUTH: Record<HappinessLevel, string> = {
  struggling: 'M8 14.6 Q12 21 16 14.6',
  unsettled: 'M8 15 Q12 18.2 16 15',
  balanced: 'M8 15.4 H16',
  flourishing: 'M8 15.7 Q12 12.6 16 15.7',
  thriving: 'M8 16 Q12 10 16 16',
};

export function happinessShortcutMouthPath(level: HappinessLevel | null | undefined): string | null {
  if (!level) return null;
  return HAPPINESS_SHORTCUT_MOUTH[level] ?? null;
}

export function happinessShortcutAriaKey(level: HappinessLevel | null | undefined): string {
  return level ? 'happiness.homeShortcutAria' : 'happiness.homeShortcutAriaUnassessed';
}

export function happinessShortcutTooltipUnassessedKey(): string {
  return 'happiness.homeShortcutTooltipUnassessed';
}

export function isHappinessShortcutLevel(level: string | null | undefined): level is HappinessLevel {
  return Boolean(level && (HAPPINESS_LEVELS as readonly string[]).includes(level));
}
