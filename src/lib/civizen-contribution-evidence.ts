/** Live contribution evidence attached to an existing canonical root. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import type { ContributionEvidenceEvent } from '@/lib/civizen-contribution-lifecycle';
import type { ContributionImpactEvidence, ImpactBreadth, ImpactDepth, ImpactFeedbackSample } from '@/lib/civizen-contribution-impact';
import type { ImmutableRatingEvent, RatingConflict, EvaluatorRole } from '@/lib/civizen-evaluator-reputation';

export const CONTRIBUTION_EVIDENCE_VERSION = 'contribution-evidence-v1';

export type ContributionEvidenceKind =
  | 'impact_outcome'
  | 'beneficiary_feedback'
  | 'observer_feedback'
  | 'independent_validation'
  | 'durability'
  | 'reversal'
  | 'adverse_outcome'
  | 'dispute'
  | 'evaluator_reweight';

export type ContributionEvaluatorRole =
  | 'general_observer'
  | 'affected_user'
  | 'beneficiary'
  | 'contributor'
  | 'collaborator'
  | 'peer'
  | 'domain_expert'
  | 'institutional_evaluator';

export type RatingDimension =
  | 'usefulness'
  | 'quality'
  | 'realized_effect'
  | 'fairness'
  | 'usability'
  | 'problem_resolution'
  | 'unintended_consequences';

export type ContributionEvidenceRecord = {
  id: string;
  contributionSourceTable: string;
  contributionSourceId: string;
  kind: ContributionEvidenceKind;
  evaluatorProfileId: string;
  evaluatorRole: ContributionEvaluatorRole;
  ratings: Partial<Record<RatingDimension, number>>;
  reason: string | null;
  relationshipContext: string | null;
  affected: boolean;
  conflictType: RatingConflict | null;
  conflictDisclosed: boolean;
  payload: Record<string, unknown>;
  validationStatus: 'submitted' | 'accepted' | 'disputed' | 'withdrawn' | null;
  reweightReason: string | null;
  occurredAt: string;
};

const DIMENSIONS_BY_FUNCTION: Record<string, RatingDimension[]> = {
  implementation: ['usefulness', 'quality', 'usability', 'problem_resolution', 'unintended_consequences'],
  documentation: ['usefulness', 'quality', 'usability'],
  governance_design: ['quality', 'fairness', 'realized_effect', 'unintended_consequences'],
  system_architecture: ['quality', 'usefulness', 'realized_effect'],
  product_architecture: ['usefulness', 'quality', 'usability', 'realized_effect'],
  model_evolution: ['quality', 'usefulness', 'realized_effect'],
  communication: ['usefulness', 'quality'],
  opportunity: ['usefulness', 'quality', 'realized_effect', 'fairness', 'problem_resolution'],
};

export function ratingDimensionsForFunction(fn: string): RatingDimension[] {
  return DIMENSIONS_BY_FUNCTION[fn] ?? ['usefulness', 'quality', 'realized_effect', 'unintended_consequences'];
}

export function mapEvaluatorRole(role: ContributionEvaluatorRole): EvaluatorRole {
  if (role === 'affected_user' || role === 'beneficiary') return 'beneficiary';
  if (role === 'domain_expert' || role === 'institutional_evaluator') return 'expert';
  return 'peer';
}

export function isAffectedRole(role: ContributionEvaluatorRole): boolean {
  return role === 'affected_user' || role === 'beneficiary';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function ratingMean(ratings: Partial<Record<RatingDimension, number>>): number | null {
  const values = Object.values(ratings).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function impactPatch(record: ContributionEvidenceRecord): Partial<ContributionImpactEvidence> {
  const p = record.payload;
  const patch: Partial<ContributionImpactEvidence> = {};
  if (typeof p.claimedScope === 'string') patch.claimedScope = p.claimedScope as ImpactBreadth;
  if (typeof p.realizedReach === 'string') patch.realizedReach = p.realizedReach as ImpactBreadth;
  if (typeof p.breadth === 'string') patch.breadth = p.breadth as ImpactBreadth;
  if (typeof p.depth === 'string') patch.depth = p.depth as ImpactDepth;
  if (asNumber(p.affectedPopulation) != null) patch.affectedPopulation = asNumber(p.affectedPopulation);
  if (asNumber(p.affectedOrganizations) != null) patch.affectedOrganizations = asNumber(p.affectedOrganizations);
  if (asNumber(p.affectedJurisdictions) != null) patch.affectedJurisdictions = asNumber(p.affectedJurisdictions);
  if (asNumber(p.adoption) != null) patch.adoption = asNumber(p.adoption);
  if (asNumber(p.outcomeMetric) != null) patch.outcomeMetric = asNumber(p.outcomeMetric);
  if (asNumber(p.baselineValue) != null) patch.baselineValue = asNumber(p.baselineValue);
  if (asNumber(p.resultingValue) != null) patch.resultingValue = asNumber(p.resultingValue);
  if (asNumber(p.durabilityDays) != null) patch.durabilityDays = asNumber(p.durabilityDays);
  if (p.reversal === true || record.kind === 'reversal') patch.reversal = true;
  if (p.adverseOutcome === true || record.kind === 'adverse_outcome') patch.adverseOutcome = true;
  if (p.externalValidation === true || record.evaluatorRole === 'institutional_evaluator') patch.externalValidation = true;
  return patch;
}

function feedbackSample(record: ContributionEvidenceRecord): ImpactFeedbackSample | null {
  if (record.kind !== 'beneficiary_feedback' && record.kind !== 'observer_feedback') return null;
  const value = ratingMean(record.ratings);
  if (value == null) return null;
  const likesOnly = record.kind === 'observer_feedback' && !record.affected && !record.reason;
  return {
    role: isAffectedRole(record.evaluatorRole) ? 'beneficiary' : record.evaluatorRole === 'institutional_evaluator' ? 'institutional' : record.evaluatorRole === 'domain_expert' ? 'expert' : 'public',
    value,
    affected: record.affected && isAffectedRole(record.evaluatorRole),
    evidenceSupplied: Boolean(record.reason && record.reason.trim()),
    likesOnly,
    raterId: record.evaluatorProfileId,
  };
}

export function toImmutableRating(record: ContributionEvidenceRecord): ImmutableRatingEvent | null {
  const value = ratingMean(record.ratings);
  if (value == null) return null;
  if (record.kind !== 'beneficiary_feedback' && record.kind !== 'observer_feedback' && record.kind !== 'independent_validation') {
    return null;
  }
  return {
    id: record.id,
    raterId: record.evaluatorProfileId,
    subjectRootId: `${record.contributionSourceTable}:${record.contributionSourceId}`,
    value,
    occurredAt: record.occurredAt,
    role: mapEvaluatorRole(record.evaluatorRole),
    evidenceSupplied: Boolean(record.reason && record.reason.trim()),
    affected: record.affected && isAffectedRole(record.evaluatorRole),
    conflict: record.conflictType,
    originalWeight: 1,
    reweightReason: record.reweightReason,
  };
}

export function evidenceEventFromRecord(record: ContributionEvidenceRecord): ContributionEvidenceEvent {
  const kind = record.kind === 'independent_validation'
    ? 'independent_validation'
    : record.kind === 'reversal'
      ? 'reversal'
      : record.kind === 'adverse_outcome'
        ? 'adverse_outcome'
        : record.kind === 'durability'
          ? 'durability'
          : record.kind === 'evaluator_reweight'
            ? 'evaluator_reweight'
            : record.kind === 'dispute'
              ? 'dispute'
              : record.kind === 'impact_outcome'
                ? 'realized_outcome'
                : 'realized_outcome';
  return {
    kind,
    at: record.occurredAt,
    modelVersion: CONTRIBUTION_EVIDENCE_VERSION,
    evidenceVersion: record.kind,
    cause: record.reweightReason || record.reason || record.kind,
    rawValue: ratingMean(record.ratings),
  };
}

export function mergeEvidenceIntoEvent(
  event: ContributionEvent,
  records: ContributionEvidenceRecord[],
): ContributionEvent {
  const mine = records
    .filter((item) => item.contributionSourceTable === event.sourceTable && item.contributionSourceId === event.sourceId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  if (mine.length === 0) return event;
  const existingImpact = event.rawMeta.impactEvidence && typeof event.rawMeta.impactEvidence === 'object'
    ? { ...(event.rawMeta.impactEvidence as ContributionImpactEvidence) }
    : {};
  const feedback: ImpactFeedbackSample[] = [...(existingImpact.feedback ?? [])];
  const evaluatorIds = new Set(
    Array.isArray(event.rawMeta.evaluatorIds)
      ? event.rawMeta.evaluatorIds.filter((id): id is string => typeof id === 'string')
      : [],
  );
  const validatorIds = new Set(
    Array.isArray(event.rawMeta.independentValidatorIds)
      ? event.rawMeta.independentValidatorIds.filter((id): id is string => typeof id === 'string')
      : [],
  );
  let independentValidation = event.rawMeta.independentValidation === true;
  const extraEvents: ContributionEvidenceEvent[] = Array.isArray(event.rawMeta.liveEvidenceEvents)
    ? [...(event.rawMeta.liveEvidenceEvents as ContributionEvidenceEvent[])]
    : [];
  for (const record of mine) {
    Object.assign(existingImpact, impactPatch(record));
    const sample = feedbackSample(record);
    if (sample) feedback.push(sample);
    evaluatorIds.add(record.evaluatorProfileId);
    if (record.kind === 'independent_validation' && record.validationStatus !== 'withdrawn' && record.validationStatus !== 'disputed') {
      independentValidation = true;
      validatorIds.add(record.evaluatorProfileId);
    }
    extraEvents.push(evidenceEventFromRecord(record));
  }
  existingImpact.feedback = feedback;
  return {
    ...event,
    rawMeta: {
      ...event.rawMeta,
      impactEvidence: existingImpact,
      independentValidation,
      evaluatorIds: [...evaluatorIds],
      independentValidatorIds: [...validatorIds],
      evaluationCount: evaluatorIds.size,
      liveEvidenceEvents: extraEvents,
      liveEvidenceCount: mine.length,
    },
  };
}

export function mergeEvidenceIntoEvents(
  events: ContributionEvent[],
  records: ContributionEvidenceRecord[],
): ContributionEvent[] {
  if (records.length === 0) return events;
  return events.map((event) => mergeEvidenceIntoEvent(event, records));
}
