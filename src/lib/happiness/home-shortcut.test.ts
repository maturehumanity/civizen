import { describe, expect, it } from 'vitest';

import {
  HAPPINESS_SHORTCUT_MOUTH,
  happinessShortcutAriaKey,
  happinessShortcutMouthPath,
  happinessShortcutTooltipUnassessedKey,
} from '@/lib/happiness/home-shortcut';
import { HAPPINESS_LEVELS } from '@/lib/happiness/types';

describe('Home Happiness shortcut presentation helpers', () => {
  it('gives each level a distinct mouth path and keeps copy free of scores', () => {
    expect(happinessShortcutMouthPath(null)).toBeNull();
    expect(happinessShortcutAriaKey(null)).toContain('Unassessed');
    expect(happinessShortcutTooltipUnassessedKey()).toBe('happiness.homeShortcutTooltipUnassessed');

    const mouths = HAPPINESS_LEVELS.map((level) => happinessShortcutMouthPath(level));
    expect(new Set(mouths).size).toBe(5);
    expect(HAPPINESS_SHORTCUT_MOUTH.struggling).not.toBe(HAPPINESS_SHORTCUT_MOUTH.thriving);
    for (const level of HAPPINESS_LEVELS) {
      expect(happinessShortcutAriaKey(level)).not.toMatch(/score|\/ 100/i);
    }
  });
});
