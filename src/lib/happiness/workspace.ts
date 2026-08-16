import { supabase } from '@/integrations/supabase/client';

import { parseCheckInAreas } from './causes';
import { deriveHappinessView, emptyHappinessView } from './model';
import { DEFAULT_HAPPINESS_PRIVACY } from './privacy';
import { HAPPINESS_LEVELS, HAPPINESS_MODEL_VERSION, HAPPINESS_TRENDS, type HappinessLevel, type HappinessTrend } from './types';
import type {
  ActionOutcomeRating,
  AffectingCategory,
  CheckInFeeling,
  HappinessAction,
  HappinessCause,
  HappinessCauseGroup,
  HappinessCheckIn,
  HappinessDomainId,
  HappinessImprovementSelection,
  HappinessMonthlyReview,
  HappinessPrivacySettings,
  HappinessPublicView,
  HappinessWeeklyPulse,
} from './types';

type Client = typeof supabase;

export function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? '';
  return error.code === '42P01' || /does not exist|schema cache/i.test(message);
}

export function mapCheckIn(row: Record<string, unknown>): HappinessCheckIn {
  const affectingMost = (row.affecting_most as AffectingCategory | null) ?? null;
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    feeling: row.feeling as CheckInFeeling,
    affectingMost,
    areas: parseCheckInAreas(row.areas, affectingMost),
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function mapPulse(row: Record<string, unknown>): HappinessWeeklyPulse {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    weekStart: String(row.week_start),
    domainAnswers: (row.domain_answers as HappinessWeeklyPulse['domainAnswers']) ?? {},
    createdAt: String(row.created_at),
  };
}

export function mapReview(row: Record<string, unknown>): HappinessMonthlyReview {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    monthStart: String(row.month_start),
    domainAnswers: (row.domain_answers as HappinessMonthlyReview['domainAnswers']) ?? {},
    wantsHelp: Boolean(row.wants_help),
    helpAreas: Array.isArray(row.help_areas) ? (row.help_areas as HappinessDomainId[]) : [],
    createdAt: String(row.created_at),
  };
}

