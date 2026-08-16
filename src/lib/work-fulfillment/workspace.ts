import { supabase } from '@/integrations/supabase/client';
import { isMissingRelation } from '@/lib/happiness/workspace';
import type { HappinessAction, HappinessActionOutcome } from '@/lib/happiness/types';
import { mapAction } from '@/lib/happiness/workspace';

import {
  ensureWorkFulfillmentProfile,
  listWorkAssessments,
  listWorkContexts,
  listWorkJoyEntries,
  loadShareablePreferences,
  loadWorkFulfillmentProfile,
} from './api';
import {
  listRecommendationFeedback,
  listWorkExplorations,
  listWorkFollowUps,
  listWorkInterventions,
  listWorkTransitionPaths,
} from './persist';
import type {
  WorkAssessment,
  WorkContext,
  WorkExploration,
  WorkFollowUp,
  WorkFulfillmentProfile,
  WorkIntervention,
  WorkJoyEntry,
  WorkShareablePreferences,
  WorkTransitionPath,
} from './types';

type Client = typeof supabase;

export type WorkFulfillmentLoadResult = {
  profile: WorkFulfillmentProfile | null;
  contexts: WorkContext[];
  assessments: WorkAssessment[];
  joyEntries: WorkJoyEntry[];
  shareable: WorkShareablePreferences;
  feedback: { recommendationId: string; feedback: string }[];
  interventions: WorkIntervention[];
  explorations: WorkExploration[];
  transitions: WorkTransitionPath[];
  followUps: WorkFollowUp[];
  actions: HappinessAction[];
  outcomes: HappinessActionOutcome[];
  backendMissing: boolean;
};

export async function loadWorkFulfillmentWorkspace(
  profileId: string,
  client: Client = supabase,
): Promise<WorkFulfillmentLoadResult> {
  try {
    await ensureWorkFulfillmentProfile(profileId, client);
  } catch (error) {
    if (isMissingRelation(error as { message?: string; code?: string })) {
      return emptyWorkWorkspace(true);
    }
    throw error;
  }

  const [profile, contexts, assessments, joyEntries, shareable, feedback, interventions, explorations, transitions, followUps, actionsRes, outcomesRes] =
    await Promise.all([
      loadWorkFulfillmentProfile(profileId, client),
      listWorkContexts(profileId, client),
      listWorkAssessments(profileId, client),
      listWorkJoyEntries(profileId, client),
      loadShareablePreferences(profileId, client),
      listRecommendationFeedback(profileId, client),
      listWorkInterventions(profileId, client),
      listWorkExplorations(profileId, client),
      listWorkTransitionPaths(profileId, client),
      listWorkFollowUps(profileId, client),
      client
        .from('happiness_actions' as never)
        .select('*')
        .eq('profile_id', profileId)
        .eq('domain', 'work_fulfillment')
        .order('created_at', { ascending: false })
        .limit(40),
      client
        .from('happiness_action_outcomes' as never)
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

  const actions = ((actionsRes.data as Record<string, unknown>[] | null) ?? []).map(mapAction);
  const outcomes = ((outcomesRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    actionId: String(row.action_id),
    helped: row.helped as HappinessActionOutcome['helped'],
    comment: (row.comment as string | null) ?? null,
    createdAt: String(row.created_at),
  }));

  return {
    profile,
    contexts,
    assessments,
    joyEntries,
    shareable,
    feedback,
    interventions,
    explorations,
    transitions,
    followUps,
    actions,
    outcomes,
    backendMissing: false,
  };
}

function emptyWorkWorkspace(backendMissing: boolean): WorkFulfillmentLoadResult {
  return {
    profile: null,
    contexts: [],
    assessments: [],
    joyEntries: [],
    shareable: {
      profileId: '',
      approved: false,
      activitiesSought: [],
      roleTypesSought: [],
      environment: {},
      locationMode: null,
      scheduleNote: null,
      updatedAt: new Date().toISOString(),
    },
    feedback: [],
    interventions: [],
    explorations: [],
    transitions: [],
    followUps: [],
    actions: [],
    outcomes: [],
    backendMissing,
  };
}
