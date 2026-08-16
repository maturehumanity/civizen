import { compareLevels } from '@/lib/happiness/levels';
import type { ActionOutcomeRating, HappinessDomainId, HappinessLevel } from '@/lib/happiness/types';
import type { FulfillmentActionStatus, FulfillmentPlanStatus, QualitativePlanState } from './types';

export function qualitativeStateFromSignals(input: {
  planStatus: FulfillmentPlanStatus;
  actionStatuses: FulfillmentActionStatus[];
  helped: ActionOutcomeRating[];
}): QualitativePlanState {
  if (input.planStatus === 'paused') return 'paused';
  if (input.planStatus === 'stopped') return 'stopped';
  if (input.planStatus === 'completed') return 'completed';
  if (input.helped.some((rating) => rating === 'a_lot' || rating === 'somewhat')) return 'seeing_improvement';
  if (input.helped.some((rating) => rating === 'not_at_all') && input.helped.every((rating) => rating === 'not_at_all' || rating === 'a_little')) {
    return 'needs_another_approach';
  }
  if (input.actionStatuses.some((status) => status === 'in_progress' || status === 'completed')) return 'trying';
  return 'exploring';
}

export function qualitativeStateLabelKey(state: QualitativePlanState): string {
  return `happiness.plans.progress.${state}`;
}

export function nextStepAfterOutcome(helped: ActionOutcomeRating): 'continue' | 'adjust' | 'try_something_else' | 'complete' {
  if (helped === 'a_lot') return 'continue';
  if (helped === 'somewhat') return 'adjust';
  if (helped === 'a_little') return 'adjust';
  return 'try_something_else';
}

export function domainImprovedSincePlan(input: {
  domain: HappinessDomainId;
  startedAt: string;
  snapshots: { computedAt: string; domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>> }[];
}): boolean {
  const dated = [...input.snapshots].sort((a, b) => a.computedAt.localeCompare(b.computedAt));
  const before = [...dated].reverse().find((row) => row.computedAt <= input.startedAt);
  const latest = dated.at(-1);
  const earlier = before?.domainLevels[input.domain];
  const current = latest?.domainLevels[input.domain];
  if (!earlier || !current) return false;
  return compareLevels(current, earlier) > 0;
}
