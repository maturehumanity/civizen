/**
 * Happiness & Human Fulfillment — public types.
 *
 * Internal numeric values exist only for aggregation and must never be shown
 * as a happiness score. Work Fulfillment stays a distinct subunit.
 */

/** Working public model id. Replace by bumping this constant; do not rewrite historic snapshot rows. */
export const HAPPINESS_MODEL_VERSION = 'happiness-level-v1';

export const HAPPINESS_LEVELS = [
  'struggling',
  'unsettled',
  'balanced',
  'flourishing',
  'thriving',
] as const;

export type HappinessLevel = (typeof HAPPINESS_LEVELS)[number];

export const HAPPINESS_TRENDS = ['improving', 'stable', 'declining', 'unknown'] as const;
export type HappinessTrend = (typeof HAPPINESS_TRENDS)[number];

export const HAPPINESS_CONFIDENCE_LEVELS = ['insufficient', 'low', 'moderate', 'high'] as const;
export type HappinessConfidence = (typeof HAPPINESS_CONFIDENCE_LEVELS)[number];

export const HAPPINESS_DOMAINS = [
  'life_satisfaction',
  'emotional_wellbeing',
  'meaning_purpose',
  'relationships_belonging',
  'health_vitality',
  'autonomy_freedom',
  'security_stability',
  'time_life_balance',
  'environment_community',
  'work_fulfillment',
] as const;

export type HappinessDomainId = (typeof HAPPINESS_DOMAINS)[number];

export const CHECKIN_FEELINGS = [
  'very_difficult',
  'difficult',
  'okay',
  'good',
  'very_good',
] as const;

export type CheckInFeeling = (typeof CHECKIN_FEELINGS)[number];

export const AFFECTING_CATEGORIES = [
  'work',
  'health',
  'relationships',
  'money_security',
  'family',
  'time',
  'environment',
  'purpose',
  'something_else',
] as const;

export type AffectingCategory = (typeof AFFECTING_CATEGORIES)[number];

export const CHECKIN_AREA_POLARITIES = ['problem', 'support', 'both'] as const;
export type CheckInAreaPolarity = (typeof CHECKIN_AREA_POLARITIES)[number];

export const CAUSE_POLARITIES = ['problem', 'support'] as const;
export type CausePolarity = (typeof CAUSE_POLARITIES)[number];

export type CheckInArea = {
  category: AffectingCategory;
  polarity: CheckInAreaPolarity;
};

export const HAPPINESS_CAUSE_GROUPS = [
  'work',
  'health',
  'relationships',
  'security',
  'time',
  'purpose',
] as const;

export type HappinessCauseGroup = (typeof HAPPINESS_CAUSE_GROUPS)[number];

export const RECOMMENDATION_KINDS = [
  'personal_action',
  'habit_or_routine',
  'learning_opportunity',
  'contribution_opportunity',
  'social_community',
  'health_resource',
  'work_redesign',
  'work_exploration',
  'organizational_change',
  'community_challenge',
  'governance_system',
] as const;

export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const ACTION_OUTCOME_RATINGS = ['not_at_all', 'a_little', 'somewhat', 'a_lot'] as const;
export type ActionOutcomeRating = (typeof ACTION_OUTCOME_RATINGS)[number];

export const FOLLOW_UP_TIMINGS = ['three_days', 'one_week', 'two_weeks'] as const;
export type FollowUpTiming = (typeof FOLLOW_UP_TIMINGS)[number];

export type HappinessCheckIn = {
  id: string;
  profileId: string;
  feeling: CheckInFeeling;
  affectingMost: AffectingCategory | null;
  areas: CheckInArea[];
  note: string | null;
  createdAt: string;
};

export type HappinessWeeklyPulse = {
  id: string;
  profileId: string;
  weekStart: string;
  domainAnswers: Partial<Record<HappinessDomainId, HappinessLevel>>;
  createdAt: string;
};

export type HappinessMonthlyReview = {
  id: string;
  profileId: string;
  monthStart: string;
  domainAnswers: Partial<Record<HappinessDomainId, HappinessLevel>>;
  wantsHelp: boolean;
  helpAreas: HappinessDomainId[];
  createdAt: string;
};

export type HappinessCause = {
  id: string;
  profileId: string;
  sourceKind: 'checkin' | 'pulse' | 'review' | 'domain' | 'improve';
  sourceId: string | null;
  domain: HappinessDomainId | null;
  group: HappinessCauseGroup;
  category: string;
  polarity: CausePolarity;
  confirmed: boolean;
  isAiSuggestion: boolean;
  note: string | null;
  createdAt: string;
};

export const HAPPINESS_ACTION_STATUSES = ['planned', 'in_progress', 'completed', 'dismissed'] as const;
export type HappinessActionStatus = (typeof HAPPINESS_ACTION_STATUSES)[number];

export type HappinessAction = {
  id: string;
  profileId: string;
  selectionId: string | null;
  planId: string | null;
  domain: HappinessDomainId;
  kind: RecommendationKind;
  title: string;
  why: string;
  relatedPath: string | null;
  dismissed: boolean;
  notRelevant: boolean;
  followUpAt: string | null;
  status: HappinessActionStatus;
  interventionKey: string | null;
  createdAt: string;
};

export type HappinessActionOutcome = {
  id: string;
  actionId: string;
  helped: ActionOutcomeRating;
  comment: string | null;
  createdAt: string;
};

export type HappinessImprovementSelection = {
  id: string;
  profileId: string;
  domain: HappinessDomainId;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
};

export type HappinessPrivacySettings = {
  profileId: string;
  checkinsEnabled: boolean;
  recommendationsEnabled: boolean;
  optionalSharingEnabled: boolean;
  updatedAt: string;
};

export type HappinessDomainState = {
  domain: HappinessDomainId;
  level: HappinessLevel;
};

export type HappinessTrendDetail = {
  direction: HappinessTrend;
  weeks?: number;
  previousLevel?: HappinessLevel;
  domainNote?: HappinessDomainId;
};

/**
 * Member-facing view. No numeric happiness score fields.
 */
export type HappinessPublicView = {
  modelVersion: typeof HAPPINESS_MODEL_VERSION;
  overallLevel: HappinessLevel | null;
  trend: HappinessTrendDetail;
  confidence: HappinessConfidence;
  strongestDomains: HappinessDomainId[];
  attentionDomains: HappinessDomainId[];
  domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>>;
  latestCheckIn: HappinessCheckIn | null;
  pendingFollowUp: HappinessAction | null;
  observationCount: number;
  computedAt: string;
};

export type HappinessRecommendation = {
  id: string;
  domain: HappinessDomainId;
  kind: RecommendationKind;
  titleKey: string;
  whyKey: string;
  relatedPath: string | null;
};

export type AssessmentInstrument = {
  id: string;
  slug: string;
  name: string;
  version: string;
  publisher: string | null;
  sourceUrl: string | null;
  license: string | null;
  language: string;
  allowedUse: string;
  questions: AssessmentQuestion[];
  scoringLogic: Record<string, unknown>;
  interpretationRules: Record<string, unknown>;
  references: unknown[] | null;
};

export type AssessmentQuestion = {
  id: string;
  prompt: string;
  responseType: 'five_level' | 'free_text' | 'single_choice';
  domain?: HappinessDomainId;
  choices?: string[];
};

/** Stored internally; never rendered as a public score. */
export type HappinessInternalSnapshot = {
  overallInternal: number | null;
  domainInternal: Partial<Record<HappinessDomainId, number>>;
};
