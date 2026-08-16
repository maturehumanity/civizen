import { isCauseTag } from '@/lib/happiness/causes';
import type { ActionOutcomeRating, HappinessCause, HappinessCauseGroup, HappinessCheckIn, HappinessDomainId } from '@/lib/happiness/types';
import { FULFILLMENT_INTERVENTIONS } from './library';
import {
  FULFILLMENT_RECOMMENDATION_MODEL,
  MAX_PLAN_RECOMMENDATIONS,
  type FactorCertaintyType,
  type FulfillmentIntervention,
  type RankedRecommendation,
  type RecommendationFeedbackKind,
  type RecommendationWhy,
} from './types';

export { FULFILLMENT_RECOMMENDATION_MODEL, MAX_PLAN_RECOMMENDATIONS };

const KIND_FOR_TYPE: Record<FulfillmentIntervention['type'], RankedRecommendation['kind']> = {
  self_directed: 'personal_action',
  reflection: 'personal_action',
  routine_environment: 'habit_or_routine',
  learning: 'learning_opportunity',
  contribution: 'contribution_opportunity',
  social_community: 'social_community',
  expert_support: 'health_resource',
  financial_security: 'personal_action',
  work_fulfillment: 'work_redesign',
  employment_jobs: 'work_exploration',
  community_system: 'community_challenge',
};

export type HelpfulnessMemory = {
  interventionKey: string;
  helped: ActionOutcomeRating;
};

export type RecommendPlanInput = {
  domain: HappinessDomainId;
  causeGroup?: HappinessCauseGroup | null;
  factorTags?: string[];
  factorCertainty?: Partial<Record<string, FactorCertaintyType>>;
  suppressedKeys?: string[];
  feedback?: { interventionKey: string; feedback: RecommendationFeedbackKind }[];
  previouslyHelped?: HelpfulnessMemory[];
  previouslyUnhelpful?: string[];
  seekingEmployment?: boolean;
  includeSavedLater?: boolean;
};

function suppressedSet(input: RecommendPlanInput): Set<string> {
  const blocked = new Set(input.suppressedKeys ?? []);
  for (const row of input.feedback ?? []) {
    if (row.feedback === 'not_relevant') blocked.add(row.interventionKey);
    if (row.feedback === 'saved_later' && !input.includeSavedLater) blocked.add(row.interventionKey);
  }
  return blocked;
}

function helpedBefore(input: RecommendPlanInput, key: string): HelpfulnessMemory | undefined {
  return (input.previouslyHelped ?? []).find(
    (row) => row.interventionKey === key && (row.helped === 'a_lot' || row.helped === 'somewhat'),
  );
}

function scoreIntervention(item: FulfillmentIntervention, input: RecommendPlanInput): { score: number; why: RecommendationWhy[] } {
  const tags = new Set(input.factorTags ?? []);
  const certainty = input.factorCertainty ?? {};
  const why: RecommendationWhy[] = [{ kind: 'domain_selected', detailKey: input.domain }];
  let score = 1;
  if (item.causeGroups && input.causeGroup && item.causeGroups.includes(input.causeGroup)) score += 2;
  if (item.factorTags?.some((tag) => tags.has(tag))) {
    score += 2;
    const matched = item.factorTags.find((tag) => tags.has(tag));
    const level = matched ? certainty[matched] : undefined;
    if (level === 'member_confirmed') why.push({ kind: 'member_confirmed', detail: matched });
    else if (level === 'observed_pattern') why.push({ kind: 'observed_pattern', detail: matched });
    else if (level === 'hypothesis') why.push({ kind: 'hypothesis', detail: matched });
  }
  if (item.effort === 'low') {
    score += 1;
    why.push({ kind: 'smallest_step' });
  }
  if (item.type === 'expert_support' || item.type === 'community_system') {
    score += 1;
    why.push({ kind: item.type === 'community_system' ? 'system_constraint' : 'human_support' });
  }
  if (item.type === 'work_fulfillment') {
    score += 4;
    why.push({ kind: 'work_delegate' });
  }
  if (item.type === 'employment_jobs') {
    why.push({ kind: 'jobs_not_contribute' });
    score += input.seekingEmployment ? 3 : 0;
  }
  const prior = helpedBefore(input, item.key);
  if (prior) {
    score += prior.helped === 'a_lot' ? 4 : 2;
    why.push({ kind: 'previously_helped', detail: item.key });
  }
  if (input.previouslyUnhelpful?.includes(item.key) && !prior) score -= 3;
  if ((input.feedback ?? []).some((row) => row.interventionKey === item.key && row.feedback === 'tried_before') && !prior) {
    score -= 1;
  }
  return { score, why };
}

