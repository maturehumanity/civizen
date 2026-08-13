import type { CivizenScoreResponse } from '@/lib/civizen-score';
import { formatScoreValue } from '@/lib/civizen-score';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function overallScoreIsEstablished(score: CivizenScoreResponse): boolean {
  return score.overall.status === 'established' && score.overall.score != null;
}

/** Points-to-next only when non-score readiness gates are already met. */
export function scoreProgressCaption(score: CivizenScoreResponse, t: Translate): string {
  const { readiness, pointsToNextTier, nextTier } = score.tier;
  if (!nextTier) return '';
  const nextLabel = t(`score.tier.${nextTier}`);
  if (readiness?.emphasizePointsToNext && pointsToNextTier != null) {
    return t('score.pointsToTier', { points: pointsToNextTier, tier: nextLabel });
  }
  return t('score.readinessHeading', { tier: nextLabel });
}

export function scoreEvidenceEstimateCaption(score: CivizenScoreResponse, t: Translate): string | null {
  if (overallScoreIsEstablished(score)) return null;
  if (score.overall.provisionalEstimate == null) return null;
  return t('score.currentEvidenceEstimate', {
    score: formatScoreValue(score.overall.provisionalEstimate),
  });
}

export function scoreCoverageCaption(score: CivizenScoreResponse, t: Translate): string | null {
  if (!score.coverage) return null;
  return t('score.coverageSummary', {
    confidence: t(`score.confidence.${score.overall.confidence}`),
    scored: score.coverage.scoredCount,
    total: score.coverage.totalCount,
  });
}

export function scorePublicSubtitle(score: CivizenScoreResponse, t: Translate): string {
  if (overallScoreIsEstablished(score)) {
    const progress = scoreProgressCaption(score, t);
    const confidence = t(`score.confidence.${score.overall.confidence}`);
    return progress ? `${confidence} · ${progress}` : confidence;
  }
  return (
    [scoreEvidenceEstimateCaption(score, t), scoreCoverageCaption(score, t)].filter(Boolean).join(' · ') ||
    t('score.notEstablishedYet')
  );
}
