import type { WorkInterventionStepId } from './ladder';
import type { WorkHypothesis } from './diagnosis';
import { suggestedLadderStep } from './diagnosis';

export type WorkSuggestion = {
  id: string;
  ladderStep: WorkInterventionStepId;
  titleKey: string;
  whyKey: string;
  area: string;
  relatedPath: string | null;
};

const IMPROVE_FIRST: WorkSuggestion[] = [
  {
    id: 'increase-fulfilling-time',
    ladderStep: 'redesign_tasks',
    titleKey: 'happiness.work.recs.increaseFulfilling.title',
    whyKey: 'happiness.work.recs.increaseFulfilling.why',
    area: 'task_mix',
    relatedPath: null,
  },
  {
    id: 'reduce-draining-tasks',
    ladderStep: 'redesign_tasks',
    titleKey: 'happiness.work.recs.reduceDraining.title',
    whyKey: 'happiness.work.recs.reduceDraining.why',
    area: 'task_mix',
    relatedPath: null,
  },
  {
    id: 'seek-autonomy',
    ladderStep: 'improve_current_role',
    titleKey: 'happiness.work.recs.seekAutonomy.title',
    whyKey: 'happiness.work.recs.seekAutonomy.why',
    area: 'autonomy',
    relatedPath: null,
  },
  {
    id: 'adjust-schedule',
    ladderStep: 'adjust_workload_schedule',
    titleKey: 'happiness.work.recs.adjustSchedule.title',
    whyKey: 'happiness.work.recs.adjustSchedule.why',
    area: 'schedule',
    relatedPath: null,
  },
  {
    id: 'address-workload',
    ladderStep: 'adjust_workload_schedule',
    titleKey: 'happiness.work.recs.addressWorkload.title',
    whyKey: 'happiness.work.recs.addressWorkload.why',
    area: 'workload',
    relatedPath: null,
  },
  {
    id: 'environment-shift',
    ladderStep: 'change_team_environment',
    titleKey: 'happiness.work.recs.environment.title',
    whyKey: 'happiness.work.recs.environment.why',
    area: 'environment',
    relatedPath: null,
  },
];

const EXPLORE: WorkSuggestion[] = [
  {
    id: 'explore-adjacent',
    ladderStep: 'explore_adjacent_roles',
    titleKey: 'happiness.work.recs.exploreAdjacent.title',
    whyKey: 'happiness.work.recs.exploreAdjacent.why',
    area: 'occupation',
    relatedPath: '/happiness/work?section=fit',
  },
  {
    id: 'try-contribute',
    ladderStep: 'try_via_contribute',
    titleKey: 'happiness.work.recs.tryContribute.title',
    whyKey: 'happiness.work.recs.tryContribute.why',
    area: 'trial',
    relatedPath: '/contribute',
  },
  {
    id: 'look-for-jobs',
    ladderStep: 'explore_adjacent_roles',
    titleKey: 'happiness.work.recs.lookForJobs.title',
    whyKey: 'happiness.work.recs.lookForJobs.why',
    area: 'employment',
    relatedPath: '/market?section=jobs',
  },
  {
    id: 'learn-study',
    ladderStep: 'learn_or_reskill',
    titleKey: 'happiness.work.recs.learnStudy.title',
    whyKey: 'happiness.work.recs.learnStudy.why',
    area: 'learning',
    relatedPath: '/study',
  },
];

export function suggestWorkImprovements(input: {
  hypotheses: WorkHypothesis[];
  hiddenIds?: string[];
}): WorkSuggestion[] {
  const hidden = new Set(input.hiddenIds ?? []);
  const step = suggestedLadderStep(input.hypotheses);
  const preferExplore = step === 'explore_adjacent_roles' || step === 'try_via_contribute' || step === 'learn_or_reskill';
  const pool = preferExplore ? [...IMPROVE_FIRST.slice(0, 1), ...EXPLORE] : [...IMPROVE_FIRST, EXPLORE[1]];
  const ranked = pool.filter((suggestion) => !hidden.has(suggestion.id));
  const matching = ranked.filter((suggestion) => suggestion.ladderStep === step);
  const rest = ranked.filter((suggestion) => suggestion.ladderStep !== step);
  return [...matching, ...rest].slice(0, 3);
}

export function workSuggestionMustNotBeQuitJob(suggestions: WorkSuggestion[]): boolean {
  return suggestions.every((suggestion) => suggestion.id !== 'quit-job' && suggestion.ladderStep !== 'transition_role');
}
