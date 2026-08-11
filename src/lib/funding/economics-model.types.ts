/**
 * Commercial economics planning types (docs 20 / 22 / 23 / 24 / 27).
 * Scenario-planning only — not an offer, payout, or ledger schema.
 */

/** Commercial operating performance scenarios from doc 20 annual CF. */
export type CommercialPerformanceScenario = 'conservative' | 'base' | 'growth';

/**
 * Private-capital eligibility cases within the ~$37.5B base ecosystem scenario
 * (doc 27 §6). Not ecosystem Low/Base/High totals.
 */
export type PrivateCapitalEligibilityCase = 'low' | 'base' | 'high';

export type EconomicsHorizonYears = 5 | 10 | 15;

export type EconomicsVehicleId =
  | 'V-ENT'
  | 'V-OPS'
  | 'V-JUR'
  | 'V-DISC'
  | 'V-SEC-EDU'
  | 'V-SEC-EMP';

export type CommercialAnnualRow = {
  scenario: CommercialPerformanceScenario;
  year: number;
  revenueUsdM: number;
  costOfSalesUsdM: number;
  opexUsdM: number;
  /** Eligible distributable commercial cash for the year (floored at 0). */
  distributableUsdM: number;
  securityUsdM: number;
  taxUsdM: number;
  reserveUsdM: number;
  reinvestUsdM: number;
  debtServiceUsdM: number;
};

export type EcosystemSuballocation = {
  id: string;
  label: string;
  /** Share of eligible distributable commercial cash (must sum to 0.80). */
  shareOfDistributable: number;
};

export type AllocationLifecycle = {
  accruedUsdM: number;
  vestedUsdM: number;
  payableUsdM: number;
  paidUsdM: number;
};
