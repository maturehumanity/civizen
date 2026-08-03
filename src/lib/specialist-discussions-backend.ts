import { supabase } from '@/integrations/supabase/client';
import type {
  SpecialistDiscussionSession,
  SpecialistDiscussionTurn,
} from '@/lib/specialist-discussions';

type SupabaseErrorLike = { code?: string | null; message?: string | null; details?: string | null } | null;
export type SpecialistDiscussionTurnIndex = {
  id: string;
  turnCreatedAt: string;
  mode: string;
  riskLevel: string;
  leadSpecialistId: string;
  matchedSpecialistIds: string[];
};

/** Minimal client surface for tables not yet in generated Database types. */
type SpecialistDiscussionsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: Record<string, unknown>[] | null; error: SupabaseErrorLike }> & {
          limit: (count: number) => Promise<{
            data: Record<string, unknown>[] | null;
            error: SupabaseErrorLike;
          }>;
        };
      };
    };
    upsert: (values: Record<string, unknown>) => Promise<{ error: SupabaseErrorLike }>;
    insert: (values: Record<string, unknown>) => Promise<{ error: SupabaseErrorLike }>;
  };
};

function asSpecialistDiscussionsClient(): SpecialistDiscussionsClient {
  return supabase as unknown as SpecialistDiscussionsClient;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function isMissingSpecialistDiscussionsBackend(error: SupabaseErrorLike) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || message.includes('specialist_discussion_')
  );
}

function parseTurns(rawTurns: unknown): SpecialistDiscussionTurn[] {
  if (!Array.isArray(rawTurns)) return [];
  return rawTurns.filter(Boolean) as SpecialistDiscussionTurn[];
}

export async function loadSpecialistDiscussionSessions(profileId: string) {
  const client = asSpecialistDiscussionsClient();
  const { data, error } = await client
    .from('specialist_discussion_sessions')
    .select('*')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false });

  if (error) {
    return { sessions: [] as SpecialistDiscussionSession[], error };
  }

  const sessions: SpecialistDiscussionSession[] = (data ?? []).map((row) => ({
    id: asString(row.id),
    title: asString(row.title, 'Specialist discussion'),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    turns: parseTurns(row.turns_json),
  }));

  return { sessions, error: null as SupabaseErrorLike };
}

export async function upsertSpecialistDiscussionSession(profileId: string, session: SpecialistDiscussionSession) {
  const client = asSpecialistDiscussionsClient();
  const { error } = await client.from('specialist_discussion_sessions').upsert({
    id: session.id,
    profile_id: profileId,
    title: session.title,
    turns_json: session.turns,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  });
  return { error };
}

export async function insertSpecialistDiscussionTurn(
  profileId: string,
  sessionId: string,
  turn: SpecialistDiscussionTurn,
) {
  const client = asSpecialistDiscussionsClient();
  const classifier = turn.result.classifier;
  const specialistIds = turn.result.matchedSpecialists.map((specialist) => specialist.id);
  const leadSpecialistId = turn.result.leadSpecialist.id;
  const opinionSummaries = turn.result.opinions.map((opinion) => ({
    specialistId: opinion.specialistId,
    specialistName: opinion.specialistName,
    focus: opinion.focus,
    rationale: opinion.rationale,
  }));

  const { error } = await client.from('specialist_discussion_turns').insert({
    id: turn.id,
    session_id: sessionId,
    profile_id: profileId,
    turn_created_at: turn.createdAt,
    request_text: turn.requestText,
    mode: classifier.mode,
    risk_level: classifier.riskLevel,
    urgency: classifier.urgency,
    confidence: classifier.confidence,
    lead_specialist_id: leadSpecialistId,
    matched_specialist_ids: specialistIds,
    matched_keywords: classifier.matchedKeywords,
    final_suggestion: turn.result.finalSuggestion,
    opinion_summaries: opinionSummaries,
    turn_payload: turn.result,
  });

  return { error };
}

export async function loadSpecialistDiscussionTurnIndexes(profileId: string) {
  const client = asSpecialistDiscussionsClient();
  const { data, error } = await client
    .from('specialist_discussion_turns')
    .select('id, turn_created_at, mode, risk_level, lead_specialist_id, matched_specialist_ids')
    .eq('profile_id', profileId)
    .order('turn_created_at', { ascending: false })
    .limit(500);

  if (error) {
    return { turns: [] as SpecialistDiscussionTurnIndex[], error };
  }

  const turns: SpecialistDiscussionTurnIndex[] = (data ?? []).map((row) => ({
    id: asString(row.id),
    turnCreatedAt: asString(row.turn_created_at),
    mode: asString(row.mode),
    riskLevel: asString(row.risk_level),
    leadSpecialistId: asString(row.lead_specialist_id),
    matchedSpecialistIds: Array.isArray(row.matched_specialist_ids)
      ? row.matched_specialist_ids.filter((id): id is string => typeof id === 'string')
      : [],
  }));

  return { turns, error: null as SupabaseErrorLike };
}
