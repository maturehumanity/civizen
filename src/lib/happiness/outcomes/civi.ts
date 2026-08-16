import type { CiviAggregateContext } from '@/lib/happiness/aggregate/civi-context';
import { CAUSAL_CLAIM, OUTCOME_COPY } from './copy';
import type { HumanOutcomeComparison, HumanOutcomeFactor, HumanOutcomeReview, PublicOutcomeLesson } from './types';

export type CiviOutcomeContext = {
  kind: 'human_outcome_review';
  surface: 'outcome_review';
  scopeId: string | null;
  summary: string;
  operationalOutcome: string;
  humanOutcome: string;
  evidenceStrength: string;
  status: string;
  uncertainties: string[];
  similarTitles: string[];
  causalityEstablished: false;
  caveats: string[];
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
};

const PRIVATE = /member-|privateNote|profile_id|check-in note|work joy/i;

export function toCiviOutcomeContext(input: {
  review: HumanOutcomeReview;
  comparison: HumanOutcomeComparison;
  factors?: HumanOutcomeFactor[];
  similar?: PublicOutcomeLesson[];
  aggregate?: CiviAggregateContext | null;
}): CiviOutcomeContext {
  const negative = ['no_clear_change', 'concern_persists', 'mixed_result', 'insufficient_evidence'].includes(input.comparison.status);
  const human = negative
    ? `${OUTCOME_COPY.statuses[input.comparison.status]}. Operational delivery is not the same as a human-outcome improvement.`
    : `${OUTCOME_COPY.statuses[input.comparison.status]}. ${OUTCOME_COPY.noCausation}`;
  const context: CiviOutcomeContext = {
    kind: 'human_outcome_review',
    surface: 'outcome_review',
    scopeId: input.review.scopeId,
    summary: human,
    operationalOutcome: input.review.operationalOutcome?.trim() || 'Operational outcome is recorded separately.',
    humanOutcome: human,
    evidenceStrength: OUTCOME_COPY.strength[input.comparison.evidenceStrength],
    status: OUTCOME_COPY.statuses[input.comparison.status],
    uncertainties: [
      OUTCOME_COPY.noCausation,
      ...(input.factors ?? []).map((row) => row.note),
      ...(input.review.uncertaintyNote ? [input.review.uncertaintyNote] : []),
    ],
    similarTitles: (input.similar ?? []).map((row) => row.title),
    causalityEstablished: false,
    caveats: [OUTCOME_COPY.privacyHint, OUTCOME_COPY.notPenalty, OUTCOME_COPY.noScore],
    privacyPolicyVersion: input.aggregate?.privacyPolicyVersion ?? 'wellbeing-aggregate-privacy-v1',
    aggregationModelVersion: input.aggregate?.aggregationModelVersion ?? 'wellbeing-aggregate-v1',
  };
  const packed = JSON.stringify(context);
  if (PRIVATE.test(packed) || CAUSAL_CLAIM.test(packed)) {
    throw new Error('Civi outcome context must not include private records or causal claims');
  }
  return context;
}

export function civiMayClaimCausation(): false {
  return false;
}

export function civiMustPreserveNegativeResults(): true {
  return true;
}

export function civiSummaryIsHonest(context: CiviOutcomeContext, status: HumanOutcomeComparison['status']): boolean {
  if (['no_clear_change', 'concern_persists', 'mixed_result', 'insufficient_evidence'].includes(status)) {
    return context.humanOutcome.toLowerCase().includes(OUTCOME_COPY.statuses[status].toLowerCase()) && !CAUSAL_CLAIM.test(context.summary);
  }
  return !CAUSAL_CLAIM.test(context.summary);
}
