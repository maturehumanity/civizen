import type { HappinessCauseGroup, HappinessDomainId, HappinessRecommendation, RecommendationKind } from './types';

type Template = {
  id: string;
  domains: HappinessDomainId[];
  causes?: string[];
  groups?: HappinessCauseGroup[];
  kind: RecommendationKind;
  titleKey: string;
  whyKey: string;
  relatedPath: string | null;
};

/**
 * Phase 1 suggestions. Small, practical, never an automatic career change.
 * Work dissatisfaction starts with understanding the current role.
 */
const TEMPLATES: Template[] = [
  {
    id: 'work-understand',
    domains: ['work_fulfillment'],
    groups: ['work'],
    kind: 'work_redesign',
    titleKey: 'happiness.recs.workUnderstand.title',
    whyKey: 'happiness.recs.workUnderstand.why',
    relatedPath: '/happiness/work',
  },
  {
    id: 'work-try-contribute',
    domains: ['work_fulfillment', 'meaning_purpose'],
    causes: ['lack_of_purpose', 'feeling_underused', 'lack_of_contribution'],
    kind: 'contribution_opportunity',
    titleKey: 'happiness.recs.workTryContribute.title',
    whyKey: 'happiness.recs.workTryContribute.why',
    relatedPath: '/contribute',
  },
  {
    id: 'work-learn',
    domains: ['work_fulfillment'],
    kind: 'learning_opportunity',
    titleKey: 'happiness.recs.workLearn.title',
    whyKey: 'happiness.recs.workLearn.why',
    relatedPath: '/study',
  },
  {
    id: 'work-explore-trial',
    domains: ['work_fulfillment'],
    causes: ['poor_fit'],
    kind: 'work_exploration',
    titleKey: 'happiness.recs.workExploreTrial.title',
    whyKey: 'happiness.recs.workExploreTrial.why',
    relatedPath: '/contribute/professional',
  },
  {
    id: 'health-rest',
    domains: ['health_vitality'],
    causes: ['sleep', 'energy', 'insufficient_rest'],
    kind: 'habit_or_routine',
    titleKey: 'happiness.recs.healthRest.title',
    whyKey: 'happiness.recs.healthRest.why',
    relatedPath: null,
  },
  {
    id: 'time-one-boundary',
    domains: ['time_life_balance'],
    groups: ['time'],
    kind: 'personal_action',
    titleKey: 'happiness.recs.timeBoundary.title',
    whyKey: 'happiness.recs.timeBoundary.why',
    relatedPath: null,
  },
  {
    id: 'relationships-reach',
    domains: ['relationships_belonging'],
    groups: ['relationships'],
    kind: 'social_community',
    titleKey: 'happiness.recs.relationshipsReach.title',
    whyKey: 'happiness.recs.relationshipsReach.why',
    relatedPath: '/contribute',
  },
  {
    id: 'security-next-step',
    domains: ['security_stability'],
    groups: ['security'],
    kind: 'personal_action',
    titleKey: 'happiness.recs.securityNext.title',
    whyKey: 'happiness.recs.securityNext.why',
    relatedPath: '/contribute/professional',
  },
  {
    id: 'purpose-contribute',
    domains: ['meaning_purpose'],
    groups: ['purpose'],
    kind: 'contribution_opportunity',
    titleKey: 'happiness.recs.purposeContribute.title',
    whyKey: 'happiness.recs.purposeContribute.why',
    relatedPath: '/contribute',
  },
  {
    id: 'autonomy-one-choice',
    domains: ['autonomy_freedom'],
    kind: 'personal_action',
    titleKey: 'happiness.recs.autonomyChoice.title',
    whyKey: 'happiness.recs.autonomyChoice.why',
    relatedPath: '/happiness/work',
  },
  {
    id: 'environment-walk',
    domains: ['environment_community'],
    kind: 'habit_or_routine',
    titleKey: 'happiness.recs.environmentWalk.title',
    whyKey: 'happiness.recs.environmentWalk.why',
    relatedPath: '/contribute/challenges',
  },
  {
    id: 'life-review-one-area',
    domains: ['life_satisfaction', 'emotional_wellbeing'],
    kind: 'personal_action',
    titleKey: 'happiness.recs.lifeOneArea.title',
    whyKey: 'happiness.recs.lifeOneArea.why',
    relatedPath: null,
  },
];

const MAX_SUGGESTIONS = 3;

export function recommendForArea(options: {
  domain: HappinessDomainId;
  causeTags?: string[];
  causeGroup?: HappinessCauseGroup | null;
}): HappinessRecommendation[] {
  const tags = new Set(options.causeTags ?? []);
  const scored = TEMPLATES.filter((template) => template.domains.includes(options.domain)).map((template) => {
    let score = 1;
    if (template.causes?.some((cause) => tags.has(cause))) score += 2;
    if (options.causeGroup && template.groups?.includes(options.causeGroup)) score += 1;
    return { template, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_SUGGESTIONS).map(({ template }) => ({
    id: template.id,
    domain: options.domain,
    kind: template.kind,
    titleKey: template.titleKey,
    whyKey: template.whyKey,
    relatedPath: template.relatedPath,
  }));
}

export function followUpAtFromTiming(timing: 'three_days' | 'one_week' | 'two_weeks', from = new Date()): string {
  const days = timing === 'three_days' ? 3 : timing === 'one_week' ? 7 : 14;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}
