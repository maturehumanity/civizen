import { describe, expect, it } from 'vitest';

import { sumLineAmounts } from '@/lib/finance/budget-rules';
import {
  BUDGET_PHASES_V01,
  INITIAL_BUDGET_GROUPS_V01,
  INITIAL_BUDGET_LINES_V01,
  INITIAL_BUDGET_V01,
  summarizeInitialBudgetV01,
} from '@/lib/finance/initial-budget-v01';

describe('initial working budget v0.1 structure', () => {
  it('keeps draft metadata and demonstration flag for TBD amounts', () => {
    expect(INITIAL_BUDGET_V01.lifecycleStatus).toBe('draft');
    expect(INITIAL_BUDGET_V01.isDemonstration).toBe(true);
    expect(INITIAL_BUDGET_V01.currency).toBe('USD');
    expect(INITIAL_BUDGET_V01.version).toBe(1);
  });

  it('covers required expense groups and phases without inventing money', () => {
    const groupKeys = new Set(INITIAL_BUDGET_GROUPS_V01.map((g) => g.key));
    expect(groupKeys.has('product_engineering')).toBe(true);
    expect(groupKeys.has('design_accessibility')).toBe(true);
    expect(groupKeys.has('security_privacy')).toBe(true);
    expect(groupKeys.has('infrastructure_tools')).toBe(true);
    expect(groupKeys.has('legal_governance')).toBe(true);
    expect(groupKeys.has('research_pilots')).toBe(true);
    expect(groupKeys.has('operations')).toBe(true);
    expect(groupKeys.has('partnerships_comms')).toBe(true);
    expect(groupKeys.has('contingency')).toBe(true);

    expect(BUDGET_PHASES_V01.map((p) => p.id)).toEqual(['phase1', 'phase2', 'phase3', 'annual']);

    for (const line of INITIAL_BUDGET_LINES_V01) {
      expect(groupKeys.has(line.groupKey)).toBe(true);
      expect(line.plannedMinor).toBe(0);
      expect(line.committedMinor).toBe(0);
      expect(line.actualMinor).toBe(0);
      expect(line.publishFlag).toBe(false);
      expect(line.periodLabel).toContain('TBD');
    }
  });

  it('reconciles totals with planned/committed/actual distinct and zero', () => {
    const summary = summarizeInitialBudgetV01();
    expect(summary.amountsAreTbd).toBe(true);
    expect(summary.plannedMinor).toBe(0);
    expect(summary.committedMinor).toBe(0);
    expect(summary.actualMinor).toBe(0);
    expect(summary.currency).toBe('USD');

    const totals = sumLineAmounts(
      INITIAL_BUDGET_LINES_V01.map((l) => ({
        plannedMinor: l.plannedMinor,
        committedMinor: l.committedMinor,
        actualMinor: l.actualMinor,
        currency: l.currency,
      })),
      'USD',
    );
    expect(totals.plannedMinor).toBe(0);
    expect(totals.committedMinor).toBe(0);
    expect(totals.actualMinor).toBe(0);

    // One currency only — no silent multi-currency merge possible in this draft.
    expect(new Set(INITIAL_BUDGET_LINES_V01.map((l) => l.currency))).toEqual(new Set(['USD']));
  });

  it('distinguishes one-time and recurring cost classes in metadata', () => {
    const classes = new Set(INITIAL_BUDGET_LINES_V01.map((l) => l.costClass));
    expect(classes.has('one_time')).toBe(true);
    expect(classes.has('recurring')).toBe(true);
    expect(classes.has('personnel_or_service')).toBe(true);
    expect(classes.has('infrastructure_or_vendor')).toBe(true);
    expect(classes.has('reserve')).toBe(true);
  });

  it('does not fabricate funding ledger entities', () => {
    // Structural guarantee: this module exports budget structure only.
    expect('commitments' in (INITIAL_BUDGET_V01 as object)).toBe(false);
    expect('receipts' in (INITIAL_BUDGET_V01 as object)).toBe(false);
    expect(INITIAL_BUDGET_LINES_V01.every((l) => l.plannedMinor === 0)).toBe(true);
  });

  it('matches the documented line and group counts for reconciliation', () => {
    expect(INITIAL_BUDGET_GROUPS_V01).toHaveLength(9);
    expect(INITIAL_BUDGET_LINES_V01).toHaveLength(22);
    expect(INITIAL_BUDGET_LINES_V01.filter((l) => l.costClass === 'one_time')).toHaveLength(7);
    expect(INITIAL_BUDGET_LINES_V01.filter((l) => l.costClass === 'recurring')).toHaveLength(2);
    expect(INITIAL_BUDGET_LINES_V01.filter((l) => l.costClass === 'personnel_or_service')).toHaveLength(9);
    expect(INITIAL_BUDGET_LINES_V01.filter((l) => l.costClass === 'infrastructure_or_vendor')).toHaveLength(3);
    expect(INITIAL_BUDGET_LINES_V01.filter((l) => l.costClass === 'reserve')).toHaveLength(1);
  });

  it('stays out of the public finance surface until explicitly published', () => {
    // Public RPC only returns approved + published_at IS NOT NULL budgets.
    // Draft + unpublished + publish_flag=false means this skeleton cannot appear publicly.
    expect(INITIAL_BUDGET_V01.lifecycleStatus).toBe('draft');
    expect(INITIAL_BUDGET_LINES_V01.every((l) => l.publishFlag === false)).toBe(true);
  });
});
