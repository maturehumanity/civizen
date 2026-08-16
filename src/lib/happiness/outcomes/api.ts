import { isMissingRelation } from '@/lib/happiness/workspace';
import type { HappinessDomainId } from '@/lib/happiness/types';
import type { WellbeingAggregateResult } from '@/lib/happiness/aggregate/types';
import { supabase } from '@/integrations/supabase/client';
import {
  HUMAN_OUTCOME_COMPARE_VERSION,
  HUMAN_OUTCOME_EVIDENCE_VERSION,
  type EvidenceRole,
  type HumanOutcomeEvidenceRow,
  type HumanOutcomeEvent,
  type HumanOutcomeFactor,
  type HumanOutcomeReview,
  type OutcomeClosedReason,
  type OutcomeFactorKind,
  type PublicOutcomeLesson,
  type SnapshotRecord,
} from './types';

type Client = typeof supabase;

function asReview(row: Record<string, unknown>): HumanOutcomeReview {
  return {
    id: String(row.id),
    scopeId: String(row.scope_id),
    candidateId: row.systemic_issue_candidate_id ? String(row.systemic_issue_candidate_id) : null,
    challengeId: row.challenge_id ? String(row.challenge_id) : null,
    projectId: row.project_id ? String(row.project_id) : null,
    governanceSolutionId: row.governance_solution_id ? String(row.governance_solution_id) : null,
    solutionRecordId: row.solution_record_id ? String(row.solution_record_id) : null,
    createdBy: String(row.created_by),
    targetDomain: row.target_domain as HappinessDomainId,
    targetFactor: row.target_factor ? String(row.target_factor) : null,
    objective: String(row.objective),
    interventionTitle: String(row.intervention_title),
    operationalOutcome: row.operational_outcome ? String(row.operational_outcome) : null,
    interpretation: row.interpretation ? String(row.interpretation) : null,
    uncertaintyNote: row.uncertainty_note ? String(row.uncertainty_note) : null,
    status: row.status as HumanOutcomeReview['status'],
    evidenceStrength: row.evidence_strength as HumanOutcomeReview['evidenceStrength'],
    evidenceModelVersion: String(row.evidence_model_version ?? HUMAN_OUTCOME_EVIDENCE_VERSION),
    comparisonModelVersion: String(row.comparison_model_version ?? HUMAN_OUTCOME_COMPARE_VERSION),
    interventionStartedAt: row.intervention_started_at ? String(row.intervention_started_at) : null,
    nextReviewWindow: (row.next_review_window as HumanOutcomeReview['nextReviewWindow']) ?? null,
    overlappingInterventions: Boolean(row.overlapping_interventions),
    compositionCaveat: Boolean(row.composition_caveat),
    evaluationPlanned: Boolean(row.evaluation_planned),
    researchReference: row.research_reference ? String(row.research_reference) : null,
    publishedPublic: Boolean(row.published_public),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    closedReason: (row.closed_reason as OutcomeClosedReason | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listScopeSnapshotRecords(scopeId: string, client: Client = supabase): Promise<SnapshotRecord[]> {
  const { data, error } = await client
    .from('wellbeing_aggregate_snapshots' as never)
    .select('id, period_start, time_bucket, topic, privacy_policy_version, aggregation_model_version, result')
    .eq('scope_id', scopeId)
    .order('period_start', { ascending: true })
    .limit(64);
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    periodStart: String(row.period_start),
    timeBucket: String(row.time_bucket),
    topic: String(row.topic),
    privacyPolicyVersion: String(row.privacy_policy_version),
    aggregationModelVersion: String(row.aggregation_model_version),
    result: row.result as WellbeingAggregateResult,
  }));
}

