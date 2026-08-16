import { supabase } from '@/integrations/supabase/client';
import { isMissingRelation } from '@/lib/happiness/workspace';
import type { HappinessDomainId, HappinessLevel } from '@/lib/happiness/types';
import { FULFILLMENT_RECOMMENDATION_MODEL } from './types';
import type {
  FactorCertaintyType,
  FactorSourceType,
  FulfillmentPlan,
  FulfillmentPlanBundle,
  FulfillmentPlanFactor,
  FulfillmentPlanOutcome,
  FulfillmentPlanStatus,
  FulfillmentPlanSupport,
  FulfillmentRecommendationFeedback,
  PlanReminderPref,
  RecommendationFeedbackKind,
  SupportType,
} from './types';

type Client = typeof supabase;

function mapPlan(row: Record<string, unknown>): FulfillmentPlan {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    domainKey: row.domain_key as HappinessDomainId,
    title: String(row.title),
    concern: (row.concern as string | null) ?? null,
    desiredOutcome: (row.desired_outcome as string | null) ?? null,
    status: row.status as FulfillmentPlanStatus,
    reminderPref: (row.reminder_pref as PlanReminderPref) ?? 'none',
    followUpAt: (row.follow_up_at as string | null) ?? null,
    workInterventionId: (row.work_intervention_id as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export async function listFulfillmentPlans(profileId: string, client: Client = supabase): Promise<FulfillmentPlan[]> {
  const { data, error } = await client
    .from('fulfillment_plans' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(40);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapPlan);
}

export async function loadFulfillmentPlanBundle(
  profileId: string,
  planId: string,
  client: Client = supabase,
): Promise<FulfillmentPlanBundle | null> {
  const { data, error } = await client
    .from('fulfillment_plans' as never)
    .select('*')
    .eq('id', planId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  if (!data) return null;
  const plan = mapPlan(data as Record<string, unknown>);
  const [factorsRes, supportRes, feedbackRes, outcomesRes] = await Promise.all([
    client.from('fulfillment_plan_factors' as never).select('*').eq('plan_id', planId).eq('profile_id', profileId),
    client.from('fulfillment_plan_support' as never).select('*').eq('plan_id', planId).eq('profile_id', profileId),
    client.from('fulfillment_recommendation_feedback' as never).select('*').eq('profile_id', profileId),
    client.from('fulfillment_plan_outcomes' as never).select('*').eq('plan_id', planId).eq('profile_id', profileId),
  ]);
  const factors: FulfillmentPlanFactor[] = ((factorsRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    planId,
    factorKey: String(row.factor_key),
    certaintyType: row.certainty_type as FactorCertaintyType,
    sourceType: row.source_type as FactorSourceType,
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
  const support: FulfillmentPlanSupport[] = ((supportRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    planId,
    supportKey: String(row.support_key),
    supportType: row.support_type as SupportType,
    path: (row.path as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
  const feedback: FulfillmentRecommendationFeedback[] = ((feedbackRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    planId: (row.plan_id as string | null) ?? null,
    interventionKey: String(row.intervention_key),
    feedback: row.feedback as RecommendationFeedbackKind,
    recommendationModel: String(row.recommendation_model ?? FULFILLMENT_RECOMMENDATION_MODEL),
    createdAt: String(row.created_at),
  }));
  const outcomes: FulfillmentPlanOutcome[] = ((outcomesRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    planId,
    qualitativeState: String(row.qualitative_state),
    summaryNote: (row.summary_note as string | null) ?? null,
    helped: (row.helped as FulfillmentPlanOutcome['helped']) ?? null,
    createdAt: String(row.created_at),
  }));
  return { plan, factors, support, feedback, outcomes };
}

export async function createFulfillmentPlan(
  profileId: string,
  input: {
    domainKey: HappinessDomainId;
    title: string;
    concern?: string | null;
    desiredOutcome?: string | null;
    reminderPref?: PlanReminderPref;
    followUpAt?: string | null;
  },
  client: Client = supabase,
): Promise<FulfillmentPlan> {
  const { data, error } = await client
    .from('fulfillment_plans' as never)
    .insert({
      profile_id: profileId,
      domain_key: input.domainKey,
      title: input.title.trim(),
      concern: input.concern?.trim() || null,
      desired_outcome: input.desiredOutcome?.trim() || null,
      status: 'exploring',
      reminder_pref: input.reminderPref ?? 'none',
      follow_up_at: input.followUpAt ?? null,
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return mapPlan(data as Record<string, unknown>);
}

export async function updateFulfillmentPlanStatus(
  profileId: string,
  planId: string,
  status: FulfillmentPlanStatus,
  client: Client = supabase,
): Promise<void> {
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    completed_at: status === 'completed' || status === 'stopped' ? new Date().toISOString() : null,
  };
  const { error } = await client.from('fulfillment_plans' as never).update(payload as never).eq('id', planId).eq('profile_id', profileId);
  if (error) throw error;
}

export async function savePlanFactor(
  profileId: string,
  planId: string,
  input: { factorKey: string; certaintyType: FactorCertaintyType; sourceType: FactorSourceType; note?: string | null },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('fulfillment_plan_factors' as never).insert({
    profile_id: profileId,
    plan_id: planId,
    factor_key: input.factorKey,
    certainty_type: input.certaintyType,
    source_type: input.sourceType,
    note: input.note?.trim() || null,
  } as never);
  if (error) throw error;
}

export async function savePlanSupport(
  profileId: string,
  planId: string,
  input: { supportKey: string; supportType: SupportType; path?: string | null; note?: string | null },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('fulfillment_plan_support' as never).insert({
    profile_id: profileId,
    plan_id: planId,
    support_key: input.supportKey,
    support_type: input.supportType,
    path: input.path ?? null,
    note: input.note?.trim() || null,
  } as never);
  if (error) throw error;
}

export async function saveRecommendationFeedback(
  profileId: string,
  input: { interventionKey: string; feedback: RecommendationFeedbackKind; planId?: string | null },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('fulfillment_recommendation_feedback' as never).upsert(
    {
      profile_id: profileId,
      plan_id: input.planId ?? null,
      intervention_key: input.interventionKey,
      feedback: input.feedback,
      recommendation_model: FULFILLMENT_RECOMMENDATION_MODEL,
    } as never,
    { onConflict: 'profile_id,intervention_key,feedback' },
  );
  if (error) throw error;
}

export async function savePlanOutcome(
  profileId: string,
  planId: string,
  input: { qualitativeState: string; summaryNote?: string | null; helped?: FulfillmentPlanOutcome['helped'] },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('fulfillment_plan_outcomes' as never).insert({
    profile_id: profileId,
    plan_id: planId,
    qualitative_state: input.qualitativeState,
    summary_note: input.summaryNote?.trim() || null,
    helped: input.helped ?? null,
  } as never);
  if (error) throw error;
}

export async function updateFulfillmentPlan(
  profileId: string,
  planId: string,
  patch: { desiredOutcome?: string | null; reminderPref?: PlanReminderPref; followUpAt?: string | null; concern?: string | null },
  client: Client = supabase,
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.desiredOutcome !== undefined) payload.desired_outcome = patch.desiredOutcome?.trim() || null;
  if (patch.concern !== undefined) payload.concern = patch.concern?.trim() || null;
  if (patch.reminderPref !== undefined) payload.reminder_pref = patch.reminderPref;
  if (patch.followUpAt !== undefined) payload.follow_up_at = patch.followUpAt;
  const { error } = await client.from('fulfillment_plans' as never).update(payload as never).eq('id', planId).eq('profile_id', profileId);
  if (error) throw error;
}

export async function listRecommendationFeedback(
  profileId: string,
  client: Client = supabase,
): Promise<FulfillmentRecommendationFeedback[]> {
  const { data, error } = await client
    .from('fulfillment_recommendation_feedback' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    planId: (row.plan_id as string | null) ?? null,
    interventionKey: String(row.intervention_key),
    feedback: row.feedback as RecommendationFeedbackKind,
    recommendationModel: String(row.recommendation_model ?? FULFILLMENT_RECOMMENDATION_MODEL),
    createdAt: String(row.created_at),
  }));
}

export async function loadDomainLevelHistory(
  profileId: string,
  client: Client = supabase,
): Promise<{ computedAt: string; domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>> }[]> {
  const { data, error } = await client
    .from('happiness_state_snapshots' as never)
    .select('domain_levels, computed_at')
    .eq('profile_id', profileId)
    .order('computed_at', { ascending: true })
    .limit(24);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    computedAt: String(row.computed_at),
    domainLevels: (row.domain_levels as Partial<Record<HappinessDomainId, HappinessLevel>> | null) ?? {},
  }));
}

export const FULFILLMENT_PLAN_CHILD_TABLES = [
  'fulfillment_plan_outcomes',
  'fulfillment_plan_support',
  'fulfillment_plan_interventions',
  'fulfillment_plan_factors',
] as const;

export async function deleteFulfillmentPlan(profileId: string, planId: string, client: Client = supabase): Promise<void> {
  const { data: actions, error: actionError } = await client
    .from('happiness_actions' as never)
    .select('id')
    .eq('profile_id', profileId)
    .eq('plan_id', planId);
  if (actionError && !isMissingRelation(actionError)) throw actionError;
  const actionIds = ((actions as { id?: string }[] | null) ?? []).map((row) => String(row.id));
  if (actionIds.length) {
    const outcomeError = (
      await client.from('happiness_action_outcomes' as never).delete().eq('profile_id', profileId).in('action_id', actionIds)
    ).error;
    if (outcomeError && !isMissingRelation(outcomeError)) throw outcomeError;
    const deleteActionsError = (
      await client.from('happiness_actions' as never).delete().eq('profile_id', profileId).in('id', actionIds)
    ).error;
    if (deleteActionsError && !isMissingRelation(deleteActionsError)) throw deleteActionsError;
  }
  const feedbackError = (
    await client.from('fulfillment_recommendation_feedback' as never).delete().eq('profile_id', profileId).eq('plan_id', planId)
  ).error;
  if (feedbackError && !isMissingRelation(feedbackError)) throw feedbackError;
  for (const table of FULFILLMENT_PLAN_CHILD_TABLES) {
    const { error } = await client.from(table as never).delete().eq('profile_id', profileId).eq('plan_id', planId);
    if (error && !isMissingRelation(error)) throw error;
  }
  const { error } = await client.from('fulfillment_plans' as never).delete().eq('id', planId).eq('profile_id', profileId);
  if (error) throw error;
}

export async function linkPlanIntervention(
  profileId: string,
  planId: string,
  input: { interventionKey: string; libraryVersion: string; actionId?: string | null; whyShown?: string | null },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('fulfillment_plan_interventions' as never).insert({
    profile_id: profileId,
    plan_id: planId,
    intervention_key: input.interventionKey,
    library_version: input.libraryVersion,
    recommendation_model: FULFILLMENT_RECOMMENDATION_MODEL,
    action_id: input.actionId ?? null,
    why_shown: input.whyShown ?? null,
  } as never);
  if (error) throw error;
}
