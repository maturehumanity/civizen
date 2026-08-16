import type { HappinessLevel } from '@/lib/happiness/types';

import {
  WORK_ASSESSMENT_DIMENSIONS,
  type WorkAssessment,
  type WorkAssessmentDimension,
} from './types';

const ATTENTION: HappinessLevel[] = ['struggling', 'unsettled'];
const GOING_WELL: HappinessLevel[] = ['flourishing', 'thriving'];

export const WORK_DIMENSION_LABEL_KEYS: Record<WorkAssessmentDimension, string> = {
  task_enjoyment: 'happiness.work.dimensions.task_enjoyment',
  strength_utilization: 'happiness.work.dimensions.strength_utilization',
  meaning_purpose: 'happiness.work.dimensions.meaning_purpose',
  autonomy: 'happiness.work.dimensions.autonomy',
  environment_social: 'happiness.work.dimensions.environment_social',
  workload_pace: 'happiness.work.dimensions.workload_pace',
  schedule_lifestyle: 'happiness.work.dimensions.schedule_lifestyle',
  growth_learning: 'happiness.work.dimensions.growth_learning',
  recognition_fairness: 'happiness.work.dimensions.recognition_fairness',
  security_compensation: 'happiness.work.dimensions.security_compensation',
};

export const WORK_DIMENSION_PROMPTS: Record<WorkAssessmentDimension, string> = {
  task_enjoyment: 'happiness.work.dimensionPrompts.task_enjoyment',
  strength_utilization: 'happiness.work.dimensionPrompts.strength_utilization',
  meaning_purpose: 'happiness.work.dimensionPrompts.meaning_purpose',
  autonomy: 'happiness.work.dimensionPrompts.autonomy',
  environment_social: 'happiness.work.dimensionPrompts.environment_social',
  workload_pace: 'happiness.work.dimensionPrompts.workload_pace',
  schedule_lifestyle: 'happiness.work.dimensionPrompts.schedule_lifestyle',
  growth_learning: 'happiness.work.dimensionPrompts.growth_learning',
  recognition_fairness: 'happiness.work.dimensionPrompts.recognition_fairness',
  security_compensation: 'happiness.work.dimensionPrompts.security_compensation',
};

export function partitionAssessmentDimensions(assessment: WorkAssessment | null): {
  goingWell: WorkAssessmentDimension[];
  needsAttention: WorkAssessmentDimension[];
} {
  if (!assessment) return { goingWell: [], needsAttention: [] };
  const goingWell: WorkAssessmentDimension[] = [];
  const needsAttention: WorkAssessmentDimension[] = [];
  for (const dimension of WORK_ASSESSMENT_DIMENSIONS) {
    const level = assessment.dimensions[dimension];
    if (!level) continue;
    if (GOING_WELL.includes(level)) goingWell.push(dimension);
    if (ATTENTION.includes(level)) needsAttention.push(dimension);
  }
  return { goingWell, needsAttention };
}

export function assessmentIsComplete(
  dimensions: Partial<Record<WorkAssessmentDimension, HappinessLevel>>,
): boolean {
  return WORK_ASSESSMENT_DIMENSIONS.every((dimension) => Boolean(dimensions[dimension]));
}

/** Median-like public level for the assessment itself — never shown as a 0–100 score. */
export function assessmentPublicLevel(
  dimensions: Partial<Record<WorkAssessmentDimension, HappinessLevel>>,
): HappinessLevel | null {
  const order: HappinessLevel[] = ['struggling', 'unsettled', 'balanced', 'flourishing', 'thriving'];
  const ranks = WORK_ASSESSMENT_DIMENSIONS.map((dimension) => dimensions[dimension])
    .filter((level): level is HappinessLevel => Boolean(level))
    .map((level) => order.indexOf(level));
  if (!ranks.length) return null;
  const sorted = [...ranks].sort((a, b) => a - b);
  return order[sorted[Math.floor(sorted.length / 2)]] ?? null;
}
