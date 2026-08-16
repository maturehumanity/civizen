export const FULFILLMENT_PRIVATE_FIELDS = [
  'concerns',
  'goals',
  'causes',
  'notes',
  'actions',
  'supportChoices',
  'civiSummaries',
  'followUps',
  'helpfulness',
  'interventionHistory',
  'desiredOutcome',
  'planFactors',
  'dismissals',
  'recommendationHistory',
] as const;

export const FULFILLMENT_PROHIBITED_SURFACES = [
  'profile',
  'score',
  'search',
  'marketplace_jobs',
  'opportunities',
  'employers',
  'publishers',
  'other_members',
  'public_profiles',
  'governance_power',
  'trust_ranking',
  'assistant_general_knowledge',
] as const;

export function fulfillmentPlanMustStayPrivate(): true {
  return true;
}

export function mustNotExposeNumericJobFitScore(): true {
  return true;
}

export function mustNotDiagnoseHealth(): true {
  return true;
}
