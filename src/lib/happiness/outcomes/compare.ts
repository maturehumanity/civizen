import { polarityFromInsight } from '@/lib/happiness/insights/present';
import type { AggregateInsightResult, WellbeingAggregateResult } from '@/lib/happiness/aggregate/types';
import { CAUSAL_CLAIM } from './copy';
import {
  HUMAN_OUTCOME_COMPARE_VERSION,
  HUMAN_OUTCOME_EVIDENCE_VERSION,
  type ComparisonDirection,
  type ComparisonWarning,
  type EvidenceStrengthLevel,
  type HumanOutcomeComparison,
  type OutcomeReviewStatus,
  type SnapshotRecord,
} from './types';

function asInsight(result: WellbeingAggregateResult | null | undefined): AggregateInsightResult | null {
  return result && result.kind === 'insight' ? result : null;
}

function rank(result: WellbeingAggregateResult | null): number | null {
  const insight = asInsight(result);
  if (!insight) return null;
  const polarity = polarityFromInsight(insight);
  if (polarity === 'needs_attention') return 0;
  if (polarity === 'mixed') return 1;
  return 2;
}

function sameSlice(a: AggregateInsightResult, b: AggregateInsightResult): boolean {
  return a.scopeId === b.scopeId && (a.domain ?? '') === (b.domain ?? '');
}

export function interpretationHasCausalClaim(text: string): boolean {
  return CAUSAL_CLAIM.test(text);
}

export function compareHumanOutcomeEvidence(input: {
  baseline: SnapshotRecord | null;
  followups: SnapshotRecord[];
  helpfulness?: SnapshotRecord | null;
  overlappingInterventions?: boolean;
  compositionChanged?: boolean;
  evaluationPlanned?: boolean;
  researchReference?: string | null;
}): HumanOutcomeComparison {
  const warnings: ComparisonWarning[] = [];
  const followups = [...input.followups].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const suppressed = followups.find((row) => row.result.kind === 'suppressed');
  const insights = followups.map((row) => asInsight(row.result)).filter((row): row is AggregateInsightResult => Boolean(row));
  const baselineInsight = asInsight(input.baseline?.result ?? null);

  if (!input.baseline) warnings.push('no_qualifying_baseline');
  if (suppressed) warnings.push('followup_suppressed');
  if (input.overlappingInterventions) warnings.push('overlapping_interventions');
  if (input.compositionChanged) warnings.push('composition_changed');
  if (input.helpfulness) warnings.push('helpfulness_is_category_not_project');

  const versions = [input.baseline, ...followups].filter(Boolean) as SnapshotRecord[];
  if (new Set(versions.map((row) => row.privacyPolicyVersion)).size > 1) warnings.push('privacy_policy_mismatch');
  if (new Set(versions.map((row) => row.aggregationModelVersion)).size > 1) warnings.push('aggregation_model_mismatch');
  if (new Set(versions.map((row) => row.timeBucket)).size > 1) warnings.push('time_bucket_mismatch');
  if (baselineInsight && insights.some((row) => !sameSlice(baselineInsight, row))) warnings.push('scope_or_domain_mismatch');

  if (warnings.includes('scope_or_domain_mismatch')) {
    return finish('not_comparable', 'needs_further_review', 'observation', warnings, input, insights, baselineInsight);
  }
  if (suppressed && insights.length === 0) {
    return finish('suppressed', 'insufficient_evidence', 'observation', warnings, input, insights, baselineInsight);
  }
  if (insights.length === 0) {
    return finish(input.baseline ? 'stable' : 'no_baseline', 'awaiting_evidence', 'observation', warnings, input, insights, baselineInsight);
  }

  const last = insights[insights.length - 1];
  const start = rank(baselineInsight) ?? rank(insights[0]);
  const end = rank(last);
  const ranks = insights.map((row) => rank(row)).filter((value): value is number => value !== null);
  const mixed = ranks.length >= 2 && new Set(ranks).size > 1 && !(start !== null && end !== null && end > start);
  let direction: ComparisonDirection = 'stable';
  if (start === null || end === null) direction = 'no_baseline';
  else if (end > start) direction = 'improving';
  else if (end < start) direction = 'worsening';
  else if (mixed) direction = 'mixed';

  let status: OutcomeReviewStatus = 'no_clear_change';
  if (direction === 'improving') status = insights.length >= 2 ? 'improvement_observed' : 'early_signal';
  else if (direction === 'worsening') status = 'concern_persists';
  else if (direction === 'mixed') status = 'mixed_result';
  else if (!baselineInsight) status = 'needs_further_review';

  let strength: EvidenceStrengthLevel = 'observation';
  if (direction === 'improving' || direction === 'worsening' || direction === 'stable') strength = 'early_association';
  if (direction === 'improving' && insights.length >= 2) strength = 'repeated_association';
  if (strength !== 'observation' && asInsight(input.helpfulness?.result ?? null)) strength = 'supporting_helpfulness';
  if (input.evaluationPlanned && input.researchReference) strength = 'evaluated_evidence';

  return finish(direction, status, strength, warnings, input, insights, baselineInsight);
}

function finish(
  direction: ComparisonDirection,
  status: OutcomeReviewStatus,
  evidenceStrength: EvidenceStrengthLevel,
  warnings: ComparisonWarning[],
  input: { baseline: SnapshotRecord | null; helpfulness?: SnapshotRecord | null },
  insights: AggregateInsightResult[],
  baselineInsight: AggregateInsightResult | null,
): HumanOutcomeComparison {
  return {
    version: HUMAN_OUTCOME_COMPARE_VERSION,
    direction,
    status,
    evidenceStrength,
    warnings,
    baselineSummary: baselineInsight?.summary ?? (input.baseline ? null : null),
    followupSummaries: insights.map((row) => row.summary),
    helpfulnessSummary: asInsight(input.helpfulness?.result ?? null)?.summary ?? null,
    causalityEstablished: false,
  };
}

export function evidenceModelVersion(): typeof HUMAN_OUTCOME_EVIDENCE_VERSION {
  return HUMAN_OUTCOME_EVIDENCE_VERSION;
}
