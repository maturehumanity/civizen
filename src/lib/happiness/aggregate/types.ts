/**
 * Phase 4A wellbeing aggregate types.
 * Aggregate insight must never become a back door to individual Happiness surveillance.
 */

import type { HappinessDomainId, HappinessLevel } from '@/lib/happiness/types';

export const WELLBEING_AGGREGATE_PRIVACY_VERSION = 'wellbeing-aggregate-privacy-v1';
export const WELLBEING_AGGREGATE_MODEL_VERSION = 'wellbeing-aggregate-v1';
export const SYSTEMIC_PATTERN_MODEL_VERSION = 'systemic-pattern-v1';

export const AGGREGATE_TIME_BUCKETS = ['month', 'quarter', 'rolling_6_weeks'] as const;
export type AggregateTimeBucket = (typeof AGGREGATE_TIME_BUCKETS)[number];

export const AGGREGATE_GEOGRAPHY_GRAINS = ['city', 'region', 'community'] as const;
export type AggregateGeographyGrain = (typeof AGGREGATE_GEOGRAPHY_GRAINS)[number];

export const AGGREGATE_TOPICS = [
  'domain_state',
  'factor_category',
  'work_dimension',
  'intervention_helpfulness',
  'trend',
] as const;
export type AggregateTopic = (typeof AGGREGATE_TOPICS)[number];

export const SUPPRESSION_REASONS = [
  'insufficient_participation',
  'cohort_too_small',
  'combination_too_specific',
  'not_enough_observations',
  'time_period_too_narrow',
  'dimension_not_permitted',
  'geography_not_permitted',
  'unauthorized',
  'scope_not_enabled',
  'similar_slice_restricted',
  'query_budget_exceeded',
  'small_cell_only',
  'bypass_not_permitted',
] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

export const PARTICIPATION_BANDS = ['insufficient', 'sufficient', 'broad'] as const;
export type ParticipationBand = (typeof PARTICIPATION_BANDS)[number];

export const SYSTEMIC_ISSUE_STATUSES = ['observing', 'emerging', 'established_pattern', 'needs_review', 'archived'] as const;
export type SystemicIssueStatus = (typeof SYSTEMIC_ISSUE_STATUSES)[number];

export const DIMENSION_CLASSES = ['allowed', 'elevated', 'approval_required', 'research_only', 'prohibited'] as const;
export type DimensionClass = (typeof DIMENSION_CLASSES)[number];

export type AggregateDimensionId =
  | 'organization'
  | 'community'
  | 'program'
  | 'approved_large_team'
  | 'domain'
  | 'factor_category'
  | 'work_context_type'
  | 'intervention_type'
  | 'time_bucket'
  | 'geography'
  | 'race'
  | 'ethnicity'
  | 'religion'
  | 'political_affiliation'
  | 'sexual_orientation'
  | 'medical_condition'
  | 'disability'
  | 'immigration_status'
  | 'age_group'
  | 'gender'
  | 'street'
  | 'building'
  | 'gps'
  | 'neighborhood'
  | 'day'
  | 'week'
  | 'team'
  | 'role'
  | 'job_family';

export type AggregateDimensionMeta = {
  id: AggregateDimensionId;
  classification: DimensionClass;
  sensitivity: 'standard' | 'elevated' | 'sensitive';
  minCohortOverride?: number;
  compatibleWith: AggregateDimensionId[];
  timeGranularity?: AggregateTimeBucket[];
  geographyGranularity?: AggregateGeographyGrain[];
};

export type AggregateQuery = {
  scopeId: string;
  topic: AggregateTopic;
  timeBucket: AggregateTimeBucket;
  periodStart: string;
  domain?: HappinessDomainId;
  factorCategory?: string;
  interventionType?: string;
  workContextType?: string;
  geography?: AggregateGeographyGrain | null;
};

export type AggregateRequester = {
  profileId: string;
  canViewScope: boolean;
};

export type EligibleObservation = {
  /** Opaque per-member token for uniqueness only. Never copied into aggregate output. */
  memberKey: string;
  participating: boolean;
  inScope: boolean;
  inPeriod: boolean;
  domain?: HappinessDomainId;
  level?: HappinessLevel;
  factorCategory?: string;
  interventionType?: string;
  helped?: 'not_at_all' | 'a_little' | 'somewhat' | 'a_lot';
  workContextType?: string;
  geographyGrain?: AggregateGeographyGrain;
  /** Ignored. Free text must never enter the aggregate layer. */
  privateNote?: string;
};

export type QualifyingScope = {
  id: string;
  kind: 'organization' | 'community' | 'program' | 'city' | 'region' | 'approved_large_team';
  enabled: boolean;
  viewerProfileIds: string[];
  label?: string;
};

export type PriorAggregateQuery = {
  fingerprint: string;
  queriedAt: string;
};

export type AggregateInsightResult = {
  kind: 'insight';
  scopeId: string;
  topic: AggregateTopic;
  domain?: HappinessDomainId;
  timeBucket: AggregateTimeBucket;
  periodStart: string;
  summary: string;
  sufficiency: ParticipationBand;
  confidence: 'low' | 'moderate';
  sourceTypes: string[];
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
  suppression: null;
  /** Present only as a band, never an exact low count. */
  participation: ParticipationBand;
  groupedDistribution?: Record<string, 'shown' | 'grouped' | 'suppressed'>;
};

export type AggregateSuppressedResult = {
  kind: 'suppressed';
  reason: SuppressionReason;
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
  summary: string;
};

export type WellbeingAggregateResult = AggregateInsightResult | AggregateSuppressedResult;

export type AggregateAuditRecord = {
  requesterProfileId: string;
  scopeId: string;
  fingerprint: string;
  timeBucket: AggregateTimeBucket;
  topic: AggregateTopic;
  suppression: SuppressionReason | null;
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
};

export type SystemicIssueCandidate = {
  scopeId: string;
  domain: HappinessDomainId;
  factorCategory: string | null;
  status: SystemicIssueStatus;
  evidencePeriods: number;
  summary: string;
  privacyPolicyVersion: string;
  patternModelVersion: string;
  publishesChallenge: false;
  publishesGovernance: false;
};

export type AggregateParticipation = {
  profileId: string;
  enabled: boolean;
  enabledAt: string | null;
  disabledAt: string | null;
  policyVersion: string;
  updatedAt: string;
};
