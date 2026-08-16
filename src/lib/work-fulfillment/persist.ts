import { supabase } from '@/integrations/supabase/client';
import { recordHappinessAction, selectImprovementArea } from '@/lib/happiness/api';
import { isMissingRelation } from '@/lib/happiness/workspace';
import type { FollowUpTiming } from '@/lib/happiness/types';

import type {
  WorkExploration,
  WorkFitAlignment,
  WorkFollowUp,
  WorkIntervention,
  WorkInterventionStatus,
  WorkJoyFeeling,
  WorkRecommendationFeedbackKind,
  WorkTransitionPath,
} from './types';

type Client = typeof supabase;

function mapExploration(row: Record<string, unknown>): WorkExploration {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    title: String(row.title),
    templateId: (row.template_id as string | null) ?? null,
    whyMayFit: Array.isArray(row.why_may_fit) ? (row.why_may_fit as string[]) : [],
    thingsToExplore: Array.isArray(row.things_to_explore) ? (row.things_to_explore as string[]) : [],
    alignment: row.alignment as WorkFitAlignment,
    occupationNote: (row.occupation_note as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapTransition(row: Record<string, unknown>): WorkTransitionPath {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    target: String(row.target),
    why: (row.why as string | null) ?? null,
    alreadyHave: (row.already_have as string | null) ?? null,
    need: (row.need as string | null) ?? null,
    testPath: (row.test_path as string | null) ?? null,
    studyPath: (row.study_path as string | null) ?? null,
    opportunityPath: (row.opportunity_path as string | null) ?? null,
    nextStep: (row.next_step as string | null) ?? null,
    status: row.status as WorkTransitionPath['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listRecommendationFeedback(
  profileId: string,
  client: Client = supabase,
): Promise<{ recommendationId: string; feedback: WorkRecommendationFeedbackKind }[]> {
  const { data, error } = await client
    .from('work_recommendation_feedback' as never)
    .select('recommendation_id, feedback')
    .eq('profile_id', profileId);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    recommendationId: String(row.recommendation_id),
    feedback: row.feedback as WorkRecommendationFeedbackKind,
  }));
}

export async function saveRecommendationFeedback(
  profileId: string,
  recommendationId: string,
  feedback: WorkRecommendationFeedbackKind,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('work_recommendation_feedback' as never).upsert(
    {
      profile_id: profileId,
      recommendation_id: recommendationId,
      feedback,
    } as never,
    { onConflict: 'profile_id,recommendation_id' },
  );
  if (error) throw error;
}

export async function recordWorkImprovementAction(
  profileId: string,
  input: {
    ladderStep: string;
    area: string;
    desiredChange: string;
    title: string;
    why: string;
    relatedPath?: string | null;
    followUpTiming?: FollowUpTiming;
  },
  client: Client = supabase,
): Promise<WorkIntervention> {
  const selection = await selectImprovementArea(profileId, 'work_fulfillment', client);
  const action = await recordHappinessAction(
    profileId,
    {
      selectionId: selection.id,
      domain: 'work_fulfillment',
      kind: 'work_redesign',
      title: input.title,
      why: input.why,
      relatedPath: input.relatedPath ?? null,
      followUpTiming: input.followUpTiming ?? 'one_week',
    },
    client,
  );
  const { data, error } = await client
    .from('work_interventions' as never)
    .insert({
      profile_id: profileId,
      action_id: action.id,
      ladder_step: input.ladderStep,
      area: input.area,
      desired_change: input.desiredChange,
      status: 'planned',
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    profileId,
    actionId: action.id,
    ladderStep: String(row.ladder_step),
    area: (row.area as string | null) ?? null,
    desiredChange: (row.desired_change as string | null) ?? null,
    status: ((row.status as WorkInterventionStatus | undefined) ?? 'planned'),
    createdAt: String(row.created_at),
  };
}

export async function listWorkInterventions(profileId: string, client: Client = supabase): Promise<WorkIntervention[]> {
  const { data, error } = await client
    .from('work_interventions' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    profileId: String(row.profile_id),
    actionId: (row.action_id as string | null) ?? null,
    ladderStep: String(row.ladder_step),
    area: (row.area as string | null) ?? null,
    desiredChange: (row.desired_change as string | null) ?? null,
    status: ((row.status as WorkInterventionStatus | undefined) ?? 'planned'),
    createdAt: String(row.created_at),
  }));
}

