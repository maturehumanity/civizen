/**
 * Work Fulfillment & Occupational Fit — distinct subunit types.
 * Happiness-domain levels stay on the parent model. Work Joy states are observations.
 */

import type { HappinessLevel } from '@/lib/happiness/types';

export const WORK_FULFILLMENT_PHASE = 2 as const;
export const WORK_ASSESSMENT_MODEL = 'work-assessment-v1';
export const WORK_JOY_MODEL = 'work-joy-v1';

export const WORK_JOY_FEELINGS = [
  'draining',
  'mostly_unpleasant',
  'neutral',
  'enjoyable',
  'energizing',
] as const;

export type WorkJoyFeeling = (typeof WORK_JOY_FEELINGS)[number];

export const WORK_VALUES = [
  'creativity',
  'service',
  'learning',
  'independence',
  'stability',
  'income',
  'impact',
  'mastery',
  'leadership',
  'exploration',
  'recognition',
] as const;

export type WorkValueId = (typeof WORK_VALUES)[number];

export const WORK_TYPES = [
  'employed',
  'self_employed',
  'founder',
  'contractor',
  'student_trainee',
  'volunteer',
  'caregiver',
  'between_roles',
  'other',
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export const WORK_CONTEXT_STATUSES = ['current', 'paused', 'ended'] as const;
export type WorkContextStatus = (typeof WORK_CONTEXT_STATUSES)[number];

export const WORK_LOCATION_MODES = ['remote', 'hybrid', 'onsite', 'mixed', 'not_specified'] as const;
export type WorkLocationMode = (typeof WORK_LOCATION_MODES)[number];

export const WORK_ACTIVITY_TAGS = [
  'working_alone',
  'collaborating',
  'leading',
  'teaching',
  'creating',
  'analyzing',
  'organizing',
  'helping',
  'researching',
  'building',
  'solving_problems',
  'routine_administration',
  'customer_public',
  'physical_work',
  'other',
] as const;

export type WorkActivityTag = (typeof WORK_ACTIVITY_TAGS)[number];

export const WORK_ASSESSMENT_DIMENSIONS = [
  'task_enjoyment',
  'strength_utilization',
  'meaning_purpose',
  'autonomy',
  'environment_social',
  'workload_pace',
  'schedule_lifestyle',
  'growth_learning',
  'recognition_fairness',
  'security_compensation',
] as const;

export type WorkAssessmentDimension = (typeof WORK_ASSESSMENT_DIMENSIONS)[number];

export const WORK_HYPOTHESIS_IDS = [
  'occupation_mismatch',
  'task_mix_mismatch',
  'underused_strengths',
  'work_environment_mismatch',
  'team_management',
  'insufficient_autonomy',
  'unsustainable_workload',
  'schedule_lifestyle_mismatch',
  'compensation_security',
  'lack_of_growth',
  'lack_of_recognition',
  'lack_of_purpose',
  'temporary_situational_stress',
  'insufficient_evidence',
] as const;

export type WorkHypothesisId = (typeof WORK_HYPOTHESIS_IDS)[number];

export const WORK_FIT_ALIGNMENTS = [
  'strong_alignment',
  'some_alignment',
  'worth_exploring',
  'limited_alignment',
] as const;

export type WorkFitAlignment = (typeof WORK_FIT_ALIGNMENTS)[number];

export const WORK_RECOMMENDATION_FEEDBACK = ['dismissed', 'not_relevant', 'saved'] as const;
export type WorkRecommendationFeedbackKind = (typeof WORK_RECOMMENDATION_FEEDBACK)[number];

export type WorkEnvironmentPreferences = {
  individualVsTeam?: 'individual' | 'mixed' | 'team';
  quietVsActive?: 'quiet' | 'mixed' | 'active';
  remoteVsOnsite?: 'remote' | 'hybrid' | 'onsite';
  structuredVsFlexible?: 'structured' | 'mixed' | 'flexible';
  predictableVsChanging?: 'predictable' | 'mixed' | 'changing';
  indoorVsOutdoor?: 'indoor' | 'mixed' | 'outdoor';
  publicFacingVsIndependent?: 'public_facing' | 'mixed' | 'independent';
  collaborationVsFocus?: 'high_collaboration' | 'mixed' | 'deep_focus';
};

export type WorkAutonomyPreferences = {
  methods?: 'low' | 'moderate' | 'high';
  schedule?: 'low' | 'moderate' | 'high';
  taskSelection?: 'low' | 'moderate' | 'high';
  decisionMaking?: 'low' | 'moderate' | 'high';
};

export type WorkLifestyleFit = {
  scheduleNote?: string;
  commuteNote?: string;
  locationNote?: string;
  physicalDemandsNote?: string;
  caregivingNote?: string;
  incomeSecurityNote?: string;
};

export type WorkPurposeFit = {
  feelsMeaningful?: boolean | null;
  abilitiesUsed?: boolean | null;
  seesValueInResult?: boolean | null;
  note?: string;
};

export type WorkEnjoymentProfile = {
  enjoyedActivities: string[];
  enjoyedTasks: string[];
  dislikedActivities: string[];
  drainingTasks: string[];
};

export type WorkFulfillmentProfile = {
  profileId: string;
  currentRoleNote: string | null;
  enjoyment: WorkEnjoymentProfile;
  values: WorkValueId[];
  environment: WorkEnvironmentPreferences;
  autonomy: WorkAutonomyPreferences;
  lifestyle: WorkLifestyleFit;
  purposeFit: WorkPurposeFit;
  createdAt: string;
  updatedAt: string;
};

export type WorkJoyEntry = {
  id: string;
  profileId: string;
  feeling: WorkJoyFeeling;
  activity: string | null;
  taskTag: string | null;
  project: string | null;
  context: string | null;
  note: string | null;
  workContextId: string | null;
  activityTags: string[];
  modelVersion: string;
  createdAt: string;
};

export type WorkContext = {
  id: string;
  profileId: string;
  roleTitle: string;
  organizationOrContext: string | null;
  workType: WorkType;
  startDate: string | null;
  hoursPattern: string | null;
  locationMode: WorkLocationMode | null;
  isPrimary: boolean;
  description: string | null;
  status: WorkContextStatus;
  createdAt: string;
  updatedAt: string;
};

export type WorkAssessment = {
  id: string;
  profileId: string;
  workContextId: string | null;
  modelVersion: string;
  dimensions: Partial<Record<WorkAssessmentDimension, HappinessLevel>>;
  createdAt: string;
};

export type WorkShareablePreferences = {
  profileId: string;
  approved: boolean;
  activitiesSought: string[];
  roleTypesSought: string[];
  environment: WorkEnvironmentPreferences;
  locationMode: WorkLocationMode | null;
  scheduleNote: string | null;
  updatedAt: string;
};

export type WorkExploration = {
  id: string;
  profileId: string;
  title: string;
  templateId: string | null;
  whyMayFit: string[];
  thingsToExplore: string[];
  alignment: WorkFitAlignment;
  occupationNote: string | null;
  createdAt: string;
};

export type WorkTransitionPath = {
  id: string;
  profileId: string;
  target: string;
  why: string | null;
  alreadyHave: string | null;
  need: string | null;
  testPath: string | null;
  studyPath: string | null;
  opportunityPath: string | null;
  nextStep: string | null;
  status: 'exploring' | 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type WorkFollowUp = {
  id: string;
  profileId: string;
  transitionPathId: string | null;
  actionId: string | null;
  changeKind: string;
  helped: 'not_at_all' | 'a_little' | 'somewhat' | 'a_lot' | null;
  workJoyFeeling: WorkJoyFeeling | null;
  note: string | null;
  createdAt: string;
};

export const WORK_INTERVENTION_STATUSES = ['planned', 'in_progress', 'completed', 'dismissed'] as const;
export type WorkInterventionStatus = (typeof WORK_INTERVENTION_STATUSES)[number];

export type WorkIntervention = {
  id: string;
  profileId: string;
  actionId: string | null;
  ladderStep: string;
  area: string | null;
  desiredChange: string | null;
  status: WorkInterventionStatus;
  createdAt: string;
};

export const emptyWorkEnjoyment = (): WorkEnjoymentProfile => ({
  enjoyedActivities: [],
  enjoyedTasks: [],
  dislikedActivities: [],
  drainingTasks: [],
});

export const emptyWorkFulfillmentDraft = (profileId: string): Omit<WorkFulfillmentProfile, 'createdAt' | 'updatedAt'> => ({
  profileId,
  currentRoleNote: null,
  enjoyment: emptyWorkEnjoyment(),
  values: [],
  environment: {},
  autonomy: {},
  lifestyle: {},
  purposeFit: {},
});

export const emptyShareablePreferences = (profileId: string): WorkShareablePreferences => ({
  profileId,
  approved: false,
  activitiesSought: [],
  roleTypesSought: [],
  environment: {},
  locationMode: null,
  scheduleNote: null,
  updatedAt: new Date().toISOString(),
});
