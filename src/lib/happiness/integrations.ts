/**
 * Integration hooks for Study, Contribute, and Opportunities.
 * Happiness state itself is never a reputation or matching-eligibility signal.
 */

export const HAPPINESS_STUDY_PATH = '/study';
export const HAPPINESS_CONTRIBUTE_PATH = '/contribute';
export const HAPPINESS_OPPORTUNITIES_PATH = '/contribute/professional';
export const HAPPINESS_CHALLENGES_PATH = '/contribute/challenges';
export const HAPPINESS_GOVERNANCE_SOLUTIONS_PATH = '/governance/solutions';

export const HAPPINESS_JOBS_PATH = '/market?section=jobs';
export const HAPPINESS_MESSAGING_PATH = '/messaging';

export type HappinessIntegrationTarget = {
  kind:
    | 'study'
    | 'contribute'
    | 'opportunities'
    | 'challenges'
    | 'governance_solutions'
    | 'work_fulfillment'
    | 'jobs'
    | 'messaging';
  path: string;
};

export function integrationTargetForRecommendationPath(path: string | null): HappinessIntegrationTarget | null {
  if (!path) return null;
  if (path.startsWith('/study')) return { kind: 'study', path: HAPPINESS_STUDY_PATH };
  if (path.startsWith('/contribute/professional')) return { kind: 'opportunities', path: HAPPINESS_OPPORTUNITIES_PATH };
  if (path.startsWith('/contribute/challenges')) return { kind: 'challenges', path: HAPPINESS_CHALLENGES_PATH };
  if (path.startsWith('/contribute')) return { kind: 'contribute', path: HAPPINESS_CONTRIBUTE_PATH };
  if (path.startsWith('/governance/solutions')) {
    return { kind: 'governance_solutions', path: HAPPINESS_GOVERNANCE_SOLUTIONS_PATH };
  }
  if (path.startsWith('/happiness/work')) return { kind: 'work_fulfillment', path: '/happiness/work' };
  if (path.startsWith('/market')) return { kind: 'jobs', path: path.includes('section=jobs') ? path : HAPPINESS_JOBS_PATH };
  if (path.startsWith('/messaging')) return { kind: 'messaging', path: HAPPINESS_MESSAGING_PATH };
  return null;
}

/**
 * Work Fulfillment may inform optional opportunity matching only through
 * approved shareable preferences. Publishers must never receive private wellbeing fields.
 */
export function wellbeingFieldsForbiddenInOpportunityMatching(): readonly string[] {
  return [
    'overallLevel',
    'domainLevels',
    'checkIns',
    'causes',
    'notes',
    'emotional_wellbeing',
    'happinessInternal',
    'work_joy_entries',
    'diagnosis',
    'dissatisfaction',
    'private_notes',
    'fulfillment_plans',
    'plan_factors',
    'intervention_history',
    'follow_up_outcomes',
  ];
}
