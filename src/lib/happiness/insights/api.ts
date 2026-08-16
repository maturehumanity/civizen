import { listBrowsableChallenges } from '@/lib/challenges-api';
import { listSolutionProblems } from '@/lib/solutions-api';
import { isMissingRelation } from '@/lib/happiness/workspace';
import { requestWellbeingAggregate } from '@/lib/happiness/aggregate/api';
import { supabase } from '@/integrations/supabase/client';
import {
  SYSTEMIC_PATTERN_MODEL_VERSION,
  type QualifyingScope,
  type WellbeingAggregateResult,
} from '@/lib/happiness/aggregate/types';
import type { ExistingEffort, InsightActionType, InsightLinkEntity, StoredSystemicCandidate } from './types';

type Client = typeof supabase;

function asScope(row: Record<string, unknown>): QualifyingScope {
  return {
    id: String(row.id),
    kind: row.kind as QualifyingScope['kind'],
    enabled: Boolean(row.enabled),
    viewerProfileIds: Array.isArray(row.viewer_profile_ids) ? (row.viewer_profile_ids as string[]) : [],
    label: row.label ? String(row.label) : undefined,
  };
}

export async function listViewableInsightScopes(client: Client = supabase): Promise<QualifyingScope[]> {
  const { data, error } = await client.from('wellbeing_aggregate_scopes' as never).select('*');
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map(asScope);
}

export async function listScopeSnapshots(
  scopeId: string,
  client: Client = supabase,
): Promise<WellbeingAggregateResult[]> {
  const { data, error } = await client
    .from('wellbeing_aggregate_snapshots' as never)
    .select('result')
    .eq('scope_id', scopeId)
    .order('created_at', { ascending: false })
    .limit(48);
  if (error && !isMissingRelation(error)) throw error;
  return ((data as { result: WellbeingAggregateResult }[] | null) ?? []).map((row) => row.result);
}

export async function listScopeCandidates(
  scopeId: string,
  client: Client = supabase,
): Promise<StoredSystemicCandidate[]> {
  const { data, error } = await client
    .from('systemic_issue_candidates' as never)
    .select('*')
    .eq('scope_id', scopeId);
  if (error && !isMissingRelation(error)) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    scopeId: String(row.scope_id),
    domain: row.domain as StoredSystemicCandidate['domain'],
    factorCategory: row.factor_category ? String(row.factor_category) : null,
    status: row.status as StoredSystemicCandidate['status'],
    evidencePeriods: Number(row.evidence_periods ?? 0),
    summary: String(row.summary),
    privacyPolicyVersion: String(row.privacy_policy_version),
    patternModelVersion: String(row.pattern_model_version ?? SYSTEMIC_PATTERN_MODEL_VERSION),
    publishesChallenge: false,
    publishesGovernance: false,
  }));
}

export async function recordInsightAction(
  input: {
    scopeId: string;
    candidateId?: string | null;
    actionType: InsightActionType;
    relatedEntityType?: InsightLinkEntity | null;
    relatedEntityId?: string | null;
    createdBy: string;
  },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('wellbeing_insight_actions' as never).insert({
    scope_id: input.scopeId,
    candidate_id: input.candidateId ?? null,
    action_type: input.actionType,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
    created_by: input.createdBy,
  } as never);
  if (error && !isMissingRelation(error)) throw error;
}

export async function linkInsightEffort(
  input: {
    candidateId: string;
    entityType: InsightLinkEntity;
    entityId: string;
    createdBy: string;
  },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('wellbeing_insight_links' as never).insert({
    candidate_id: input.candidateId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    created_by: input.createdBy,
  } as never);
  if (error && !isMissingRelation(error)) throw error;
}

export async function listBrowsableEfforts(): Promise<ExistingEffort[]> {
  const [challenges, problems] = await Promise.all([
    listBrowsableChallenges().catch(() => []),
    listSolutionProblems().then((result) => result.problems).catch(() => []),
  ]);
  return [
    ...challenges.map((row) => ({
      entityType: 'challenge' as const,
      entityId: row.id,
      title: row.title,
      path: `/contribute/challenges/${row.id}`,
    })),
    ...problems.map((row) => ({
      entityType: 'governance_solution' as const,
      entityId: row.id,
      title: row.title,
      path: `/governance/solutions/${row.id}`,
    })),
  ];
}

export { requestWellbeingAggregate };