export async function listHumanOutcomeReviews(
  filter: { scopeId?: string; candidateId?: string; challengeId?: string; projectId?: string; governanceSolutionId?: string },
  client: Client = supabase,
): Promise<HumanOutcomeReview[]> {
  if (!filter.scopeId && !filter.candidateId && !filter.challengeId && !filter.projectId && !filter.governanceSolutionId) {
    return [];
  }
  let query = client.from('human_outcome_reviews' as never).select('*').order('updated_at', { ascending: false });
  if (filter.scopeId) query = query.eq('scope_id', filter.scopeId);
  if (filter.candidateId) query = query.eq('systemic_issue_candidate_id', filter.candidateId);
  if (filter.challengeId) query = query.eq('challenge_id', filter.challengeId);
  if (filter.projectId) query = query.eq('project_id', filter.projectId);
  if (filter.governanceSolutionId) query = query.eq('governance_solution_id', filter.governanceSolutionId);
  const { data, error } = await query;
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map(asReview);
}

export async function getHumanOutcomeReview(id: string, client: Client = supabase): Promise<HumanOutcomeReview | null> {
  const { data, error } = await client.from('human_outcome_reviews' as never).select('*').eq('id', id).maybeSingle();
  if (error && !isMissingRelation(error)) throw error;
  return data ? asReview(data as Record<string, unknown>) : null;
}

export async function createHumanOutcomeReview(
  input: {
    scopeId: string;
    createdBy: string;
    targetDomain: HappinessDomainId;
    objective: string;
    interventionTitle: string;
    candidateId?: string | null;
    challengeId?: string | null;
    projectId?: string | null;
    governanceSolutionId?: string | null;
    targetFactor?: string | null;
    operationalOutcome?: string | null;
  },
  client: Client = supabase,
): Promise<string> {
  const { data, error } = await client
    .from('human_outcome_reviews' as never)
    .insert({
      scope_id: input.scopeId,
      created_by: input.createdBy,
      target_domain: input.targetDomain,
      target_factor: input.targetFactor ?? null,
      objective: input.objective,
      intervention_title: input.interventionTitle,
      systemic_issue_candidate_id: input.candidateId ?? null,
      challenge_id: input.challengeId ?? null,
      project_id: input.projectId ?? null,
      governance_solution_id: input.governanceSolutionId ?? null,
      operational_outcome: input.operationalOutcome ?? null,
    } as never)
    .select('id')
    .single();
  if (error) throw error;
  await audit(String((data as { id: string }).id), input.createdBy, 'review_created', client);
  return String((data as { id: string }).id);
}

export async function updateHumanOutcomeReview(
  id: string,
  patch: Record<string, unknown>,
  actorId: string,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('human_outcome_reviews' as never).update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', id);
  if (error) throw error;
  await audit(id, actorId, 'review_updated', client);
}

export async function listReviewEvidence(reviewId: string, client: Client = supabase): Promise<HumanOutcomeEvidenceRow[]> {
  const { data, error } = await client
    .from('human_outcome_review_evidence' as never)
    .select('*')
    .eq('review_id', reviewId)
    .order('period_order', { ascending: true });
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    reviewId: String(row.review_id),
    snapshotId: String(row.aggregate_snapshot_id),
    role: row.evidence_role as EvidenceRole,
    periodOrder: Number(row.period_order ?? 0),
  }));
}

export async function addReviewEvidence(
  input: { reviewId: string; snapshotId: string; role: EvidenceRole; periodOrder: number; actorId: string },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('human_outcome_review_evidence' as never).insert({
    review_id: input.reviewId,
    aggregate_snapshot_id: input.snapshotId,
    evidence_role: input.role,
    period_order: input.periodOrder,
  } as never);
  if (error) throw error;
  await audit(input.reviewId, input.actorId, 'evidence_linked', client);
}

export async function listReviewFactors(reviewId: string, client: Client = supabase): Promise<HumanOutcomeFactor[]> {
  const { data, error } = await client.from('human_outcome_review_factors' as never).select('*').eq('review_id', reviewId);
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    reviewId: String(row.review_id),
    kind: row.factor_kind as OutcomeFactorKind,
    note: String(row.note),
  }));
}

