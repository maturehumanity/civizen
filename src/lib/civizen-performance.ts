/**
 * Civizen Score Performance: system + peer ratings on contribution activities.
 * Own Performance is read-only; peers rate others' contribution events.
 */

import {
  clampScore,
  diminishingQuantityScore,
  type CategoryScoreInput,
  type ScoreConfidence,
  type ScoreMetric,
} from '@/lib/civizen-score';
import type { ContributionEvent } from '@/lib/civizen-contributions';
import { supabase } from '@/integrations/supabase/client';

export type PerformancePeerRating = {
  id?: string;
  contributionEventId: string;
  subjectProfileId: string;
  raterProfileId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceActivity = {
  event: ContributionEvent;
  systemRating: number;
  peerAverage: number | null;
  peerCount: number;
  myRating: number | null;
};

export const PERFORMANCE_QUANTITY_SOFT_CAP = 24;
export const PERFORMANCE_QUANTITY_MAX = 25;

/** Platform-direct contribution types get full system-rating weight. */
const PLATFORM_DIRECT_TYPES = new Set([
  'development_story',
  'law_contribution',
  'funding_record',
  'governance_proposal',
  'content_item',
  'solution_problem',
  'opportunity_participation',
]);

type DbClient = typeof supabase;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function confidenceFromVerified(verified: number, total: number): ScoreConfidence {
  if (total <= 0) return 'low';
  const ratio = verified / total;
  if (ratio >= 0.6 && total >= 5) return 'high';
  if (ratio >= 0.3 || total >= 3) return 'moderate';
  return 'low';
}

/**
 * Derive a 0–100 system rating from contribution factor estimates.
 * Verified / platform-direct work scores higher; social posts stay lower via impact.
 */
export function deriveSystemRating(event: ContributionEvent): number {
  const blend = event.impactEstimate * 0.55 + event.capacityEstimate * 0.35 + event.collaborationEstimate * 0.1;
  const verifiedBoost = event.verified ? 1.1 : 1;
  const typeWeight = PLATFORM_DIRECT_TYPES.has(event.eventType) ? 1 : 0.85;
  return clampScore(blend * verifiedBoost * typeWeight);
}

export function canRatePerformance(args: {
  raterProfileId: string | null | undefined;
  subjectProfileId: string | null | undefined;
}): boolean {
  if (!args.raterProfileId || !args.subjectProfileId) return false;
  return args.raterProfileId !== args.subjectProfileId;
}

export function mapPerformanceRatingRow(row: Record<string, unknown>): PerformancePeerRating {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    contributionEventId: String(row.contribution_event_id),
    subjectProfileId: String(row.subject_profile_id),
    raterProfileId: String(row.rater_profile_id),
    score: asNumber(row.score) ?? 0,
    comment: asText(row.comment) || null,
    createdAt: asText(row.created_at) || new Date().toISOString(),
    updatedAt: asText(row.updated_at) || new Date().toISOString(),
  };
}

