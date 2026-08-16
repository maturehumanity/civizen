import { supabase } from '@/integrations/supabase/client';
import { ensureWorkFulfillmentProfile } from '@/lib/work-fulfillment/api';

import { AFFECTING_TO_CAUSE_GROUP, AFFECTING_TO_DOMAIN, isoMonthStart, isoWeekStart } from './domains';
import { civizenDomainReviewInstrument } from './instruments';
import { followUpAtFromTiming } from './recommendations';
import type {
  ActionOutcomeRating,
  AffectingCategory,
  AssessmentInstrument,
  CheckInFeeling,
  FollowUpTiming,
  HappinessAction,
  HappinessActionStatus,
  HappinessCause,
  HappinessCauseGroup,
  HappinessCheckIn,
  HappinessDomainId,
  HappinessImprovementSelection,
  HappinessLevel,
  HappinessMonthlyReview,
  HappinessPrivacySettings,
  HappinessWeeklyPulse,
  RecommendationKind,
} from './types';
import { isMissingRelation, mapAction, mapCheckIn, mapPulse, mapReview } from './workspace';

export type { HappinessLoadResult } from './workspace';
export { loadHappinessWorkspace } from './workspace';

type Client = typeof supabase;

export async function ensureHappinessPrivacy(
  profileId: string,
  client: Client = supabase,
): Promise<HappinessPrivacySettings> {
  const { data, error } = await client
    .from('happiness_privacy_settings' as never)
    .upsert(
      {
        profile_id: profileId,
        checkins_enabled: true,
        recommendations_enabled: true,
        optional_sharing_enabled: false,
      } as never,
      { onConflict: 'profile_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  return {
    profileId,
    checkinsEnabled: row.checkins_enabled !== false,
    recommendationsEnabled: row.recommendations_enabled !== false,
    optionalSharingEnabled: Boolean(row.optional_sharing_enabled),
    updatedAt: String(row.updated_at),
  };
}

export async function saveHappinessPrivacy(
  profileId: string,
  next: Pick<HappinessPrivacySettings, 'checkinsEnabled' | 'recommendationsEnabled' | 'optionalSharingEnabled'>,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('happiness_privacy_settings' as never).upsert(
    {
      profile_id: profileId,
      checkins_enabled: next.checkinsEnabled,
      recommendations_enabled: next.recommendationsEnabled,
      optional_sharing_enabled: next.optionalSharingEnabled,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'profile_id' },
  );
  if (error) throw error;
}

export async function saveQuickCheckIn(
  profileId: string,
  input: { feeling: CheckInFeeling; affectingMost?: AffectingCategory | null; note?: string | null },
  client: Client = supabase,
): Promise<HappinessCheckIn> {
  const { data, error } = await client
    .from('happiness_checkins' as never)
    .insert({
      profile_id: profileId,
      feeling: input.feeling,
      affecting_most: input.affectingMost ?? null,
      note: input.note?.trim() || null,
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  const checkIn = mapCheckIn(data as Record<string, unknown>);
  if (input.affectingMost && input.affectingMost !== 'something_else') {
    await client.from('happiness_causes' as never).insert({
      profile_id: profileId,
      source_kind: 'checkin',
      source_id: checkIn.id,
      domain: AFFECTING_TO_DOMAIN[input.affectingMost] ?? null,
      cause_group: AFFECTING_TO_CAUSE_GROUP[input.affectingMost] ?? 'purpose',
      category: input.affectingMost,
      confirmed: true,
      is_ai_suggestion: false,
    } as never);
  }
  return checkIn;
}

export async function saveWeeklyPulse(
  profileId: string,
  domainAnswers: Partial<Record<HappinessDomainId, HappinessLevel>>,
  client: Client = supabase,
): Promise<HappinessWeeklyPulse> {
  const { data, error } = await client
    .from('happiness_weekly_pulses' as never)
    .upsert(
      {
        profile_id: profileId,
        week_start: isoWeekStart(),
        domain_answers: domainAnswers,
      } as never,
      { onConflict: 'profile_id,week_start' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapPulse(data as Record<string, unknown>);
}

export async function saveMonthlyReview(
  profileId: string,
  input: {
    domainAnswers: Partial<Record<HappinessDomainId, HappinessLevel>>;
    wantsHelp: boolean;
    helpAreas: HappinessDomainId[];
  },
  client: Client = supabase,
): Promise<HappinessMonthlyReview> {
  const { data, error } = await client
    .from('happiness_monthly_reviews' as never)
    .upsert(
      {
        profile_id: profileId,
        month_start: isoMonthStart(),
        domain_answers: input.domainAnswers,
        wants_help: input.wantsHelp,
        help_areas: input.helpAreas,
        instrument_slug: 'civizen-domain-review-v1',
      } as never,
      { onConflict: 'profile_id,month_start' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapReview(data as Record<string, unknown>);
}

export async function saveHappinessCause(
  profileId: string,
  input: {
    sourceKind: HappinessCause['sourceKind'];
    sourceId?: string | null;
    domain?: HappinessDomainId | null;
    group: HappinessCauseGroup;
    category: string;
    note?: string | null;
  },
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('happiness_causes' as never).insert({
    profile_id: profileId,
    source_kind: input.sourceKind,
    source_id: input.sourceId ?? null,
    domain: input.domain ?? null,
    cause_group: input.group,
    category: input.category,
    confirmed: true,
    is_ai_suggestion: false,
    note: input.note?.trim() || null,
  } as never);
  if (error) throw error;
}

export async function selectImprovementArea(
  profileId: string,
  domain: HappinessDomainId,
  client: Client = supabase,
): Promise<HappinessImprovementSelection> {
  await client
    .from('happiness_improvement_selections' as never)
    .update({ status: 'paused' } as never)
    .eq('profile_id', profileId)
    .eq('status', 'active');
  const { data, error } = await client
    .from('happiness_improvement_selections' as never)
    .insert({
      profile_id: profileId,
      domain,
      status: 'active',
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    profileId,
    domain,
    status: 'active',
    createdAt: String(row.created_at),
  };
}

export async function recordHappinessAction(
  profileId: string,
  input: {
    selectionId?: string | null;
    planId?: string | null;
    domain: HappinessDomainId;
    kind: RecommendationKind;
    title: string;
    why: string;
    relatedPath?: string | null;
    followUpTiming: FollowUpTiming;
    interventionKey?: string | null;
    libraryVersion?: string | null;
    recommendationModel?: string | null;
    status?: HappinessActionStatus;
  },
  client: Client = supabase,
): Promise<HappinessAction> {
  const { data, error } = await client
    .from('happiness_actions' as never)
    .insert({
      profile_id: profileId,
      selection_id: input.selectionId ?? null,
      plan_id: input.planId ?? null,
      domain: input.domain,
      kind: input.kind,
      title: input.title,
      why: input.why,
      related_path: input.relatedPath ?? null,
      follow_up_at: followUpAtFromTiming(input.followUpTiming),
      intervention_key: input.interventionKey ?? null,
      library_version: input.libraryVersion ?? null,
      recommendation_model: input.recommendationModel ?? null,
      status: input.status ?? 'planned',
    } as never)
    .select('*')
    .single();
  if (error) throw error;
  return mapAction(data as Record<string, unknown>);
}

export async function updateHappinessActionStatus(
  profileId: string,
  actionId: string,
  status: HappinessActionStatus,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client
    .from('happiness_actions' as never)
    .update({ status } as never)
    .eq('id', actionId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function dismissHappinessAction(
  actionId: string,
  reason: 'dismissed' | 'not_relevant',
  client: Client = supabase,
): Promise<void> {
  const { error } = await client
    .from('happiness_actions' as never)
    .update({
      dismissed: reason === 'dismissed',
      not_relevant: reason === 'not_relevant',
    } as never)
    .eq('id', actionId);
  if (error) throw error;
}

export async function recordActionOutcome(
  profileId: string,
  actionId: string,
  helped: ActionOutcomeRating,
  comment?: string | null,
  client: Client = supabase,
): Promise<void> {
  const { error } = await client.from('happiness_action_outcomes' as never).insert({
    profile_id: profileId,
    action_id: actionId,
    helped,
    comment: comment?.trim() || null,
  } as never);
  if (error) throw error;
  const { data: action } = await client
    .from('happiness_actions' as never)
    .select('selection_id, plan_id')
    .eq('id', actionId)
    .maybeSingle();
  const row = action as { selection_id?: string | null; plan_id?: string | null } | null;
  if (row?.selection_id && !row.plan_id) {
    await client
      .from('happiness_improvement_selections' as never)
      .update({ status: 'completed', updated_at: new Date().toISOString() } as never)
      .eq('id', row.selection_id)
      .eq('profile_id', profileId);
  }
}

export async function deleteHappinessCheckIn(profileId: string, checkInId: string, client: Client = supabase): Promise<void> {
  const { error } = await client
    .from('happiness_checkins' as never)
    .delete()
    .eq('id', checkInId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function deleteAllHappinessData(profileId: string, client: Client = supabase): Promise<void> {
  const tables = [
    'fulfillment_recommendation_feedback',
    'fulfillment_plan_outcomes',
    'fulfillment_plan_support',
    'fulfillment_plan_interventions',
    'fulfillment_plan_factors',
    'happiness_action_outcomes',
    'happiness_actions',
    'fulfillment_plans',
    'happiness_improvement_selections',
    'happiness_causes',
    'happiness_assessment_responses',
    'happiness_state_snapshots',
    'happiness_monthly_reviews',
    'happiness_weekly_pulses',
    'happiness_checkins',
    'work_transition_followups',
    'work_trial_links',
    'work_explorations',
    'work_interventions',
    'work_recommendation_feedback',
    'work_assessments',
    'work_joy_entries',
    'work_shareable_preferences',
    'work_contexts',
    'work_transition_paths',
    'work_fulfillment_profiles',
    'happiness_privacy_settings',
    'wellbeing_aggregate_participation',
  ];
  for (const table of tables) {
    const { error } = await client.from(table as never).delete().eq('profile_id', profileId);
    if (error && !isMissingRelation(error)) throw error;
  }
}

export async function listAssessmentInstruments(client: Client = supabase): Promise<AssessmentInstrument[]> {
  const { data, error } = await client
    .from('happiness_assessment_instruments' as never)
    .select('*')
    .order('slug');
  if (error) {
    if (isMissingRelation(error)) return [{ id: 'local', ...civizenDomainReviewInstrument() }];
    throw error;
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    version: String(row.version),
    publisher: (row.publisher as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
    license: (row.license as string | null) ?? null,
    language: String(row.language ?? 'en'),
    allowedUse: String(row.allowed_use ?? ''),
    questions: Array.isArray(row.questions) ? (row.questions as AssessmentInstrument['questions']) : [],
    scoringLogic: (row.scoring_logic as Record<string, unknown>) ?? {},
    interpretationRules: (row.interpretation_rules as Record<string, unknown>) ?? {},
    references: Array.isArray(row.instrument_references) ? row.instrument_references : null,
  }));
}

export async function prepareHappinessArchitecture(profileId: string, client: Client = supabase): Promise<void> {
  await ensureHappinessPrivacy(profileId, client);
  await ensureWorkFulfillmentProfile(profileId, client);
}
