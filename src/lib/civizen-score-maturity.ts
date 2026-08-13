/**
 * Civizen Score V2 — confidence, coverage, and evidence maturity.
 * Confidence is independent of whether category scores are high or low.
 * One underlying activity never reaches Moderate.
 */

import {
  uniqueEvidenceRoots,
  isWithinRecentWindow,
  type EvidenceMaturity,
  type EvidenceRootRef,
  type ScoreCategoryIdV2,
  type ScoreConfidenceLevel,
  type ScoreCoverage,
  type ScoreMaturityStatus,
  type ConfidenceFactor,
  type ConfidenceResult,
} from '@/lib/civizen-score-model';

/**
 * Confidence is independent of whether scores are high or low.
 * One underlying activity never reaches Moderate, regardless of quality.
 */
export const CONFIDENCE_GATES = {
  moderate: {
    minIndependentVerifiedRoots: 5,
    minEstablishedCategories: 2,
    requiresRecurrence: true,
    minTimeSpanDays: 21,
    minIndependentEvaluators: 2,
  },
  high: {
    minIndependentVerifiedRoots: 12,
    minEstablishedCategories: 3,
    requiresRecurrence: true,
    minTimeSpanDays: 90,
    minIndependentEvaluators: 3,
    minRecentVerifiedRoots: 2,
  },
  very_high: {
    minIndependentVerifiedRoots: 20,
    minEstablishedCategories: 4,
    requiresRecurrence: true,
    minTimeSpanDays: 180,
    minIndependentEvaluators: 5,
    minRecentVerifiedRoots: 4,
  },
} as const;

export const TIER_EVIDENCE_GATES = {
  builder: {
    minIndependentVerifiedRoots: 3,
    minScoredCategories: 1,
    minConfidence: 'low' as ScoreConfidenceLevel,
    requiresRecurrence: false,
    minTimeSpanDays: 0,
  },
  contributor: {
    minIndependentVerifiedRoots: 5,
    minScoredCategories: 2,
    minConfidence: 'moderate' as ScoreConfidenceLevel,
    requiresRecurrence: true,
    minTimeSpanDays: 21,
  },
  catalyst: {
    minIndependentVerifiedRoots: 12,
    minScoredCategories: 3,
    minConfidence: 'high' as ScoreConfidenceLevel,
    requiresRecurrence: true,
    minTimeSpanDays: 90,
  },
  steward: {
    minIndependentVerifiedRoots: 20,
    minScoredCategories: 4,
    minConfidence: 'high' as ScoreConfidenceLevel,
    requiresRecurrence: true,
    minTimeSpanDays: 180,
  },
} as const;

function rankConfidence(value: ScoreConfidenceLevel): number {
  switch (value) {
    case 'insufficient':
      return 0;
    case 'low':
      return 1;
    case 'moderate':
      return 2;
    case 'high':
      return 3;
    case 'very_high':
      return 4;
  }
}

export function minConfidenceLevel(values: ScoreConfidenceLevel[]): ScoreConfidenceLevel {
  if (values.length === 0) return 'insufficient';
  return values.reduce((lowest, current) =>
    rankConfidence(current) < rankConfidence(lowest) ? current : lowest,
  );
}

export function computeCoverage(
  scored: Partial<Record<ScoreCategoryIdV2, number | null>>,
  order: ScoreCategoryIdV2[],
): ScoreCoverage {
  const missingCategoryIds: ScoreCategoryIdV2[] = [];
  let scoredCount = 0;
  for (const id of order) {
    if (scored[id] == null) missingCategoryIds.push(id);
    else scoredCount += 1;
  }
  const ratio = order.length === 0 ? 0 : scoredCount / order.length;
  return {
    scoredCount,
    totalCount: order.length,
    ratio,
    missingCategoryIds,
    limited: scoredCount < 3,
  };
}

export function computeEvidenceMaturity(args: {
  roots: EvidenceRootRef[];
  scoredCategoryCount: number;
  establishedCategoryCount: number;
  effectiveEvidenceVolume: number;
  nowMs?: number;
}): EvidenceMaturity {
  const unique = uniqueEvidenceRoots(args.roots);
  const verified = unique.filter((root) => root.verified);
  const dates = unique
    .map((root) => Date.parse(root.occurredAt ?? ''))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const timeSpanDays =
    dates.length >= 2 ? Math.round((dates[dates.length - 1] - dates[0]) / (24 * 60 * 60 * 1000)) : 0;
  const evaluatorIds = new Set(unique.flatMap((root) => root.evaluatorIds ?? []));
  const evaluationCount = unique.reduce(
    (sum, root) => sum + Math.max(root.evaluationCount ?? 0, root.evaluatorIds?.length ?? 0),
    0,
  );
  const nowMs = args.nowMs ?? Date.now();
  const recentVerifiedRootCount = verified.filter((root) => isWithinRecentWindow(root.occurredAt, nowMs)).length;

  return {
    independentEvidenceCount: unique.length,
    independentVerifiedCount: verified.length,
    evaluationCount,
    evaluatorCount: evaluatorIds.size,
    effectiveEvidenceVolume: args.effectiveEvidenceVolume,
    scoredCategoryCount: args.scoredCategoryCount,
    establishedCategoryCount: args.establishedCategoryCount,
    hasRecurrence: unique.length >= 2,
    timeSpanDays,
    recentVerifiedRootCount,
    evidenceRoots: unique.map((root) => root.id),
  };
}

