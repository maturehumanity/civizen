import { describe, expect, it } from 'vitest';

import {
  summarizeValidationBudgetV02,
  VALIDATION_BUDGET_GROUPS_V02,
  VALIDATION_BUDGET_LINES_V02,
  VALIDATION_BUDGET_V02,
} from '@/lib/finance/validation-budget-v02';

describe('validation budget v0.2', () => {
  it('totals exactly $530,200,000.00 with draft/unpublished zeros', () => {
    expect(VALIDATION_BUDGET_V02.plannedTotalMinor).toBe(53_020_000_000);
    expect(VALIDATION_BUDGET_V02.plannedTotalUsd).toBe(530_200_000);
    expect(VALIDATION_BUDGET_V02.lifecycleStatus).toBe('draft');
    expect(VALIDATION_BUDGET_V02.isDemonstration).toBe(false);
    const summary = summarizeValidationBudgetV02();
    expect(summary.plannedMinor).toBe(53_020_000_000);
    expect(summary.groupCount).toBe(13);
    expect(summary.lineCount).toBe(53);
    expect(VALIDATION_BUDGET_LINES_V02.every((l) => l.committedMinor === 0 && l.actualMinor === 0)).toBe(true);
    expect(VALIDATION_BUDGET_LINES_V02.every((l) => l.publishFlag === false)).toBe(true);
  });

  it('applies coverage adds without drawing contingency or safe-pause', () => {
    const byId = Object.fromEntries(VALIDATION_BUDGET_LINES_V02.map((l) => [l.workstreamId, l]));
    expect(byId['WS-24'].baseUsdM).toBe(65);
    expect(byId['WS-25'].baseUsdM + byId['WS-25.IR'].baseUsdM).toBe(55);
    const adds = ['VAL-AUD', 'VAL-SCR', 'VAL-EVT', 'VAL-DISP', 'VAL-EMR', 'VAL-UTIL', 'VAL-LOSS'] as const;
    expect(adds.reduce((s, id) => s + byId[id].baseUsdM, 0)).toBeCloseTo(6.2, 5);
    for (const id of adds) {
      expect(VALIDATION_BUDGET_LINES_V02.filter((l) => l.workstreamId === id)).toHaveLength(1);
    }
    expect(byId['VAL-AUD'].groupKey).toBe('procurement_controls');
    expect(byId['VAL-SCR'].groupKey).toBe('program_office');
    expect(byId['VAL-EVT'].groupKey).toBe('grants_civil_society');
    expect(byId['VAL-DISP'].groupKey).toBe('demos_cost_validation');
    expect(byId['VAL-UTIL'].groupKey).toBe('demos_cost_validation');
    expect(byId['VAL-EMR'].groupKey).toBe('explicit_opex');
    expect(byId['VAL-LOSS'].groupKey).toBe('explicit_opex');
    expect(byId['VAL-SCR'].title).toContain('Role-based screening');
    expect(byId['VAL-SCR'].description).toMatch(/Not universal participant screening/i);
    expect(byId['VAL-EMR'].description).toMatch(/not discretionary cash/i);
    expect(byId['VAL-LOSS'].title).toContain('Refunds, reversals, bad debt');
    expect(byId['WS-22'].title).toContain('Travel, fieldwork & international coordination');
  });

  it('keeps Health/Insurance labels and zero-sum disclosure splits', () => {
    expect(VALIDATION_BUDGET_LINES_V02.some((l) => l.workstreamId === 'WS-12')).toBe(false);
    expect(VALIDATION_BUDGET_LINES_V02.find((l) => l.workstreamId === 'WS-12.1')?.title).toMatch(/^WS-12\.1 · Health/);
    expect(VALIDATION_BUDGET_LINES_V02.find((l) => l.workstreamId === 'WS-12.4')?.title).toMatch(/^WS-12\.4 · Insurance/);
    expect(VALIDATION_BUDGET_GROUPS_V02).toHaveLength(13);
    const parentChild = [
      ['WS-01', 26, 'WS-01.ADM', 2],
      ['WS-05', 17, 'WS-05.TEC', 5],
      ['WS-17', 21, 'WS-17.HST', 3],
      ['WS-19', 5, 'WS-19.FIN', 2],
      ['WS-20', 8, 'WS-20.LIC', 2],
      ['WS-25', 51, 'WS-25.IR', 4],
    ] as const;
    for (const [p, pv, c, cv] of parentChild) {
      expect(VALIDATION_BUDGET_LINES_V02.find((l) => l.workstreamId === p)?.baseUsdM).toBe(pv);
      expect(VALIDATION_BUDGET_LINES_V02.find((l) => l.workstreamId === c)?.baseUsdM).toBe(cv);
    }
  });
});
