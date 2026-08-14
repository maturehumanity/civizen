/** Contribution evidence-confidence breakdown. Volume alone cannot raise overall confidence. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import type { ScoreConfidenceLevel } from '@/lib/civizen-score-model';

export type ContributionConfidenceFactorId =
  | 'verified_quantity'
  | 'root_independence'
  | 'system_verification'
  | 'independent_validators'
  | 'beneficiary_outcome'
  | 'evaluator_diversity'
  | 'realized_impact_maturity';

export type ContributionConfidenceFactor = {
  id: ContributionConfidenceFactorId;
  level: 'none' | 'low' | 'moderate' | 'high';
  count: number;
  metForModerate: boolean;
};

export type ContributionEvidenceConfidence = {
  overall: ScoreConfidenceLevel;
  reason: string;
  factors: ContributionConfidenceFactor[];
};

function levelFromCount(count: number, moderate: number, high: number): ContributionConfidenceFactor['level'] {
  if (count <= 0) return 'none';
  if (count >= high) return 'high';
  if (count >= moderate) return 'moderate';
  return 'low';
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((item) => item.trim().length > 0))];
}

/**
 * Overall stays Low until independent validators and outcome evidence exist.
 * 86 system-verified roots do not satisfy Moderate.
 */
export function summarizeContributionEvidenceConfidence(
  events: ContributionEvent[],
): ContributionEvidenceConfidence {
  const unique = new Map<string, ContributionEvent>();
  for (const event of events) {
    const key = `${event.sourceTable}:${event.sourceId}`;
    if (!unique.has(key)) unique.set(key, event);
  }
  const roots = [...unique.values()];
  const views = roots.map((event) => ({ event, view: evaluateContributionLifecycle(event) }));
  const verified = views.filter((item) => item.event.verified).length;
  const systemVerified = views.filter((item) => item.view.verificationKind === 'system_verified').length;
  const independentlyValidated = views.filter((item) => item.view.verificationKind === 'independently_validated').length;
  const realized = views.filter((item) => item.view.realizedImpact !== 'unknown').length;
  const evaluatorIds = uniqueStrings(views.flatMap((item) =>
    Array.isArray(item.event.rawMeta.evaluatorIds)
      ? item.event.rawMeta.evaluatorIds.filter((id): id is string => typeof id === 'string')
      : [],
  ));
  const validatorIds = uniqueStrings(views.flatMap((item) =>
    Array.isArray(item.event.rawMeta.independentValidatorIds)
      ? item.event.rawMeta.independentValidatorIds.filter((id): id is string => typeof id === 'string')
      : [],
  ));
  const beneficiaryReports = views.reduce((sum, item) => {
    const feedback = item.event.rawMeta.impactEvidence;
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback)) return sum;
    const samples = Array.isArray((feedback as { feedback?: unknown }).feedback)
      ? ((feedback as { feedback: Array<{ affected?: boolean }> }).feedback)
      : [];
    return sum + samples.filter((sample) => sample.affected === true).length;
  }, 0);

  const factors: ContributionConfidenceFactor[] = [
    {
      id: 'verified_quantity',
      level: levelFromCount(verified, 5, 12),
      count: verified,
      metForModerate: verified >= 5,
    },
    {
      id: 'root_independence',
      level: levelFromCount(roots.length, 5, 12),
      count: roots.length,
      metForModerate: roots.length >= 5,
    },
    {
      id: 'system_verification',
      level: levelFromCount(systemVerified + independentlyValidated, 5, 12),
      count: systemVerified + independentlyValidated,
      metForModerate: systemVerified + independentlyValidated >= 5,
    },
    {
      id: 'independent_validators',
      level: levelFromCount(validatorIds.length, 2, 3),
      count: validatorIds.length,
      metForModerate: validatorIds.length >= 2,
    },
    {
      id: 'beneficiary_outcome',
      level: levelFromCount(beneficiaryReports, 3, 8),
      count: beneficiaryReports,
      metForModerate: beneficiaryReports >= 3,
    },
    {
      id: 'evaluator_diversity',
      level: levelFromCount(evaluatorIds.length, 2, 3),
      count: evaluatorIds.length,
      metForModerate: evaluatorIds.length >= 2,
    },
    {
      id: 'realized_impact_maturity',
      level: levelFromCount(realized, 1, 5),
      count: realized,
      metForModerate: realized >= 1,
    },
  ];

  const independentSupport = validatorIds.length >= 2 || (validatorIds.length >= 1 && independentlyValidated >= 1);
  const outcomeSupport = realized >= 1 || beneficiaryReports >= 3;
  const volumeOnly = verified >= 5 && !independentSupport && !outcomeSupport;
  let overall: ScoreConfidenceLevel = 'low';
  let reason = 'independent_validation_and_outcome_evidence_missing';
  if (roots.length === 0) {
    overall = 'insufficient';
    reason = 'no_contribution_evidence';
  } else if (independentSupport && outcomeSupport && evaluatorIds.length >= 2) {
    overall = 'moderate';
    reason = 'independent_validators_and_realized_outcomes';
  } else if (volumeOnly) {
    reason = 'system_verified_volume_without_independent_or_outcome_evidence';
  }

  return { overall, reason, factors };
}
