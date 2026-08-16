import type { HappinessDomainId } from '@/lib/happiness/types';
import type { WellbeingAggregateResult } from '@/lib/happiness/aggregate/types';

export const HUMAN_OUTCOME_EVIDENCE_VERSION = 'human-outcome-evidence-v1';
export const HUMAN_OUTCOME_COMPARE_VERSION = 'human-outcome-compare-v1';

export const OUTCOME_REVIEW_STATUSES = [
  'awaiting_evidence',
  'early_signal',
  'improvement_observed',
  'no_clear_change',
  'concern_persists',
  'mixed_result',
  'insufficient_evidence',
  'needs_further_review',
] as const;
export type OutcomeReviewStatus = (typeof OUTCOME_REVIEW_STATUSES)[number];

export const EVIDENCE_STRENGTH_LEVELS = [
  'observation',
  'early_association',
  'repeated_association',
  'supporting_helpfulness',
  'evaluated_evidence',
] as const;
export type EvidenceStrengthLevel = (typeof EVIDENCE_STRENGTH_LEVELS)[number];

export const COMPARISON_DIRECTIONS = [
  'improving',
  'stable',
  'worsening',
  'mixed',
  'suppressed',
  'not_comparable',
  'no_baseline',
] as const;
export type ComparisonDirection = (typeof COMPARISON_DIRECTIONS)[number];

export const EVIDENCE_ROLES = ['baseline', 'followup', 'helpfulness'] as const;
export type EvidenceRole = (typeof EVIDENCE_ROLES)[number];

export const FACTOR_KINDS = [
  'overlapping_intervention',
  'external_event',
  'seasonal',
  'composition_change',
  'other_policy',
  'insufficient_evidence',
  'other',
] as const;
export type OutcomeFactorKind = (typeof FACTOR_KINDS)[number];

export const CLOSED_REASONS = [
  'sufficient_learning',
  'no_further_monitoring',
  'insufficient_evidence',
  'intervention_ended',
  'superseded',
] as const;
export type OutcomeClosedReason = (typeof CLOSED_REASONS)[number];

export type SnapshotRecord = {
  id: string;
  periodStart: string;
  timeBucket: string;
  topic: string;
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
  result: WellbeingAggregateResult;
};

export type HumanOutcomeReview = {
  id: string;
  scopeId: string;
  candidateId: string | null;
  challengeId: string | null;
  projectId: string | null;
  governanceSolutionId: string | null;
  solutionRecordId: string | null;
  createdBy: string;
  targetDomain: HappinessDomainId;
  targetFactor: string | null;
  objective: string;
  interventionTitle: string;
  operationalOutcome: string | null;
  interpretation: string | null;
  uncertaintyNote: string | null;
  status: OutcomeReviewStatus;
  evidenceStrength: EvidenceStrengthLevel;
  evidenceModelVersion: string;
  comparisonModelVersion: string;
  interventionStartedAt: string | null;
  nextReviewWindow: 'month' | 'quarter' | 'rolling_6_weeks' | null;
  overlappingInterventions: boolean;
  compositionCaveat: boolean;
  evaluationPlanned: boolean;
  researchReference: string | null;
  publishedPublic: boolean;
  closedAt: string | null;
  closedReason: OutcomeClosedReason | null;
  createdAt: string;
  updatedAt: string;
};

export type HumanOutcomeEvidenceRow = {
  id: string;
  reviewId: string;
  snapshotId: string;
  role: EvidenceRole;
  periodOrder: number;
};

export type HumanOutcomeFactor = {
  id: string;
  reviewId: string;
  kind: OutcomeFactorKind;
  note: string;
};

export type HumanOutcomeEvent = {
  id: string;
  reviewId: string;
  eventType: 'launched' | 'milestone' | 'checkpoint' | 'adjusted' | 'closed';
  occurredAt: string;
  note: string | null;
};

export type PublicOutcomeLesson = {
  id: string;
  reviewId: string;
  solutionRecordId: string | null;
  domain: HappinessDomainId;
  factorCategory: string | null;
  interventionCategory: string | null;
  title: string;
  problem: string;
  intervention: string;
  operationalOutcome: string;
  humanOutcome: string;
  evidenceStrength: EvidenceStrengthLevel;
  status: OutcomeReviewStatus;
  limitations: string;
  replicationNotes: string | null;
};

export type ComparisonWarning =
  | 'no_qualifying_baseline'
  | 'followup_suppressed'
  | 'privacy_policy_mismatch'
  | 'aggregation_model_mismatch'
  | 'scope_or_domain_mismatch'
  | 'time_bucket_mismatch'
  | 'overlapping_interventions'
  | 'composition_changed'
  | 'helpfulness_is_category_not_project';

export type HumanOutcomeComparison = {
  version: typeof HUMAN_OUTCOME_COMPARE_VERSION;
  direction: ComparisonDirection;
  status: OutcomeReviewStatus;
  evidenceStrength: EvidenceStrengthLevel;
  warnings: ComparisonWarning[];
  baselineSummary: string | null;
  followupSummaries: string[];
  helpfulnessSummary: string | null;
  causalityEstablished: false;
};