export async function updateWorkInterventionStatus(
  profileId: string,
  interventionId: string,
  status: WorkInterventionStatus,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client
    .from('work_interventions' as never)
    .update({ status } as never)
    .eq('id', interventionId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function saveWorkExploration(
  profileId: string,
  input: Omit<WorkExploration, 'id' | 'profileId' | 'createdAt'>,
  client: Client = supabase,
): Promise<WorkExploration> {
  const { data, error } = await client
    .from('work_explorations' as never)
    .insert({
      profile_id: profileId,
      title: input.title,
      template_id: input.templateId,
      why_may_fit: input.whyMayFit,
      things_to_explore: input.thingsToExplore,
      alignment: input.alignment,
      occupation_note: input.occupationNote,
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return mapExploration(data as Record<string, unknown>);
}

export async function listWorkExplorations(profileId: string, client: Client = supabase): Promise<WorkExploration[]> {
  const { data, error } = await client
    .from('work_explorations' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapExploration);
}

export async function saveWorkTrialLink(
  profileId: string,
  input: { explorationId?: string | null; contributePath: string; opportunityId?: string | null },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('work_trial_links' as never).insert({
    profile_id: profileId,
    exploration_id: input.explorationId ?? null,
    contribute_path: input.contributePath,
    opportunity_id: input.opportunityId ?? null,
  } as never);
  if (error && !isMissingRelation(error)) throw error;
}

export async function saveWorkTransitionPath(
  profileId: string,
  input: Omit<WorkTransitionPath, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & { id?: string },
  client: Client = supabase,
): Promise<WorkTransitionPath> {
  const payload = {
    profile_id: profileId,
    target: input.target.trim(),
    why: input.why?.trim() || null,
    already_have: input.alreadyHave?.trim() || null,
    need: input.need?.trim() || null,
    test_path: input.testPath,
    study_path: input.studyPath,
    opportunity_path: input.opportunityPath,
    next_step: input.nextStep?.trim() || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await client
      .from('work_transition_paths' as never)
      .update(payload as never)
      .eq('id', input.id)
      .eq('profile_id', profileId)
      .select('*')
      .single();
    if (error) throw error;
    return mapTransition(data as Record<string, unknown>);
  }
  const { data, error } = await client.from('work_transition_paths' as never).insert(payload as never).select('*').single();
  if (error) throw error;
  return mapTransition(data as Record<string, unknown>);
}

export async function listWorkTransitionPaths(profileId: string, client: Client = supabase): Promise<WorkTransitionPath[]> {
  const { data, error } = await client
    .from('work_transition_paths' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapTransition);
}

export async function saveWorkFollowUp(
  profileId: string,
  input: {
    transitionPathId?: string | null;
    actionId?: string | null;
    changeKind: string;
    helped?: WorkFollowUp['helped'];
    workJoyFeeling?: WorkJoyFeeling | null;
    note?: string | null;
  },
  client: Client = supabase,
): Promise<WorkFollowUp> {
  const { data, error } = await client
    .from('work_transition_followups' as never)
    .insert({
      profile_id: profileId,
      transition_path_id: input.transitionPathId ?? null,
      action_id: input.actionId ?? null,
      change_kind: input.changeKind,
      helped: input.helped ?? null,
      work_joy_feeling: input.workJoyFeeling ?? null,
      note: input.note?.trim() || null,
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    profileId,
    transitionPathId: (row.transition_path_id as string | null) ?? null,
    actionId: (row.action_id as string | null) ?? null,
    changeKind: String(row.change_kind),
    helped: (row.helped as WorkFollowUp['helped']) ?? null,
    workJoyFeeling: (row.work_joy_feeling as WorkJoyFeeling | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listWorkFollowUps(profileId: string, client: Client = supabase): Promise<WorkFollowUp[]> {
  const { data, error } = await client
    .from('work_transition_followups' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    profileId: String(row.profile_id),
    transitionPathId: (row.transition_path_id as string | null) ?? null,
    actionId: (row.action_id as string | null) ?? null,
    changeKind: String(row.change_kind),
    helped: (row.helped as WorkFollowUp['helped']) ?? null,
    workJoyFeeling: (row.work_joy_feeling as WorkJoyFeeling | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}
