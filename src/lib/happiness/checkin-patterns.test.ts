import { describe, expect, it } from 'vitest';

import { explainCheckInPatterns, formatCheckInPattern } from '@/lib/happiness/checkin-patterns';
import { observedFactorTagsFromCheckIns } from '@/lib/happiness/fulfillment/engine';
import type { HappinessCause, HappinessCheckIn } from '@/lib/happiness/types';
import { baseTranslations, translateMessage } from '@/lib/i18n';

function checkIn(id: string, areas: HappinessCheckIn['areas']): HappinessCheckIn {
  return {
    id,
    profileId: 'p1',
    feeling: 'okay',
    affectingMost: areas[0]?.category ?? null,
    areas,
    note: null,
    createdAt: '2026-08-15T10:00:00Z',
  };
}

function cause(sourceId: string, category: string, polarity: HappinessCause['polarity'] = 'problem'): HappinessCause {
  return {
    id: `${sourceId}-${category}-${polarity}`,
    profileId: 'p1',
    sourceKind: 'checkin',
    sourceId,
    domain: 'work_fulfillment',
    group: 'work',
    category,
    polarity,
    confirmed: true,
    isAiSuggestion: false,
    note: null,
    createdAt: '2026-08-15T10:00:00Z',
  };
}

describe('adaptive check-in patterns', () => {
  it('explains specific work causes after several check-ins, not merely Work', () => {
    const checkIns = [
      checkIn('c1', [{ category: 'work', polarity: 'problem' }]),
      checkIn('c2', [{ category: 'work', polarity: 'problem' }, { category: 'relationships', polarity: 'support' }]),
      checkIn('c3', [{ category: 'work', polarity: 'problem' }]),
    ];
    const causes = [
      cause('c1', 'work'),
      cause('c1', 'tasks'),
      cause('c1', 'workload'),
      cause('c2', 'work'),
      cause('c2', 'tasks'),
      cause('c2', 'belonging', 'support'),
      cause('c3', 'work'),
      cause('c3', 'tasks'),
      cause('c3', 'workload'),
    ];
    const patterns = explainCheckInPatterns(checkIns, causes);
    expect(patterns.some((row) => row.category === 'work' && row.polarity === 'problem' && row.tags.includes('tasks'))).toBe(true);
    expect(patterns.some((row) => row.category === 'work' && row.tags.includes('workload'))).toBe(true);
    const work = patterns.find((row) => row.category === 'work' && row.polarity === 'problem');
    const t = (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars);
    const copy = formatCheckInPattern(work!, t);
    expect(copy).toMatch(/Work/);
    expect(copy).toMatch(/Tasks/i);
    expect(copy).toMatch(/making things harder/i);
    expect(copy).not.toMatch(/Balanced \+ Work/);
    expect(observedFactorTagsFromCheckIns('work_fulfillment', checkIns, causes)).toEqual(expect.arrayContaining(['tasks', 'workload']));
  });
});