export async function addReviewFactor(
  input: { reviewId: string; kind: OutcomeFactorKind; note: string; actorId: string },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('human_outcome_review_factors' as never).insert({
    review_id: input.reviewId,
    factor_kind: input.kind,
    note: input.note,
    created_by: input.actorId,
  } as never);
  if (error) throw error;
  await audit(input.reviewId, input.actorId, 'factor_recorded', client);
}

export async function addReviewEvent(
  input: { reviewId: string; eventType: HumanOutcomeEvent['eventType']; note?: string | null; actorId: string; occurredAt?: string },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('human_outcome_review_events' as never).insert({
    review_id: input.reviewId,
    event_type: input.eventType,
    note: input.note ?? null,
    created_by: input.actorId,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  } as never);
  if (error) throw error;
}

export async function listReviewEvents(reviewId: string, client: Client = supabase): Promise<HumanOutcomeEvent[]> {
  const { data, error } = await client
    .from('human_outcome_review_events' as never)
    .select('*')
    .eq('review_id', reviewId)
    .order('occurred_at', { ascending: true });
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    reviewId: String(row.review_id),
    eventType: row.event_type as HumanOutcomeEvent['eventType'],
    occurredAt: String(row.occurred_at),
    note: row.note ? String(row.note) : null,
  }));
}

export async function listPublicOutcomeLessons(client: Client = supabase): Promise<PublicOutcomeLesson[]> {
  const { data, error } = await client.from('human_outcome_public_lessons' as never).select('*').order('published_at', { ascending: false });
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    reviewId: String(row.review_id),
    solutionRecordId: row.solution_record_id ? String(row.solution_record_id) : null,
    domain: row.domain as HappinessDomainId,
    factorCategory: row.factor_category ? String(row.factor_category) : null,
    interventionCategory: row.intervention_category ? String(row.intervention_category) : null,
    title: String(row.title),
    problem: String(row.problem),
    intervention: String(row.intervention),
    operationalOutcome: String(row.operational_outcome),
    humanOutcome: String(row.human_outcome),
    evidenceStrength: row.evidence_strength as PublicOutcomeLesson['evidenceStrength'],
    status: row.status as PublicOutcomeLesson['status'],
    limitations: String(row.limitations),
    replicationNotes: row.replication_notes ? String(row.replication_notes) : null,
  }));
}

export async function publishPublicOutcomeLesson(
  input: { reviewId: string; actorId: string; lesson: Omit<PublicOutcomeLesson, 'id' | 'reviewId'> },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('human_outcome_public_lessons' as never).insert({
    review_id: input.reviewId,
    solution_record_id: input.lesson.solutionRecordId,
    domain: input.lesson.domain,
    factor_category: input.lesson.factorCategory,
    intervention_category: input.lesson.interventionCategory,
    title: input.lesson.title,
    problem: input.lesson.problem,
    intervention: input.lesson.intervention,
    operational_outcome: input.lesson.operationalOutcome,
    human_outcome: input.lesson.humanOutcome,
    evidence_strength: input.lesson.evidenceStrength,
    status: input.lesson.status,
    limitations: input.lesson.limitations,
    replication_notes: input.lesson.replicationNotes,
    published_by: input.actorId,
  } as never);
  if (error) throw error;
  await updateHumanOutcomeReview(input.reviewId, { published_public: true, solution_record_id: input.lesson.solutionRecordId }, input.actorId, client);
  await audit(input.reviewId, input.actorId, 'lesson_published', client);
}

async function audit(reviewId: string, actorId: string, action: string, client: Client) {
  const { error } = await client.from('human_outcome_review_audit' as never).insert({
    review_id: reviewId,
    actor_profile_id: actorId,
    action,
  } as never);
  if (error && !isMissingRelation(error)) throw error;
}
