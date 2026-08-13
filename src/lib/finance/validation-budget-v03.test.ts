import { describe, expect, it } from 'vitest';

import {
  summarizeValidationBudgetV03,
  VALIDATION_BUDGET_GROUPS_V03,
  VALIDATION_BUDGET_LINES_V03,
  VALIDATION_BUDGET_V03,
} from '@/lib/finance/validation-budget-v03';

describe('validation budget v0.3', () => {
  it('totals exactly $634,400,000.00 with draft/unpublished zeros', () => {
    expect(VALIDATION_BUDGET_V03.plannedTotalMinor).toBe(63_440_000_000);
    expect(VALIDATION_BUDGET_V03.plannedTotalUsd).toBe(634_400_000);
    expect(VALIDATION_BUDGET_V03.lifecycleStatus).toBe('draft');
    expect(VALIDATION_BUDGET_V03.isDemonstration).toBe(false);
    const summary = summarizeValidationBudgetV03();
    expect(summary.plannedMinor).toBe(63_440_000_000);
    expect(summary.groupCount).toBe(13);
    expect(summary.lineCount).toBe(53);
    expect(VALIDATION_BUDGET_LINES_V03.every((l) => l.committedMinor === 0 && l.actualMinor === 0)).toBe(true);
    expect(VALIDATION_BUDGET_LINES_V03.every((l) => l.publishFlag === false)).toBe(true);
  });

  it('matches Recommended Base structure from decision pack 33', () => {
    const byId = Object.fromEntries(VALIDATION_BUDGET_LINES_V03.map((l) => [l.workstreamId, l]));
    expect(byId['WS-15'].baseUsdM).toBe(18);
    expect(byId['WS-22'].baseUsdM).toBe(11.5);
    expect(byId['VAL-EX16'].baseUsdM).toBe(12);
    expect(byId['VAL-EX16'].title.toLowerCase()).toContain('quote-dependent');
    expect(byId['WS-24'].baseUsdM).toBe(78.3);
    expect(byId['WS-25'].baseUsdM + byId['WS-25.IR'].baseUsdM).toBeCloseTo(66.6, 5);
    const direct = VALIDATION_BUDGET_LINES_V03.filter(
      (l) => !['WS-24', 'WS-25', 'WS-25.IR'].includes(l.workstreamId),
    ).reduce((s, l) => s + l.baseUsdM, 0);
    expect(direct).toBeCloseTo(489.5, 5);
  });

  it('keeps Health/Insurance and validation labels visible', () => {
    expect(VALIDATION_BUDGET_LINES_V03.find((l) => l.workstreamId === 'WS-12.1')?.title).toMatch(/Health/);
    expect(VALIDATION_BUDGET_LINES_V03.find((l) => l.workstreamId === 'WS-12.4')?.title).toMatch(/Insurance/);
    expect(VALIDATION_BUDGET_LINES_V03.find((l) => l.workstreamId === 'WS-10')?.title).toContain(
      'Identity & credential interoperability validation',
    );
    expect(VALIDATION_BUDGET_LINES_V03.find((l) => l.workstreamId === 'WS-15')?.title).toContain(
      'Accessibility, localization & nondigital inclusion validation',
    );
    expect(VALIDATION_BUDGET_GROUPS_V03).toHaveLength(13);
  });
});
