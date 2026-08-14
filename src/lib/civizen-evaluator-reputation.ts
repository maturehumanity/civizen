/**
 * Evaluator/rater reputation. Derived from immutable rating events.
 * Subject reputation never feeds back into evaluator derivation in the same pass.
 */

export const EVALUATOR_REPUTATION_VERSION = 'evaluator-reputation-v1';
export const EVALUATOR_WEIGHT_MIN = 0.35;
export const EVALUATOR_WEIGHT_MAX = 1.22;
export const EVALUATOR_WEIGHT_NEW = 0.62;

export type EvaluatorRole = 'beneficiary' | 'peer' | 'expert' | 'system';

export type RatingConflict =
  | 'direct_collaboration'
  | 'employment'
  | 'financial'
  | 'affiliation'
  | 'family'
  | 'adversarial'
  | 'reciprocal';

export type ImmutableRatingEvent = {
  id: string;
  raterId: string;
  subjectRootId: string;
  value: number;
  occurredAt: string;
  role: EvaluatorRole;
  domain?: string | null;
  evidenceSupplied: boolean;
  affected: boolean;
  conflict?: RatingConflict | null;
  originalWeight: number;
  reweightReason?: string | null;
};

export type IndependentOutcome = {
  subjectRootId: string;
  realizedImpact: number;
  occurredAt: string;
};

export type EvaluatorReputation = {
  evaluatorId: string;
  modelVersion: string;
  participation: number | null;
  fairness: number;
  calibration: number;
  evidenceQuality: number;
  confidence: 'low' | 'moderate' | 'high';
  relevantDomains: string[];
  effectiveWeight: number;
  collusive: boolean;
  dissentPenalized: false;
};

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 1000) / 1000;
}

function shrink(count: number, prior = 3, center = 50): number {
  if (count <= 0) return center;
  const observed = Math.min(88, 42 + Math.log1p(count) * 14);
  return (prior * center + count * observed) / (prior + count);
}

function reciprocalPairs(ratings: ImmutableRatingEvent[]): Set<string> {
  const pairs = new Set<string>();
  const byRater = new Map<string, Set<string>>();
  for (const rating of ratings) {
    const list = byRater.get(rating.raterId) ?? new Set();
    list.add(rating.subjectRootId);
    byRater.set(rating.raterId, list);
  }
  for (const rating of ratings) {
    const reverse = byRater.get(rating.subjectRootId);
    if (reverse?.has(rating.raterId)) {
      pairs.add([rating.raterId, rating.subjectRootId].sort().join('::'));
    }
  }
  return pairs;
}

function extremeShare(values: number[]): number {
  if (values.length === 0) return 0;
  return values.filter((value) => value <= 8 || value >= 96).length / values.length;
}

function collusive(raterId: string, ratings: ImmutableRatingEvent[]): boolean {
  const mine = ratings.filter((item) => item.raterId === raterId);
  if (mine.length < 4) return false;
  const partners = new Map<string, number>();
  for (const rating of mine) {
    for (const other of ratings) {
      if (other.raterId === raterId || other.subjectRootId !== rating.subjectRootId) continue;
      if (Math.abs(other.value - rating.value) <= 4) {
        partners.set(other.raterId, (partners.get(other.raterId) ?? 0) + 1);
      }
    }
  }
  return [...partners.values()].some((count) => count >= 4 && count / mine.length >= 0.7);
}

