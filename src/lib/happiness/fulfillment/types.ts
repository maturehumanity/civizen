import type { ActionOutcomeRating, HappinessCauseGroup, HappinessDomainId, RecommendationKind } from '@/lib/happiness/types';

export const FULFILLMENT_LIBRARY_VERSION = 'fulfillment-library-v1';
export const FULFILLMENT_RECOMMENDATION_MODEL = 'fulfillment-recommendation-v1';
export const MAX_PLAN_RECOMMENDATIONS = 3;
export const GENTLE_ACTIVE_PLAN_LIMIT = 3;

export const FULFILLMENT_PLAN_STATUSES = ['exploring', 'active', 'paused', 'completed', 'stopped'] as const;
export type FulfillmentPlanStatus = (typeof FULFILLMENT_PLAN_STATUSES)[number];

export const FULFILLMENT_ACTION_STATUSES = ['planned', 'in_progress', 'completed', 'dismissed'] as const;
export type FulfillmentActionStatus = (typeof FULFILLMENT_ACTION_STATUSES)[number];

export const FACTOR_CERTAINTY_TYPES = ['member_confirmed', 'observed_pattern', 'hypothesis'] as const;
export type FactorCertaintyType = (typeof FACTOR_CERTAINTY_TYPES)[number];

export const FACTOR_SOURCE_TYPES = ['member', 'checkin_pattern', 'recommendation', 'civi'] as const;
export type FactorSourceType = (typeof FACTOR_SOURCE_TYPES)[number];

export const QUALITATIVE_PLAN_STATES = [
  'exploring',
  'trying',
  'seeing_improvement',
  'needs_another_approach',
  'paused',
  'completed',
  'stopped',
] as const;
export type QualitativePlanState = (typeof QUALITATIVE_PLAN_STATES)[number];

export const RECOMMENDATION_FEEDBACK_KINDS = [
  'shown',
  'accepted',
  'dismissed',
  'not_relevant',
  'tried_before',
  'saved_later',
  'not_now',
] as const;
export type RecommendationFeedbackKind = (typeof RECOMMENDATION_FEEDBACK_KINDS)[number];

export const INTERVENTION_TYPES = [
  'self_directed',
  'reflection',
  'routine_environment',
  'learning',
  'contribution',
  'social_community',
  'expert_support',
  'financial_security',
  'work_fulfillment',
  'employment_jobs',
  'community_system',
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const SUPPORT_TYPES = [
  'friend_family',
  'mentor',
  'peer_community',
  'professional',
  'organization_service',
  'civizen_group',
  'learning_program',
  'health_resource',
  'financial_service',
  'work_fulfillment',
  'market_jobs',
] as const;
export type SupportType = (typeof SUPPORT_TYPES)[number];

export const PLAN_REMINDER_PREFS = ['none', 'weekly', 'chosen_date'] as const;
export type PlanReminderPref = (typeof PLAN_REMINDER_PREFS)[number];

export type WhyKind =
  | 'domain_selected'
  | 'member_confirmed'
  | 'observed_pattern'
  | 'hypothesis'
  | 'previously_helped'
  | 'smallest_step'
  | 'human_support'
  | 'work_delegate'
  | 'jobs_not_contribute'
  | 'system_constraint';

export type RecommendationWhy = {
  kind: WhyKind;
  detailKey?: string;
  detail?: string;
};

export type FulfillmentIntervention = {
  key: string;
  domains: HappinessDomainId[];
  causeGroups?: HappinessCauseGroup[];
  factorTags?: string[];
  type: InterventionType;
  titleKey: string;
  descriptionKey: string;
  effort: 'low' | 'moderate';
  relatedPath: string | null;
  supportType?: SupportType;
  cautionKey?: string;
  version: typeof FULFILLMENT_LIBRARY_VERSION;
};

export type FulfillmentSupportOption = {
  key: string;
  type: SupportType;
  titleKey: string;
  descriptionKey: string;
  path: string | null;
  domains?: HappinessDomainId[];
};

export type RankedRecommendation = {
  key: string;
  intervention: FulfillmentIntervention;
  why: RecommendationWhy[];
  kind: RecommendationKind;
};

export type FulfillmentPlan = {
  id: string;
  profileId: string;
  domainKey: HappinessDomainId;
  title: string;
  concern: string | null;
  desiredOutcome: string | null;
  status: FulfillmentPlanStatus;
  reminderPref: PlanReminderPref;
  followUpAt: string | null;
  workInterventionId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type FulfillmentPlanFactor = {
  id: string;
  planId: string;
  factorKey: string;
  certaintyType: FactorCertaintyType;
  sourceType: FactorSourceType;
  note: string | null;
  createdAt: string;
};

export type FulfillmentPlanSupport = {
  id: string;
  planId: string;
  supportKey: string;
  supportType: SupportType;
  path: string | null;
  note: string | null;
  createdAt: string;
};

export type FulfillmentRecommendationFeedback = {
  id: string;
  planId: string | null;
  interventionKey: string;
  feedback: RecommendationFeedbackKind;
  recommendationModel: string;
  createdAt: string;
};

export type FulfillmentPlanOutcome = {
  id: string;
  planId: string;
  qualitativeState: string;
  summaryNote: string | null;
  helped: ActionOutcomeRating | null;
  createdAt: string;
};

export type FulfillmentPlanBundle = {
  plan: FulfillmentPlan;
  factors: FulfillmentPlanFactor[];
  support: FulfillmentPlanSupport[];
  feedback: FulfillmentRecommendationFeedback[];
  outcomes: FulfillmentPlanOutcome[];
};
