export const WELLBEING_AGGREGATE_FORBIDDEN_SURFACES = [
  'profile',
  'home_feed',
  'civizen_score',
  'marketplace_jobs',
  'contribute_opportunities',
  'search',
  'civi_raw_member_records',
  'organization_member_lists',
  'governance_voting',
  'public_pages',
  'employee_ranking',
  'disciplinary_workflows',
  'promotion_termination',
  'manager_individual_alerts',
] as const;

export type WellbeingAggregateForbiddenSurface = (typeof WELLBEING_AGGREGATE_FORBIDDEN_SURFACES)[number];

export function mayUseAggregateOnSurface(surface: string): boolean {
  return !WELLBEING_AGGREGATE_FORBIDDEN_SURFACES.includes(surface as WellbeingAggregateForbiddenSurface);
}

export const WELLBEING_AGGREGATE_JOBS_FORBIDDEN = [
  'employer_candidate_ranking',
  'candidate_ranking',
  'job_recommendations',
  'hiring_decisions',
  'aggregate_participation_as_signal',
] as const;
