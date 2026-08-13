import { supabase } from '@/integrations/supabase/client';
import {
  mapContributionOpportunity,
  mapOpportunityParticipation,
  mapOpportunitySkillEvidence,
  type ContributionOpportunity,
  type OpportunityParticipation,
  type OpportunitySkillEvidence,
} from '@/lib/opportunities';

type DbClient = typeof supabase;
type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };
type OpportunityQuery = {
  select: (columns: string) => OpportunityQuery;
  eq: (column: string, value: unknown) => OpportunityQuery;
  in: (column: string, values: readonly unknown[]) => OpportunityQuery;
  order: (column: string, options?: { ascending: boolean }) => OpportunityQuery;
  then: (resolve: (value: QueryResult) => unknown) => Promise<unknown>;
};
type OpportunitiesClient = { from: (table: string) => OpportunityQuery };

function db(client: DbClient): OpportunitiesClient {
  return client as unknown as OpportunitiesClient;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record ? [record] : [];
  });
}

function rpcErrorMessage(error: { message?: string } | null): string {
  const message = error?.message?.trim() || 'request_failed';
  const marker = message.split('\n')[0]?.trim() || message;
  return marker.replace(/^.*ERROR:\s*/i, '').split('CONTEXT:')[0].trim();
}

export async function listVerifiedSkillEvidenceForProfile(
  profileId: string,
  client: DbClient = supabase,
): Promise<Array<OpportunitySkillEvidence & { opportunityTitle: string }>> {
  const { data: parts, error: partsError } = await db(client)
    .from('opportunity_participations')
    .select('id, opportunity_id')
    .eq('participant_profile_id', profileId)
    .eq('status', 'completed')
    .eq('verification_status', 'verified');
  if (partsError) throw new Error(rpcErrorMessage(partsError));
  const participations = asRows(parts).map((row) => ({
    id: String(row.id),
    opportunity_id: String(row.opportunity_id),
  }));
  if (participations.length === 0) return [];

  const ids = participations.map((row) => row.id);
  const opportunityIds = [...new Set(participations.map((row) => row.opportunity_id))];

  const [{ data: skills, error: skillsError }, { data: opps, error: oppsError }] = await Promise.all([
    db(client).from('opportunity_skill_evidence').select('*').in('participation_id', ids),
    db(client).from('contribution_opportunities').select('id, title').in('id', opportunityIds),
  ]);
  if (skillsError) throw new Error(rpcErrorMessage(skillsError));
  if (oppsError) throw new Error(rpcErrorMessage(oppsError));

  const titleByOpportunity = new Map<string, string>();
  for (const row of asRows(opps)) {
    titleByOpportunity.set(String(row.id), String(row.title ?? ''));
  }
  const opportunityByParticipation = new Map(participations.map((row) => [row.id, row.opportunity_id]));

  return asRows(skills).map((row) => {
    const mapped = mapOpportunitySkillEvidence(row);
    const opportunityId = opportunityByParticipation.get(mapped.participationId) ?? '';
    return {
      ...mapped,
      opportunityTitle: titleByOpportunity.get(opportunityId) ?? '',
    };
  });
}

export async function listVerifiedDemonstratedExperience(
  profileId: string,
  client: DbClient = supabase,
): Promise<
  Array<{
    participation: OpportunityParticipation;
    opportunity: ContributionOpportunity;
    skills: string[];
  }>
> {
  const { data: parts, error: partsError } = await db(client)
    .from('opportunity_participations')
    .select('*')
    .eq('participant_profile_id', profileId)
    .eq('status', 'completed')
    .eq('verification_status', 'verified')
    .order('completed_at', { ascending: false });
  if (partsError) throw new Error(rpcErrorMessage(partsError));
  const participations = asRows(parts).map((row) => mapOpportunityParticipation(row));
  if (participations.length === 0) return [];

  const opportunityIds = [...new Set(participations.map((row) => row.opportunityId))];
  const participationIds = participations.map((row) => row.id);
  const [{ data: opps, error: oppsError }, { data: skills, error: skillsError }] = await Promise.all([
    db(client).from('contribution_opportunities').select('*').in('id', opportunityIds),
    db(client).from('opportunity_skill_evidence').select('*').in('participation_id', participationIds),
  ]);
  if (oppsError) throw new Error(rpcErrorMessage(oppsError));
  if (skillsError) throw new Error(rpcErrorMessage(skillsError));

  const opportunityById = new Map(
    asRows(opps).map((row) => [String(row.id), mapContributionOpportunity(row)]),
  );
  const skillsByParticipation = new Map<string, string[]>();
  for (const row of asRows(skills)) {
    const mapped = mapOpportunitySkillEvidence(row);
    const list = skillsByParticipation.get(mapped.participationId) ?? [];
    list.push(mapped.skillName);
    skillsByParticipation.set(mapped.participationId, list);
  }

  return participations.flatMap((part) => {
    const opportunity = opportunityById.get(part.opportunityId);
    if (!opportunity) return [];
    return [{ participation: part, opportunity, skills: skillsByParticipation.get(part.id) ?? [] }];
  });
}