function gateFactor(
  id: string,
  label: string,
  met: boolean,
  current: number | boolean | string | null,
  required: number | boolean | string | null,
): ConfidenceFactor {
  return { id, label, met, current, required };
}

/**
 * Confidence from evidence maturity only — never from score magnitude.
 * One independent activity cannot reach Moderate.
 */
export function computeConfidence(maturity: EvidenceMaturity): ConfidenceResult {
  const { moderate, high, very_high } = CONFIDENCE_GATES;
  const evaluatorInfoExists = maturity.evaluatorCount > 0 || maturity.evaluationCount > 0;

  const moderateFactors: ConfidenceFactor[] = [
    gateFactor(
      'independent_verified',
      'Independent verified evidence',
      maturity.independentVerifiedCount >= moderate.minIndependentVerifiedRoots,
      maturity.independentVerifiedCount,
      moderate.minIndependentVerifiedRoots,
    ),
    gateFactor(
      'category_breadth',
      'Category breadth',
      maturity.establishedCategoryCount >= moderate.minEstablishedCategories ||
        maturity.scoredCategoryCount >= moderate.minEstablishedCategories,
      Math.max(maturity.establishedCategoryCount, maturity.scoredCategoryCount),
      moderate.minEstablishedCategories,
    ),
    gateFactor(
      'recurrence',
      'Recurrence',
      maturity.hasRecurrence,
      maturity.hasRecurrence,
      true,
    ),
    gateFactor(
      'time_span',
      'Time span',
      maturity.timeSpanDays >= moderate.minTimeSpanDays,
      maturity.timeSpanDays,
      moderate.minTimeSpanDays,
    ),
  ];
  if (evaluatorInfoExists) {
    moderateFactors.push(
      gateFactor(
        'evaluators',
        'Independent evaluators',
        maturity.evaluatorCount >= moderate.minIndependentEvaluators,
        maturity.evaluatorCount,
        moderate.minIndependentEvaluators,
      ),
    );
  }

  if (maturity.independentVerifiedCount <= 0 && maturity.independentEvidenceCount <= 0) {
    return { confidence: 'insufficient', factors: moderateFactors };
  }

  const moderateMet = moderateFactors.every((factor) => factor.met);
  const highFactors: ConfidenceFactor[] = [
    ...moderateFactors,
    gateFactor(
      'high_independent_verified',
      'Independent verified evidence (high)',
      maturity.independentVerifiedCount >= high.minIndependentVerifiedRoots,
      maturity.independentVerifiedCount,
      high.minIndependentVerifiedRoots,
    ),
    gateFactor(
      'high_breadth',
      'Established categories',
      maturity.establishedCategoryCount >= high.minEstablishedCategories,
      maturity.establishedCategoryCount,
      high.minEstablishedCategories,
    ),
    gateFactor(
      'high_time_span',
      'Sustained history',
      maturity.timeSpanDays >= high.minTimeSpanDays,
      maturity.timeSpanDays,
      high.minTimeSpanDays,
    ),
    gateFactor(
      'high_recent',
      'Recent verified evidence',
      maturity.recentVerifiedRootCount >= high.minRecentVerifiedRoots,
      maturity.recentVerifiedRootCount,
      high.minRecentVerifiedRoots,
    ),
  ];
  if (evaluatorInfoExists) {
    highFactors.push(
      gateFactor(
        'high_evaluators',
        'Evaluator diversity (high)',
        maturity.evaluatorCount >= high.minIndependentEvaluators,
        maturity.evaluatorCount,
        high.minIndependentEvaluators,
      ),
    );
  }

  const highMet = moderateMet && highFactors.every((factor) => factor.met);
  const veryHighMet =
    highMet &&
    maturity.independentVerifiedCount >= very_high.minIndependentVerifiedRoots &&
    maturity.establishedCategoryCount >= very_high.minEstablishedCategories &&
    maturity.timeSpanDays >= very_high.minTimeSpanDays &&
    maturity.recentVerifiedRootCount >= very_high.minRecentVerifiedRoots &&
    (!evaluatorInfoExists || maturity.evaluatorCount >= very_high.minIndependentEvaluators);

  let confidence: ScoreConfidenceLevel = 'low';
  if (veryHighMet) confidence = 'very_high';
  else if (highMet) confidence = 'high';
  else if (moderateMet) confidence = 'moderate';

  return { confidence, factors: highMet ? highFactors : moderateFactors };
}

export function deriveOverallStatus(args: {
  overallScore: number | null;
  coverage: ScoreCoverage;
  confidence: ScoreConfidenceLevel;
  independentVerifiedCount: number;
}): ScoreMaturityStatus {
  if (args.overallScore == null || args.coverage.scoredCount === 0) return 'not_established';
  if (
    args.coverage.limited ||
    args.confidence === 'insufficient' ||
    args.confidence === 'low' ||
    args.independentVerifiedCount < CONFIDENCE_GATES.moderate.minIndependentVerifiedRoots
  ) {
    return 'provisional';
  }
  return 'established';
}