export async function loadPerformanceRatings(
  subjectProfileId: string,
  client: DbClient = supabase,
): Promise<PerformancePeerRating[]> {
  const { data, error } = await (client as any)
    .from('profile_performance_ratings')
    .select('*')
    .eq('subject_profile_id', subjectProfileId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('loadPerformanceRatings failed', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapPerformanceRatingRow(row));
}

export async function upsertPerformanceRating(
  args: {
    contributionEventId: string;
    subjectProfileId: string;
    raterProfileId: string;
    score: number;
    comment?: string | null;
  },
  client: DbClient = supabase,
): Promise<{ ok: boolean; error?: string }> {
  if (!canRatePerformance(args)) {
    return { ok: false, error: 'self_rate_forbidden' };
  }

  const score = clampScore(args.score);
  const { error } = await (client as any).from('profile_performance_ratings').upsert(
    {
      contribution_event_id: args.contributionEventId,
      subject_profile_id: args.subjectProfileId,
      rater_profile_id: args.raterProfileId,
      score,
      comment: args.comment?.trim() || null,
    },
    { onConflict: 'contribution_event_id,rater_profile_id' },
  );

  if (error) {
    console.error('upsertPerformanceRating failed', error);
    return { ok: false, error: error.message ?? 'upsert_failed' };
  }

  return { ok: true };
}

export function buildPerformanceActivities(
  events: ContributionEvent[],
  ratings: PerformancePeerRating[],
  viewerProfileId?: string | null,
): PerformanceActivity[] {
  const byEvent = new Map<string, PerformancePeerRating[]>();
  for (const rating of ratings) {
    const list = byEvent.get(rating.contributionEventId) ?? [];
    list.push(rating);
    byEvent.set(rating.contributionEventId, list);
  }

  return events.map((event) => {
    const eventId = event.id;
    const peerRatings = eventId ? byEvent.get(eventId) ?? [] : [];
    const peerScores = peerRatings.map((r) => r.score);
    const my = viewerProfileId
      ? peerRatings.find((r) => r.raterProfileId === viewerProfileId)
      : undefined;

    return {
      event,
      systemRating: deriveSystemRating(event),
      peerAverage: peerScores.length > 0 ? clampScore(mean(peerScores)) : null,
      peerCount: peerScores.length,
      myRating: my != null ? clampScore(my.score) : null,
    };
  });
}

/**
 * Score Performance from contribution activities + peer ratings.
 * Returns null when there is no activity (category stays unscored).
 */
export function scorePerformanceFromActivities(
  activities: PerformanceActivity[],
): CategoryScoreInput | null {
  if (activities.length === 0) return null;

  const systemRatings = activities.map((a) => a.systemRating);
  const verifiedCount = activities.filter((a) => a.event.verified).length;
  const peerFlat = activities.flatMap((a) => {
    if (a.peerAverage == null || a.peerCount <= 0) return [];
    // Weight each activity's peer average once (not per rater) to avoid spam inflation.
    return [a.peerAverage];
  });
  const peerCount = activities.reduce((sum, a) => sum + a.peerCount, 0);

  const now = Date.now();
  const recentCutoff = now - 90 * 24 * 60 * 60 * 1000;
  const recentActivities = activities.filter((a) => {
    const t = Date.parse(a.event.occurredAt);
    return Number.isFinite(t) && t >= recentCutoff;
  });

  const activityMetric = diminishingQuantityScore(
    activities.length,
    PERFORMANCE_QUANTITY_SOFT_CAP,
    70,
  );
  const accomplishmentMetric = clampScore(mean(systemRatings));
  const ratingsMetric = peerFlat.length > 0 ? clampScore(mean(peerFlat)) : null;
  const verifiedRatio = verifiedCount / activities.length;
  const reliabilityMetric = clampScore(verifiedRatio * 40 + accomplishmentMetric * 0.6);
  const engagementMetric = clampScore(
    diminishingQuantityScore(recentActivities.length, 8, 70),
  );

  const activityPart = activityMetric * 0.2;
  const accomplishmentPart = accomplishmentMetric * 0.3;
  const ratingsPart =
    ratingsMetric != null ? ratingsMetric * 0.2 : accomplishmentMetric * 0.15;
  const reliabilityPart = reliabilityMetric * 0.2;
  const engagementPart = engagementMetric * 0.1;
  // When no peer ratings, the 0.05 leftover from ratings fallback stays unused → slight dampen is fine.

  const score = clampScore(
    activityPart + accomplishmentPart + ratingsPart + reliabilityPart + engagementPart,
  );

  const confidence = confidenceFromVerified(verifiedCount + Math.min(peerCount, 5), activities.length);

  const metrics: ScoreMetric[] = [
    {
      id: 'engagement',
      label: 'Engagement',
      value: engagementMetric,
      sourceCount: recentActivities.length,
      confidence,
    },
    {
      id: 'activity',
      label: 'Activity',
      value: activityMetric,
      sourceCount: activities.length,
      confidence,
    },
    {
      id: 'reliability',
      label: 'Reliability',
      value: reliabilityMetric,
      sourceCount: verifiedCount,
      confidence: confidenceFromVerified(verifiedCount, activities.length),
    },
    {
      id: 'accomplishment',
      label: 'Accomplishment',
      value: accomplishmentMetric,
      sourceCount: activities.length,
      confidence,
    },
    {
      id: 'ratings',
      label: 'Ratings',
      value: ratingsMetric,
      sourceCount: peerCount,
      confidence: peerCount > 0 ? confidenceFromVerified(peerCount, Math.max(peerCount, 3)) : 'low',
    },
  ];

  return {
    score,
    sourceCount: activities.length,
    verifiedSourceCount: verifiedCount,
    confidence,
    metrics,
  };
}

/** Convenience: events + ratings → category input. */
export function scorePerformanceFromEvents(
  events: ContributionEvent[],
  ratings: PerformancePeerRating[] = [],
  viewerProfileId?: string | null,
): CategoryScoreInput | null {
  return scorePerformanceFromActivities(
    buildPerformanceActivities(events, ratings, viewerProfileId),
  );
}
