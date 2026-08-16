/**
 * Privacy rules for Happiness & Human Fulfillment.
 * Individual wellbeing data is private by default and must never feed Score,
 * reputation, hiring, governance power, insurance, credit, or access rights.
 */

export const HAPPINESS_MIN_COHORT_SIZE = 25;

export const HAPPINESS_PROHIBITED_USES = [
  'civizen_score',
  'public_reputation',
  'trust_ranking',
  'governance_voting_power',
  'employment_ranking',
  'hiring_eligibility',
  'insurance_decisions',
  'credit_decisions',
  'access_to_rights_or_services',
  'disciplinary_decisions',
] as const;

export type HappinessProhibitedUse = (typeof HAPPINESS_PROHIBITED_USES)[number];

export const DEFAULT_HAPPINESS_PRIVACY = {
  checkinsEnabled: true,
  recommendationsEnabled: true,
  optionalSharingEnabled: false,
} as const;

export function canShowGroupWellbeing(participantCount: number, minCohort = HAPPINESS_MIN_COHORT_SIZE): boolean {
  return participantCount >= minCohort;
}

export function assertHappinessNotUsedFor(use: string): void {
  if ((HAPPINESS_PROHIBITED_USES as readonly string[]).includes(use)) {
    throw new Error(`Happiness data must not be used for ${use}.`);
  }
}

export function opportunityPublishersMustNotReceiveWellbeing(): true {
  return true;
}

/** Phase 4A: individual Happiness remains owner-only. Aggregates use a separate participation + suppression layer. */
export const HAPPINESS_AGGREGATE_PARTICIPATION_DEFAULT = false;
