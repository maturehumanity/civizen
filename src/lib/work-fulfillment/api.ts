import { supabase } from '@/integrations/supabase/client';
import { isMissingRelation } from '@/lib/happiness/workspace';

import { emptyShareablePreferences, emptyWorkEnjoyment, WORK_ASSESSMENT_MODEL, WORK_JOY_MODEL } from './types';
import type {
  WorkAssessment,
  WorkContext,
  WorkExploration,
  WorkFollowUp,
  WorkFulfillmentProfile,
  WorkIntervention,
  WorkJoyEntry,
  WorkJoyFeeling,
  WorkRecommendationFeedbackKind,
  WorkShareablePreferences,
  WorkTransitionPath,
} from './types';

export { WORK_FULFILLMENT_PHASE } from './types';

type Client = typeof supabase;

function mapProfile(row: Record<string, unknown> | null): WorkFulfillmentProfile | null {
  if (!row) return null;
  const enjoyment = (row.enjoyment as WorkFulfillmentProfile['enjoyment']) ?? emptyWorkEnjoyment();
  return {
    profileId: String(row.profile_id),
    currentRoleNote: (row.current_role_note as string | null) ?? null,
    enjoyment: {
      enjoyedActivities: enjoyment.enjoyedActivities ?? [],
      enjoyedTasks: enjoyment.enjoyedTasks ?? [],
      dislikedActivities: enjoyment.dislikedActivities ?? [],
      drainingTasks: enjoyment.drainingTasks ?? [],
    },
    values: Array.isArray(row.values) ? (row.values as WorkFulfillmentProfile['values']) : [],
    environment: (row.environment_preferences as WorkFulfillmentProfile['environment']) ?? {},
    autonomy: (row.autonomy as WorkFulfillmentProfile['autonomy']) ?? {},
    lifestyle: (row.lifestyle_fit as WorkFulfillmentProfile['lifestyle']) ?? {},
    purposeFit: (row.purpose_fit as WorkFulfillmentProfile['purposeFit']) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapWorkContext(row: Record<string, unknown>): WorkContext {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    roleTitle: String(row.role_title),
    organizationOrContext: (row.organization_or_context as string | null) ?? null,
    workType: row.work_type as WorkContext['workType'],
    startDate: (row.start_date as string | null) ?? null,
    hoursPattern: (row.hours_pattern as string | null) ?? null,
    locationMode: (row.location_mode as WorkContext['locationMode']) ?? null,
    isPrimary: Boolean(row.is_primary),
    description: (row.description as string | null) ?? null,
    status: row.status as WorkContext['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapWorkJoy(row: Record<string, unknown>): WorkJoyEntry {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    feeling: row.feeling as WorkJoyFeeling,
    activity: (row.activity as string | null) ?? null,
    taskTag: (row.task_tag as string | null) ?? null,
    project: (row.project as string | null) ?? null,
    context: (row.context_note as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    workContextId: (row.work_context_id as string | null) ?? null,
    activityTags: Array.isArray(row.activity_tags) ? (row.activity_tags as string[]) : [],
    modelVersion: String(row.model_version ?? WORK_JOY_MODEL),
    createdAt: String(row.created_at),
  };
}

export function mapWorkAssessment(row: Record<string, unknown>): WorkAssessment {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    workContextId: (row.work_context_id as string | null) ?? null,
    modelVersion: String(row.model_version ?? WORK_ASSESSMENT_MODEL),
    dimensions: (row.dimensions as WorkAssessment['dimensions']) ?? {},
    createdAt: String(row.created_at),
  };
}

export async function loadWorkFulfillmentProfile(
  profileId: string,
  client: Client = supabase,
): Promise<WorkFulfillmentProfile | null> {
  const { data, error } = await client
    .from('work_fulfillment_profiles' as never)
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return mapProfile((data as Record<string, unknown> | null) ?? null);
}

export async function ensureWorkFulfillmentProfile(
  profileId: string,
  client: Client = supabase,
): Promise<WorkFulfillmentProfile> {
  const existing = await loadWorkFulfillmentProfile(profileId, client);
  if (existing) return existing;
  const { data, error } = await client
    .from('work_fulfillment_profiles' as never)
    .insert({
      profile_id: profileId,
      enjoyment: emptyWorkEnjoyment(),
      values: [],
      environment_preferences: {},
      autonomy: {},
      lifestyle_fit: {},
      purpose_fit: {},
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(data as Record<string, unknown>)!;
}

export async function saveWorkFulfillmentProfile(
  profile: WorkFulfillmentProfile,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('work_fulfillment_profiles' as never).upsert(
    {
      profile_id: profile.profileId,
      current_role_note: profile.currentRoleNote,
      enjoyment: profile.enjoyment,
      values: profile.values,
      environment_preferences: profile.environment,
      autonomy: profile.autonomy,
      lifestyle_fit: profile.lifestyle,
      purpose_fit: profile.purposeFit,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'profile_id' },
  );
  if (error) throw error;
}

export async function listWorkContexts(profileId: string, client: Client = supabase): Promise<WorkContext[]> {
  const { data, error } = await client
    .from('work_contexts' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapWorkContext);
}

export async function saveWorkContext(
  profileId: string,
  input: Omit<WorkContext, 'id' | 'profileId' | 'createdAt' | 'updatedAt'> & { id?: string },
  client: Client = supabase,
): Promise<WorkContext> {
  if (input.isPrimary) {
    await client.from('work_contexts' as never).update({ is_primary: false } as never).eq('profile_id', profileId);
  }
  const payload = {
    profile_id: profileId,
    role_title: input.roleTitle.trim(),
    organization_or_context: input.organizationOrContext?.trim() || null,
    work_type: input.workType,
    start_date: input.startDate || null,
    hours_pattern: input.hoursPattern?.trim() || null,
    location_mode: input.locationMode,
    is_primary: input.isPrimary,
    description: input.description?.trim() || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await client
      .from('work_contexts' as never)
      .update(payload as never)
      .eq('id', input.id)
      .eq('profile_id', profileId)
      .select('*')
      .single();
    if (error) throw error;
    return mapWorkContext(data as Record<string, unknown>);
  }
  const { data, error } = await client.from('work_contexts' as never).insert(payload as never).select('*').single();
  if (error) throw error;
  return mapWorkContext(data as Record<string, unknown>);
}

export async function listWorkJoyEntries(profileId: string, client: Client = supabase): Promise<WorkJoyEntry[]> {
  const { data, error } = await client
    .from('work_joy_entries' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw error;
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapWorkJoy);
}

export async function saveWorkJoyEntry(
  profileId: string,
  input: {
    feeling: WorkJoyFeeling;
    activity?: string | null;
    taskTag?: string | null;
    project?: string | null;
    context?: string | null;
    note?: string | null;
    workContextId?: string | null;
    activityTags?: string[];
  },
  client: Client = supabase,
): Promise<WorkJoyEntry> {
  const { data, error } = await client
    .from('work_joy_entries' as never)
    .insert({
      profile_id: profileId,
      feeling: input.feeling,
      activity: input.activity?.trim() || null,
      task_tag: input.taskTag?.trim() || null,
      project: input.project?.trim() || null,
      context_note: input.context?.trim() || null,
      note: input.note?.trim() || null,
      work_context_id: input.workContextId ?? null,
      activity_tags: input.activityTags ?? [],
      model_version: WORK_JOY_MODEL,
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return mapWorkJoy(data as Record<string, unknown>);
}

export async function listWorkAssessments(profileId: string, client: Client = supabase): Promise<WorkAssessment[]> {
  const { data, error } = await client
    .from('work_assessments' as never)
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapWorkAssessment);
}

export async function saveWorkAssessment(
  profileId: string,
  input: { workContextId?: string | null; dimensions: WorkAssessment['dimensions'] },
  client: Client = supabase,
): Promise<WorkAssessment> {
  const { data, error } = await client
    .from('work_assessments' as never)
    .insert({
      profile_id: profileId,
      work_context_id: input.workContextId ?? null,
      model_version: WORK_ASSESSMENT_MODEL,
      dimensions: input.dimensions,
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return mapWorkAssessment(data as Record<string, unknown>);
}

export async function loadShareablePreferences(
  profileId: string,
  client: Client = supabase,
): Promise<WorkShareablePreferences> {
  const { data, error } = await client
    .from('work_shareable_preferences' as never)
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return emptyShareablePreferences(profileId);
    throw error;
  }
  if (!data) return emptyShareablePreferences(profileId);
  const row = data as Record<string, unknown>;
  return {
    profileId,
    approved: Boolean(row.approved),
    activitiesSought: Array.isArray(row.activities_sought) ? (row.activities_sought as string[]) : [],
    roleTypesSought: Array.isArray(row.role_types_sought) ? (row.role_types_sought as string[]) : [],
    environment: (row.environment as WorkShareablePreferences['environment']) ?? {},
    locationMode: (row.location_mode as WorkShareablePreferences['locationMode']) ?? null,
    scheduleNote: (row.schedule_note as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

export async function saveShareablePreferences(
  prefs: WorkShareablePreferences,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('work_shareable_preferences' as never).upsert(
    {
      profile_id: prefs.profileId,
      approved: prefs.approved,
      activities_sought: prefs.activitiesSought,
      role_types_sought: prefs.roleTypesSought,
      environment: prefs.environment,
      location_mode: prefs.locationMode,
      schedule_note: prefs.scheduleNote,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'profile_id' },
  );
  if (error) throw error;
}

export type { WorkExploration, WorkFollowUp, WorkIntervention, WorkTransitionPath, WorkRecommendationFeedbackKind };
