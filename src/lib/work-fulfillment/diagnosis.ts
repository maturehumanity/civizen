import type { HappinessLevel } from '@/lib/happiness/types';

import type { WorkInterventionStepId } from './ladder';
import type { WorkAssessment, WorkHypothesisId, WorkJoyEntry } from './types';
import { workJoyHasSufficientHistory } from './joy-patterns';

const LOW: HappinessLevel[] = ['struggling', 'unsettled'];
const HIGH: HappinessLevel[] = ['flourishing', 'thriving'];

function isLow(level: HappinessLevel | undefined): boolean {
  return Boolean(level && LOW.includes(level));
}

function isHigh(level: HappinessLevel | undefined): boolean {
  return Boolean(level && HIGH.includes(level));
}

export type WorkHypothesis = {
  id: WorkHypothesisId;
  confidence: 'possible' | 'limited';
  improveFirst: boolean;
};

/**
 * Cautious sources to explore — never a clinical diagnosis or "you need a new career."
 */
export function diagnoseWorkSources(input: {
  assessment: WorkAssessment | null;
  joyEntries: WorkJoyEntry[];
}): WorkHypothesis[] {
  const dimensions = input.assessment?.dimensions ?? {};
  const hasAssessment = Object.keys(dimensions).length >= 6;
  const hasJoy = workJoyHasSufficientHistory(input.joyEntries);

  if (!hasAssessment && !hasJoy) {
    return [{ id: 'insufficient_evidence', confidence: 'limited', improveFirst: true }];
  }

  const found: WorkHypothesis[] = [];
  const occupationLooksOk =
    isHigh(dimensions.meaning_purpose) || isHigh(dimensions.strength_utilization);

  if (isLow(dimensions.task_enjoyment) && occupationLooksOk) {
    found.push({ id: 'task_mix_mismatch', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.strength_utilization)) {
    found.push({ id: 'underused_strengths', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.autonomy)) {
    found.push({ id: 'insufficient_autonomy', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.environment_social) && isLow(dimensions.recognition_fairness)) {
    found.push({ id: 'team_management', confidence: 'possible', improveFirst: true });
  } else if (isLow(dimensions.environment_social)) {
    found.push({ id: 'work_environment_mismatch', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.workload_pace)) {
    found.push({ id: 'unsustainable_workload', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.schedule_lifestyle)) {
    found.push({ id: 'schedule_lifestyle_mismatch', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.growth_learning)) {
    found.push({ id: 'lack_of_growth', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.recognition_fairness) && !isLow(dimensions.environment_social)) {
    found.push({ id: 'lack_of_recognition', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.security_compensation)) {
    found.push({ id: 'compensation_security', confidence: 'possible', improveFirst: true });
  }
  if (isLow(dimensions.meaning_purpose) && isLow(dimensions.strength_utilization)) {
    found.push({ id: 'occupation_mismatch', confidence: 'possible', improveFirst: false });
  } else if (isLow(dimensions.meaning_purpose)) {
    found.push({ id: 'lack_of_purpose', confidence: 'possible', improveFirst: true });
  }

  if (!found.length) {
    found.push({
      id: hasAssessment ? 'temporary_situational_stress' : 'insufficient_evidence',
      confidence: 'limited',
      improveFirst: true,
    });
  }

  return found.slice(0, 4);
}

export function occupationMayFitWhileTasksNeedWork(hypotheses: WorkHypothesis[]): boolean {
  const ids = new Set(hypotheses.map((item) => item.id));
  return !ids.has('occupation_mismatch') && (ids.has('task_mix_mismatch') || ids.has('insufficient_autonomy'));
}

export function suggestedLadderStep(hypotheses: WorkHypothesis[]): WorkInterventionStepId {
  if (hypotheses.some((item) => item.id === 'insufficient_evidence')) return 'understand';
  if (occupationMayFitWhileTasksNeedWork(hypotheses)) {
    if (hypotheses.some((item) => item.id === 'task_mix_mismatch')) return 'redesign_tasks';
    return 'improve_current_role';
  }
  if (hypotheses.some((item) => item.id === 'unsustainable_workload' || item.id === 'schedule_lifestyle_mismatch')) {
    return 'adjust_workload_schedule';
  }
  if (hypotheses.some((item) => item.id === 'work_environment_mismatch' || item.id === 'team_management')) {
    return 'change_team_environment';
  }
  if (hypotheses.some((item) => item.id === 'occupation_mismatch')) return 'explore_adjacent_roles';
  return 'improve_current_role';
}

export function mustNotLeadWithCareerChange(hypotheses: WorkHypothesis[]): boolean {
  return suggestedLadderStep(hypotheses) !== 'explore_adjacent_roles' && suggestedLadderStep(hypotheses) !== 'transition_role';
}
