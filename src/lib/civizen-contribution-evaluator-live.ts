/** Apply live evaluator reputation to contribution observations. Raw ratings stay immutable. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import {
  toImmutableRating,
  type ContributionEvidenceRecord,
} from '@/lib/civizen-contribution-evidence';
import {
  deriveEvaluatorReputation,
  effectiveRatingWeight,
  recomputeStable,
  type IndependentOutcome,
} from '@/lib/civizen-evaluator-reputation';

export function applyLiveEvaluatorWeights(
  events: ContributionEvent[],
  records: ContributionEvidenceRecord[],
): ContributionEvent[] {
  const ratings = records.map(toImmutableRating).filter((item): item is NonNullable<typeof item> => item != null);
  if (ratings.length === 0) return events;
  const outcomes: IndependentOutcome[] = events.flatMap((event) => {
    const view = evaluateContributionLifecycle(event);
    if (view.realizedImpact === 'unknown') return [];
    return [{
      subjectRootId: `${event.sourceTable}:${event.sourceId}`,
      realizedImpact: view.realizedImpact,
      occurredAt: event.occurredAt,
    }];
  });
  const reputations = recomputeStable(ratings, outcomes);
  return events.map((event) => {
    const root = `${event.sourceTable}:${event.sourceId}`;
    const mine = ratings.filter((item) => item.subjectRootId === root);
    if (mine.length === 0) return event;
    const weights = mine.map((rating) => {
      const evaluator = reputations.get(rating.raterId)
        ?? deriveEvaluatorReputation(rating.raterId, ratings, outcomes);
      return effectiveRatingWeight(rating, evaluator);
    });
    const mean = weights.reduce((sum, item) => sum + item.currentWeight, 0) / weights.length;
    const reason = weights.map((item) => item.reason).find((item) => item) ?? null;
    return {
      ...event,
      rawMeta: {
        ...event.rawMeta,
        evaluatorReliability: mean,
        evaluatorReweightReason: reason,
      },
    };
  });
}
