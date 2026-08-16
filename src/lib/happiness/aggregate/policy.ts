import { HAPPINESS_MIN_COHORT_SIZE } from '@/lib/happiness/privacy';

import type { AggregateDimensionId, AggregateDimensionMeta } from './types';
import { WELLBEING_AGGREGATE_PRIVACY_VERSION } from './types';

const STANDARD_COMPAT: AggregateDimensionId[] = [
  'organization',
  'community',
  'program',
  'approved_large_team',
  'domain',
  'factor_category',
  'work_context_type',
  'intervention_type',
  'time_bucket',
  'geography',
];

function allowed(id: AggregateDimensionId, extra?: Partial<AggregateDimensionMeta>): AggregateDimensionMeta {
  return {
    id,
    classification: 'allowed',
    sensitivity: 'standard',
    compatibleWith: STANDARD_COMPAT,
    ...extra,
  };
}

function prohibited(id: AggregateDimensionId): AggregateDimensionMeta {
  return { id, classification: 'prohibited', sensitivity: 'sensitive', compatibleWith: [] };
}

export const WELLBEING_AGGREGATE_PRIVACY_V1 = {
  version: WELLBEING_AGGREGATE_PRIVACY_VERSION,
  minCohort: HAPPINESS_MIN_COHORT_SIZE,
  smallCellMin: 5,
  maxNonTimeDimensions: 2,
  allowExactCounts: false,
  queryBudgetPerScope: 8,
  similarSliceWindowHours: 24,
  minTimeDays: 28,
  withdrawal: 'exclude_from_future_generation' as const,
  historicSnapshots: 'retain_without_rewrite' as const,
  dimensions: [
    allowed('organization'),
    allowed('community'),
    allowed('program'),
    allowed('approved_large_team', { minCohortOverride: 40, sensitivity: 'elevated' }),
    allowed('domain'),
    allowed('factor_category'),
    allowed('work_context_type'),
    allowed('intervention_type'),
    allowed('time_bucket', { timeGranularity: ['month', 'quarter', 'rolling_6_weeks'] }),
    allowed('geography', { geographyGranularity: ['city', 'region', 'community'] }),
    { id: 'team', classification: 'approval_required', sensitivity: 'elevated', compatibleWith: [], minCohortOverride: 40 },
    { id: 'age_group', classification: 'research_only', sensitivity: 'sensitive', compatibleWith: [] },
    { id: 'gender', classification: 'research_only', sensitivity: 'sensitive', compatibleWith: [] },
    { id: 'role', classification: 'elevated', sensitivity: 'elevated', compatibleWith: [] },
    { id: 'job_family', classification: 'elevated', sensitivity: 'elevated', compatibleWith: [] },
    prohibited('race'),
    prohibited('ethnicity'),
    prohibited('religion'),
    prohibited('political_affiliation'),
    prohibited('sexual_orientation'),
    prohibited('medical_condition'),
    prohibited('disability'),
    prohibited('immigration_status'),
    prohibited('street'),
    prohibited('building'),
    prohibited('gps'),
    prohibited('neighborhood'),
    prohibited('day'),
    prohibited('week'),
  ] satisfies AggregateDimensionMeta[],
} as const;

export type WellbeingAggregatePrivacyPolicy = typeof WELLBEING_AGGREGATE_PRIVACY_V1;

export function dimensionMeta(
  id: AggregateDimensionId,
  policy = WELLBEING_AGGREGATE_PRIVACY_V1,
): AggregateDimensionMeta | undefined {
  return policy.dimensions.find((row) => row.id === id);
}

export function cohortThresholdFor(ids: AggregateDimensionId[], policy = WELLBEING_AGGREGATE_PRIVACY_V1): number {
  const overrides = ids
    .map((id) => dimensionMeta(id, policy)?.minCohortOverride)
    .filter((value): value is number => typeof value === 'number');
  return Math.max(policy.minCohort, ...overrides);
}
