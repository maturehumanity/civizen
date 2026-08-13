import { describe, expect, it } from 'vitest';

import { PROGRAM_PLAN_SUMMARY } from '@/lib/funding/program-plan-summary.generated';

describe('program-plan-summary v0.3', () => {
  it('centers Recommended Validation Base and preserves five-year hypothesis', () => {
    expect(PROGRAM_PLAN_SUMMARY.validation.totalsUsdM).toEqual({ low: 552.4, base: 634.4, high: 833.2 });
    expect(PROGRAM_PLAN_SUMMARY.validation.appBudgetName).toBe(
      'Civizen Pre-Major-Build Validation Program v0.3',
    );
    expect(PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.modeledBaseUsdB).toBe(37.5);
    expect(PROGRAM_PLAN_SUMMARY.reconciliation.validationWorkingDraft).toBe('v0.3');
  });

  it('reconciles funding-control split and tranche pacing to Base', () => {
    const c = PROGRAM_PLAN_SUMMARY.validation.fundingControlBaseUsdM;
    expect(c.core + c.independent + c.grant_pass_through + c.reserve).toBeCloseTo(634.4, 5);
    const d = PROGRAM_PLAN_SUMMARY.validation.directContingencySafePauseUsdM;
    expect(d.direct + d.contingency + d.safePause).toBeCloseTo(634.4, 5);
    const trancheSum = PROGRAM_PLAN_SUMMARY.validation.baseTranchePacing.reduce(
      (s, t) => s + t.indicativeDirectUsdM,
      0,
    );
    expect(trancheSum).toBeCloseTo(634.4, 5);
    expect(PROGRAM_PLAN_SUMMARY.validation.scopeAlternativesUsdM.constrained_different_scope).toBe(373.8);
    expect(PROGRAM_PLAN_SUMMARY.validation.scopeAlternativesUsdM.expanded_different_scope).toBe(1032.7);
  });
});