export function mapAction(row: Record<string, unknown>): HappinessAction {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    selectionId: (row.selection_id as string | null) ?? null,
    planId: (row.plan_id as string | null) ?? null,
    domain: row.domain as HappinessDomainId,
    kind: row.kind as HappinessAction['kind'],
    title: String(row.title),
    why: String(row.why),
    relatedPath: (row.related_path as string | null) ?? null,
    dismissed: Boolean(row.dismissed),
    notRelevant: Boolean(row.not_relevant),
    followUpAt: (row.follow_up_at as string | null) ?? null,
    status: (row.status as HappinessAction['status']) ?? 'planned',
    interventionKey: (row.intervention_key as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapCause(row: Record<string, unknown>): HappinessCause {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    sourceKind: row.source_kind as HappinessCause['sourceKind'],
    sourceId: (row.source_id as string | null) ?? null,
    domain: (row.domain as HappinessDomainId | null) ?? null,
    group: row.cause_group as HappinessCauseGroup,
    category: String(row.category),
    polarity: row.polarity === 'support' ? 'support' : 'problem',
    confirmed: Boolean(row.confirmed),
    isAiSuggestion: Boolean(row.is_ai_suggestion),
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export type HappinessLoadResult = {
  view: HappinessPublicView;
  privacy: HappinessPrivacySettings;
  checkIns: HappinessCheckIn[];
  pulses: HappinessWeeklyPulse[];
  reviews: HappinessMonthlyReview[];
  causes: HappinessCause[];
  actions: HappinessAction[];
  outcomes: { id: string; actionId: string; helped: ActionOutcomeRating; comment: string | null; createdAt: string }[];
  selections: HappinessImprovementSelection[];
  backendMissing: boolean;
};

function defaultPrivacy(profileId: string): HappinessPrivacySettings {
  return {
    profileId,
    ...DEFAULT_HAPPINESS_PRIVACY,
    updatedAt: new Date().toISOString(),
  };
}

export async function loadHappinessWorkspace(
  profileId: string,
  client: Client = supabase,
): Promise<HappinessLoadResult> {
  const empty: HappinessLoadResult = {
    view: emptyHappinessView(),
    privacy: defaultPrivacy(profileId),
    checkIns: [],
    pulses: [],
    reviews: [],
    causes: [],
    actions: [],
    outcomes: [],
    selections: [],
    backendMissing: false,
  };

  const [privacyRes, checkInsRes, pulsesRes, reviewsRes, causesRes, actionsRes, outcomesRes, selectionsRes, snapshotsRes] =
    await Promise.all([
      client.from('happiness_privacy_settings' as never).select('*').eq('profile_id', profileId).maybeSingle(),
      client.from('happiness_checkins' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(90),
      client.from('happiness_weekly_pulses' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(24),
      client.from('happiness_monthly_reviews' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(12),
      client.from('happiness_causes' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(80),
      client.from('happiness_actions' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(40),
      client.from('happiness_action_outcomes' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(40),
      client.from('happiness_improvement_selections' as never).select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(20),
      client.from('happiness_state_snapshots' as never).select('overall_level, computed_at').eq('profile_id', profileId).order('computed_at', { ascending: false }).limit(2),
    ]);

  const firstError = [privacyRes, checkInsRes, pulsesRes, reviewsRes].find((result) => result.error)?.error;
  if (firstError && isMissingRelation(firstError)) {
    return { ...empty, backendMissing: true };
  }
  if (firstError) throw firstError;

  const checkIns = ((checkInsRes.data as Record<string, unknown>[] | null) ?? []).map(mapCheckIn);
  const pulses = ((pulsesRes.data as Record<string, unknown>[] | null) ?? []).map(mapPulse);
  const reviews = ((reviewsRes.data as Record<string, unknown>[] | null) ?? []).map(mapReview);
  const causes = ((causesRes.data as Record<string, unknown>[] | null) ?? []).map(mapCause);
  const actions = ((actionsRes.data as Record<string, unknown>[] | null) ?? []).map(mapAction);
  const outcomes = ((outcomesRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    actionId: String(row.action_id),
    helped: row.helped as ActionOutcomeRating,
    comment: (row.comment as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
  const selections = ((selectionsRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    profileId: String(row.profile_id),
    domain: row.domain as HappinessDomainId,
    status: row.status as HappinessImprovementSelection['status'],
    createdAt: String(row.created_at),
  }));

  const privacyRow = privacyRes.data as Record<string, unknown> | null;
  const privacy: HappinessPrivacySettings = privacyRow
    ? {
        profileId,
        checkinsEnabled: privacyRow.checkins_enabled !== false,
        recommendationsEnabled: privacyRow.recommendations_enabled !== false,
        optionalSharingEnabled: Boolean(privacyRow.optional_sharing_enabled),
        updatedAt: String(privacyRow.updated_at),
      }
    : defaultPrivacy(profileId);

  const previousOverall = ((snapshotsRes.data as Record<string, unknown>[] | null) ?? [])[1]?.overall_level as
    | HappinessLevel
    | undefined;
  const now = new Date();
  const pendingFollowUp =
    actions.find((action) => {
      if (action.dismissed || action.notRelevant) return false;
      if (!action.followUpAt || new Date(action.followUpAt).getTime() > now.getTime()) return false;
      return !outcomes.some((outcome) => outcome.actionId === action.id);
    }) ?? null;

  const workAssessmentsRes = await client
    .from('work_assessments' as never)
    .select('dimensions, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(8);
  const workAssessments = isMissingRelation(workAssessmentsRes.error)
    ? []
    : ((workAssessmentsRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
        dimensions: (row.dimensions as Record<string, HappinessLevel>) ?? {},
        createdAt: String(row.created_at),
      }));

  const { view, internal } = deriveHappinessView({
    checkIns,
    pulses,
    reviews,
    previousOverallLevel: previousOverall ?? null,
    pendingFollowUp,
    workAssessments,
  });

  if (view.overallLevel) {
    await persistSnapshot(profileId, view, internal.overallInternal, internal.domainInternal, client).catch(() => undefined);
  }

  return {
    view,
    privacy,
    checkIns,
    pulses,
    reviews,
    causes,
    actions,
    outcomes,
    selections,
    backendMissing: false,
  };
}

async function persistSnapshot(
  profileId: string,
  view: HappinessPublicView,
  overallInternal: number | null,
  domainInternal: Partial<Record<HappinessDomainId, number>>,
  client: Client,
) {
  const today = view.computedAt.slice(0, 10);
  // Only upsert today's snapshot. Earlier days keep their stored model_version and levels.
  const { data: existing } = await client
    .from('happiness_state_snapshots' as never)
    .select('id, computed_at')
    .eq('profile_id', profileId)
    .gte('computed_at', `${today}T00:00:00.000Z`)
    .limit(1);
  const payload = {
    profile_id: profileId,
    model_version: HAPPINESS_MODEL_VERSION,
    overall_level: view.overallLevel,
    overall_internal: overallInternal,
    trend: view.trend.direction,
    confidence: view.confidence,
    domain_levels: view.domainLevels,
    domain_internal: domainInternal,
    high_priority_domains: view.attentionDomains,
    strongest_domains: view.strongestDomains,
    computed_at: view.computedAt,
  };
  const existingId = (existing as { id: string }[] | null)?.[0]?.id;
  if (existingId) {
    await client.from('happiness_state_snapshots' as never).update(payload as never).eq('id', existingId);
    return;
  }
  await client.from('happiness_state_snapshots' as never).insert(payload as never);
}

/** Home shortcut: latest overall level only. Do not load the Happiness workspace. */
export async function loadHappinessShortcutLevel(
  profileId: string,
  client: Client = supabase,
): Promise<HappinessLevel | null> {
  const { data, error } = await client
    .from('happiness_state_snapshots' as never)
    .select('overall_level')
    .eq('profile_id', profileId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  const level = (data as { overall_level?: unknown } | null)?.overall_level;
  return typeof level === 'string' && (HAPPINESS_LEVELS as readonly string[]).includes(level)
    ? (level as HappinessLevel)
    : null;
}

/** Work Fulfillment overview: latest Work domain level + trend only. Do not load the Happiness workspace. */
export async function loadHappinessWorkDomainSummary(
  profileId: string,
  client: Client = supabase,
): Promise<{ workLevel: HappinessLevel | null; trendDirection: HappinessTrend | null }> {
  const { data, error } = await client
    .from('happiness_state_snapshots' as never)
    .select('domain_levels, trend')
    .eq('profile_id', profileId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return { workLevel: null, trendDirection: null };
    throw error;
  }
  const row = data as { domain_levels?: Record<string, unknown>; trend?: unknown } | null;
  const work = row?.domain_levels?.work_fulfillment;
  const workLevel =
    typeof work === 'string' && (HAPPINESS_LEVELS as readonly string[]).includes(work)
      ? (work as HappinessLevel)
      : null;
  const trendDirection =
    typeof row?.trend === 'string' && (HAPPINESS_TRENDS as readonly string[]).includes(row.trend)
      ? (row.trend as HappinessTrend)
      : null;
  return { workLevel, trendDirection };
}
