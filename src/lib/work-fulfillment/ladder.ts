/**
 * Work intervention ladder. Low Work Fulfillment must not jump to "find a new career."
 */

export const WORK_INTERVENTION_LADDER = [
  { step: 1, id: 'understand', labelKey: 'happiness.work.ladder.understand' },
  { step: 2, id: 'improve_current_role', labelKey: 'happiness.work.ladder.improveCurrent' },
  { step: 3, id: 'redesign_tasks', labelKey: 'happiness.work.ladder.redesignTasks' },
  { step: 4, id: 'adjust_workload_schedule', labelKey: 'happiness.work.ladder.adjustWorkload' },
  { step: 5, id: 'change_team_environment', labelKey: 'happiness.work.ladder.changeEnvironment' },
  { step: 6, id: 'explore_adjacent_roles', labelKey: 'happiness.work.ladder.exploreAdjacent' },
  { step: 7, id: 'try_via_contribute', labelKey: 'happiness.work.ladder.tryContribute' },
  { step: 8, id: 'learn_or_reskill', labelKey: 'happiness.work.ladder.learn' },
  { step: 9, id: 'transition_role', labelKey: 'happiness.work.ladder.transition' },
  { step: 10, id: 'monitor_post_transition', labelKey: 'happiness.work.ladder.monitor' },
] as const;

export type WorkInterventionStepId = (typeof WORK_INTERVENTION_LADDER)[number]['id'];

export function firstWorkInterventionStep(): WorkInterventionStepId {
  return 'understand';
}

export function mustNotAutoRecommendCareerChange(): true {
  return true;
}
