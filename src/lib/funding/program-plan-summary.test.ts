import { describe, expect, it } from 'vitest';

import { PROGRAM_PLAN_SUMMARY } from '@/lib/funding/program-plan-summary.generated';

describe('program plan summary artifact', () => {
  it('exposes validation and five-year totals that match canonical metas', () => {
    expect(PROGRAM_PLAN_SUMMARY.validation.totalsUsdM).toEqual({ low: 438.3, base: 530.2, high: 654.5 });
    expect(PROGRAM_PLAN_SUMMARY.validation.historicalV01TotalsUsdM).toEqual({ low: 202, base: 446, high: 898 });
    expect(PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.modeledBaseUsdB).toBe(37.5);
    expect(PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.rangeUsdB).toEqual({ lowRounded: 30, highRounded: 50 });
    const years = PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.annualBaseCashflowUsdB.map((y) => y.amountUsdB);
    expect(years).toEqual([3.0, 5.25, 7.5, 9.75, 12.0]);
    expect(years.reduce((a, b) => a + b, 0)).toBeCloseTo(37.5, 5);
  });

  it('labels long-range outlook as advanced internal scenarios, not budgets', () => {
    expect(PROGRAM_PLAN_SUMMARY.longRangeOutlook.advancedDisclosureOnly).toBe(true);
    expect(PROGRAM_PLAN_SUMMARY.longRangeOutlook.confidence).toBe('low');
    expect(PROGRAM_PLAN_SUMMARY.status).toBe('non_approved_planning_estimates');
    expect(PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.notSingleOrganizationBudget).toBe(true);
    expect(PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.notWorldwideCompletion).toBe(true);
  });

  it('keeps funding-control categories reconciling to validation base', () => {
    const c = PROGRAM_PLAN_SUMMARY.validation.fundingControlBaseUsdM;
    expect(c.core + c.independent + c.grant_pass_through + c.reserve).toBeCloseTo(530.2, 5);
  });

  it('separates health framework from JP/II deployment and documents SD-INS carve', () => {
    const d = PROGRAM_PLAN_SUMMARY.fiveYearFirstWave.domainLayers;
    expect(d.health.frameworkSdHeaUsdM).toBe(280);
    expect(d.health.jpIiProvisionalDeploymentUsdM).toBe(1870);
    expect(d.health.notWorldwideHealthImplementation).toBe(true);
    expect(d.insuranceSystems.sdInsFrameworkUsdM).toBe(120);
    expect(d.insuranceSystems.fundingSource).toContain('carve');
  });
});
