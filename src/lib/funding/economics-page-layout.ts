/**
 * Economics page section order — kept outside the React tree so tests can
 * assert hierarchy without mounting the Funding shell.
 */
export const ECONOMICS_PAGE_SECTION_ORDER = [
  'controls_and_summary',
  'selected_model_waterfall',
  'investor_illustration',
  'receipt_fpp_reconciliation',
  'commercial_capital_sources_uses',
  'annual_projection',
  'policy_formula_example',
  'assumptions',
] as const;

export type EconomicsPageSectionId = (typeof ECONOMICS_PAGE_SECTION_ORDER)[number];
