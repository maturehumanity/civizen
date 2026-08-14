/** Contribution observation adapter for Score V2. Lifecycle lives in contribution-lifecycle. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import {
  evaluateContributionLifecycle,
  type ContributionLifecycleView,
} from '@/lib/civizen-contribution-lifecycle';

export {
  CONTRIBUTION_EVALUATION_VERSION,
  evaluateContributionLifecycle,
  verificationKind,
  type ContributionLifecycleView,
  type ContributionMaturityStage,
  type ContributionVerificationKind,
} from '@/lib/civizen-contribution-lifecycle';

export type ContributionObservationView = ContributionLifecycleView;

export function evaluateContributionObservation(event: ContributionEvent): ContributionObservationView {
  return evaluateContributionLifecycle(event);
}

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function publicCommitShas(event: ContributionEvent): string[] {
  const values = Array.isArray(event.rawMeta.commitShas) ? event.rawMeta.commitShas : [];
  return values
    .filter((item): item is string => typeof item === 'string' && item.length >= 7)
    .map((sha) => sha.slice(0, 12))
    .slice(0, 4);
}

export function contributionSurvivalState(event: ContributionEvent): 'surviving' | 'reconstructed' | 'unknown' {
  if (event.rawMeta.survivingImplementation === true) return 'surviving';
  if (event.rawMeta.reconstruction === true || typeof event.rawMeta.reconstructionResult === 'string') {
    return 'reconstructed';
  }
  return 'unknown';
}

export function associatedProjectLabel(event: ContributionEvent): string | null {
  return metaString(event.rawMeta, 'opportunityTitle') ?? metaString(event.rawMeta, 'projectTitle');
}

export function contributionTimeSpanDays(events: ContributionEvent[]): number {
  const times = events.map((item) => Date.parse(item.occurredAt)).filter((value) => Number.isFinite(value));
  if (times.length < 2) return 0;
  return Math.round((Math.max(...times) - Math.min(...times)) / 86_400_000);
}

export function improvementGuidance(args: {
  independentValidation: boolean;
  realizedImpactKnown: boolean;
  timeSpanDays: number;
  verifiedCount: number;
}): string[] {
  const tips: string[] = [];
  if (!args.independentValidation) tips.push('obtain broader evaluator validation');
  if (!args.realizedImpactKnown) tips.push('provide evidence of realized results');
  if (args.timeSpanDays < 21) tips.push('contribute across a longer period');
  if (args.verifiedCount < 5) tips.push('complete more independently verified outcomes');
  return tips;
}