export function recommendForPlan(input: RecommendPlanInput): RankedRecommendation[] {
  const blocked = suppressedSet(input);
  const scored = FULFILLMENT_INTERVENTIONS.filter((item) => item.domains.includes(input.domain) && !blocked.has(item.key)).map(
    (item) => {
      const { score, why } = scoreIntervention(item, input);
      return { item, score, why };
    },
  );
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_PLAN_RECOMMENDATIONS).map(({ item, why }) => ({
    key: item.key,
    intervention: item,
    why,
    kind: KIND_FOR_TYPE[item.type],
  }));
}

export function recommendationForKey(key: string, domain: HappinessDomainId): RankedRecommendation | null {
  const item = FULFILLMENT_INTERVENTIONS.find((row) => row.key === key && row.domains.includes(domain));
  if (!item) return null;
  return { key: item.key, intervention: item, why: [{ kind: 'domain_selected', detailKey: domain }], kind: KIND_FOR_TYPE[item.type] };
}

export function observedFactorTagsFromCheckIns(
  domain: HappinessDomainId,
  checkIns: Pick<HappinessCheckIn, 'affectingMost' | 'areas'>[],
  causes: Pick<HappinessCause, 'sourceKind' | 'domain' | 'category' | 'polarity' | 'group'>[] = [],
): string[] {
  const map: Partial<Record<HappinessDomainId, string>> = {
    time_life_balance: 'time',
    work_fulfillment: 'work',
    health_vitality: 'health',
    relationships_belonging: 'relationships',
    security_stability: 'money_security',
    meaning_purpose: 'purpose',
    environment_community: 'environment',
  };
  const affecting = map[domain];
  const group = causeGroupForDomain(domain);
  const tagCounts = new Map<string, number>();
  for (const cause of causes) {
    if (cause.sourceKind !== 'checkin' || cause.polarity === 'support') continue;
    if (cause.domain !== domain && !(group && cause.group === group)) continue;
    if (!group || !isCauseTag(group, cause.category)) continue;
    tagCounts.set(cause.category, (tagCounts.get(cause.category) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()].filter(([, hits]) => hits >= 2).map(([tag]) => tag);
  if (tags.length) return tags;
  if (!affecting) return [];
  const hits = checkIns.filter((row) => {
    if (row.areas?.some((area) => area.category === affecting && area.polarity !== 'support')) return true;
    return row.affectingMost === affecting;
  }).length;
  return hits >= 2 ? [affecting] : [];
}

export function shouldSuppressRecommendation(
  feedback: { interventionKey: string; feedback: RecommendationFeedbackKind }[],
  key: string,
): boolean {
  return feedback.some((row) => row.interventionKey === key && row.feedback === 'not_relevant');
}

export function causeGroupForDomain(domain: HappinessDomainId): HappinessCauseGroup | null {
  const map: Partial<Record<HappinessDomainId, HappinessCauseGroup>> = {
    time_life_balance: 'time',
    work_fulfillment: 'work',
    health_vitality: 'health',
    relationships_belonging: 'relationships',
    security_stability: 'security',
    meaning_purpose: 'purpose',
  };
  return map[domain] ?? null;
}

export function hypothesisKeysFor(domain: HappinessDomainId, cause: string | null): string[] {
  if (cause === 'commute' || (domain === 'time_life_balance' && cause === 'overwork')) {
    return ['limited_transport_or_local_conditions'];
  }
  if (domain === 'environment_community') return ['local_conditions_outside_personal_control'];
  if (domain === 'security_stability' && (cause === 'housing' || cause === 'money')) return ['local_housing_or_income_conditions'];
  return [];
}

export function helpfulnessFromHistory(
  actions: { interventionKey?: string | null; id: string }[],
  outcomes: { actionId: string; helped: ActionOutcomeRating }[],
): { previouslyHelped: HelpfulnessMemory[]; previouslyUnhelpful: string[] } {
  const previouslyHelped: HelpfulnessMemory[] = [];
  const previouslyUnhelpful: string[] = [];
  for (const action of actions) {
    const key = action.interventionKey;
    if (!key) continue;
    const helped = outcomes.find((row) => row.actionId === action.id)?.helped;
    if (helped === 'a_lot' || helped === 'somewhat') previouslyHelped.push({ interventionKey: key, helped });
    if (helped === 'not_at_all') previouslyUnhelpful.push(key);
  }
  return { previouslyHelped, previouslyUnhelpful };
}