export function deriveEvaluatorReputation(
  evaluatorId: string,
  ratings: ImmutableRatingEvent[],
  outcomes: IndependentOutcome[] = [],
  options?: { domain?: string | null },
): EvaluatorReputation {
  const mine = ratings.filter((item) => item.raterId === evaluatorId);
  const values = mine.map((item) => item.value);
  const evidenceQuality = mine.length === 0
    ? 50
    : 40 + (mine.filter((item) => item.evidenceSupplied).length / mine.length) * 50;
  const conflictShare = mine.length === 0
    ? 0
    : mine.filter((item) => item.conflict && item.conflict !== 'reciprocal').length / mine.length;
  const reciprocal = reciprocalPairs(ratings);
  const reciprocalShare = mine.length === 0
    ? 0
    : mine.filter((item) => reciprocal.has([item.raterId, item.subjectRootId].sort().join('::'))).length / mine.length;
  const isCollusive = collusive(evaluatorId, ratings);
  let fairness = 82 - conflictShare * 18 - reciprocalShare * 12 - extremeShare(values) * 16;
  if (isCollusive) fairness = Math.min(fairness, 34);
  fairness = clamp(fairness, 20, 92);

  const outcomeByRoot = new Map(outcomes.map((item) => [item.subjectRootId, item.realizedImpact]));
  const residuals: number[] = [];
  for (const rating of mine) {
    const later = outcomeByRoot.get(rating.subjectRootId);
    if (later == null) continue;
    residuals.push(Math.abs(rating.value - later));
  }
  const calibration = residuals.length === 0
    ? 62
    : clamp(90 - residuals.reduce((sum, item) => sum + item, 0) / residuals.length, 28, 92);

  const participation = mine.length === 0 ? null : shrink(mine.filter((item) => item.evidenceSupplied).length);
  const domains = [...new Set(mine.map((item) => item.domain).filter((item): item is string => Boolean(item)))];
  const domainMatch = options?.domain && domains.includes(options.domain) ? 1.08 : 1;
  const roleBoost = mine.some((item) => item.role === 'expert' && options?.domain && item.domain === options.domain)
    ? 1.1
    : mine.some((item) => item.role === 'beneficiary' && item.affected)
      ? 1.06
      : 1;
  const sampleCount = mine.filter((item) => item.evidenceSupplied).length;
  const sample = sampleCount === 0 ? EVALUATOR_WEIGHT_NEW : clamp(0.5 + Math.log1p(sampleCount) * 0.16, EVALUATOR_WEIGHT_MIN, 1);
  const reliability = (fairness / 100) * 0.4 + (calibration / 100) * 0.35 + (evidenceQuality / 100) * 0.25;
  const effectiveWeight = clamp(
    sample * (0.55 + reliability * 0.7) * domainMatch * roleBoost,
    EVALUATOR_WEIGHT_MIN,
    EVALUATOR_WEIGHT_MAX,
  );
  const confidence: EvaluatorReputation['confidence'] =
    sampleCount >= 12 && fairness >= 70 && !isCollusive ? 'high' : sampleCount >= 4 ? 'moderate' : 'low';

  return {
    evaluatorId,
    modelVersion: EVALUATOR_REPUTATION_VERSION,
    participation,
    fairness: Math.round(fairness * 10) / 10,
    calibration: Math.round(calibration * 10) / 10,
    evidenceQuality: Math.round(evidenceQuality * 10) / 10,
    confidence,
    relevantDomains: domains,
    effectiveWeight,
    collusive: isCollusive,
    dissentPenalized: false,
  };
}

export function effectiveRatingWeight(
  rating: ImmutableRatingEvent,
  evaluator: EvaluatorReputation,
): { originalWeight: number; currentWeight: number; reason: string | null } {
  let weight = evaluator.effectiveWeight * (rating.evidenceSupplied ? 1 : 0.72);
  if (rating.conflict === 'financial' || rating.conflict === 'employment') weight *= 0.55;
  else if (rating.conflict === 'direct_collaboration' || rating.conflict === 'reciprocal') weight *= 0.7;
  else if (rating.conflict) weight *= 0.8;
  if (rating.role === 'beneficiary' && rating.affected) weight *= 1.08;
  weight = clamp(weight, EVALUATOR_WEIGHT_MIN, EVALUATOR_WEIGHT_MAX);
  return {
    originalWeight: rating.originalWeight,
    currentWeight: weight,
    reason: rating.reweightReason ?? (evaluator.collusive ? 'evaluator_fairness_recomputed' : null),
  };
}

export function meanEvaluatorReliability(evaluators: EvaluatorReputation[]): number {
  if (evaluators.length === 0) return 1;
  const mean = evaluators.reduce((sum, item) => sum + item.effectiveWeight, 0) / evaluators.length;
  return clamp(mean, EVALUATOR_WEIGHT_MIN, EVALUATOR_WEIGHT_MAX);
}

export function recomputeStable(
  ratings: ImmutableRatingEvent[],
  outcomes: IndependentOutcome[],
): Map<string, EvaluatorReputation> {
  const ids = [...new Set(ratings.map((item) => item.raterId))].sort();
  const result = new Map<string, EvaluatorReputation>();
  for (const id of ids) result.set(id, deriveEvaluatorReputation(id, ratings, outcomes));
  return result;
}

export function dissentIsLegitimate(
  raterId: string,
  ratings: ImmutableRatingEvent[],
): boolean {
  const mine = ratings.filter((item) => item.raterId === raterId);
  if (mine.length === 0) return true;
  for (const rating of mine) {
    const peers = ratings.filter((item) => item.subjectRootId === rating.subjectRootId && item.raterId !== raterId);
    if (peers.length === 0) continue;
    const majority = peers.reduce((sum, item) => sum + item.value, 0) / peers.length;
    if (Math.abs(rating.value - majority) >= 20 && rating.evidenceSupplied) return true;
  }
  return mine.every((item) => item.evidenceSupplied);
}
