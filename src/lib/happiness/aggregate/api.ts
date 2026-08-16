import { supabase } from '@/integrations/supabase/client';
import { isMissingRelation } from '@/lib/happiness/workspace';

import { WELLBEING_AGGREGATE_PRIVACY_VERSION } from './types';
import type { AggregateParticipation, WellbeingAggregateResult } from './types';

type Client = typeof supabase;

function mapParticipation(profileId: string, row: Record<string, unknown> | null): AggregateParticipation {
  return {
    profileId,
    enabled: Boolean(row?.enabled),
    enabledAt: row?.enabled_at ? String(row.enabled_at) : null,
    disabledAt: row?.disabled_at ? String(row.disabled_at) : null,
    policyVersion: String(row?.policy_version ?? WELLBEING_AGGREGATE_PRIVACY_VERSION),
    updatedAt: String(row?.updated_at ?? new Date().toISOString()),
  };
}

export async function loadAggregateParticipation(
  profileId: string,
  client: Client = supabase,
): Promise<AggregateParticipation> {
  const { data, error } = await client
    .from('wellbeing_aggregate_participation' as never)
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error && !isMissingRelation(error)) throw error;
  return mapParticipation(profileId, (data as Record<string, unknown> | null) ?? null);
}

export async function saveAggregateParticipation(
  profileId: string,
  enabled: boolean,
  client: Client = supabase,
): Promise<AggregateParticipation> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('wellbeing_aggregate_participation' as never)
    .upsert(
      {
        profile_id: profileId,
        enabled,
        enabled_at: enabled ? now : null,
        disabled_at: enabled ? null : now,
        policy_version: WELLBEING_AGGREGATE_PRIVACY_VERSION,
        updated_at: now,
      } as never,
      { onConflict: 'profile_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapParticipation(profileId, data as Record<string, unknown>);
}

/**
 * Withdrawal: stop contributing to newly generated aggregates.
 * Historic privacy-safe snapshots are not rewritten.
 * Private Happiness source records stay under existing Happiness settings.
 */
export function withdrawalExcludesFutureAggregates(): true {
  return true;
}

/** Phase 4B contract: privacy-safe snapshots only. Never query private Happiness tables. */
export async function requestWellbeingAggregate(
  query: Record<string, unknown>,
  client: Client = supabase,
): Promise<WellbeingAggregateResult> {
  const { data, error } = await client.rpc('get_wellbeing_aggregate' as never, { p_query: query } as never);
  if (error) throw error;
  return data as WellbeingAggregateResult;
}
