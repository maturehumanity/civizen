/**
 * Civizen Score Contributions: collect domain activity, estimate factors, score.
 * Heuristics are deterministic (v1). AI classification and off-platform declaration come later.
 */

import {
  clampScore,
  diminishingQuantityScore,
  type CategoryScoreInput,
  type ScoreConfidence,
  type ScoreMetric,
} from '@/lib/civizen-score';
import { supabase } from '@/integrations/supabase/client';

export type ContributionEventType =
  | 'law_contribution'
  | 'funding_record'
  | 'solution_problem'
  | 'solution_comment'
  | 'solution_endorsement'
  | 'governance_proposal'
  | 'governance_vote'
  | 'development_story'
  | 'post'
  | 'post_comment'
  | 'content_item';

export type ContributionEvent = {
  id?: string;
  profileId: string;
  sourceTable: string;
  sourceId: string;
  eventType: ContributionEventType;
  title: string;
  summary: string | null;
  capacityEstimate: number;
  impactEstimate: number;
  collaborationEstimate: number;
  beneficiaryEstimate: number;
  verified: boolean;
  occurredAt: string;
  rawMeta: Record<string, unknown>;
};

type TypeBase = {
  capacity: number;
  impact: number;
  collaboration: number;
  beneficiaries: number;
};

export const CONTRIBUTION_TYPE_BASES: Record<ContributionEventType, TypeBase> = {
  law_contribution: { capacity: 70, impact: 55, collaboration: 20, beneficiaries: 60 },
  funding_record: { capacity: 65, impact: 70, collaboration: 15, beneficiaries: 55 },
  solution_problem: { capacity: 55, impact: 50, collaboration: 35, beneficiaries: 65 },
  solution_comment: { capacity: 35, impact: 30, collaboration: 70, beneficiaries: 40 },
  solution_endorsement: { capacity: 25, impact: 35, collaboration: 60, beneficiaries: 40 },
  governance_proposal: { capacity: 75, impact: 60, collaboration: 40, beneficiaries: 70 },
  governance_vote: { capacity: 20, impact: 25, collaboration: 50, beneficiaries: 45 },
  // Platform improvement requests documented in Home → Stories (high civic capacity).
  development_story: { capacity: 72, impact: 68, collaboration: 35, beneficiaries: 75 },
  post: { capacity: 25, impact: 15, collaboration: 20, beneficiaries: 20 },
  post_comment: { capacity: 15, impact: 10, collaboration: 55, beneficiaries: 15 },
  content_item: { capacity: 50, impact: 40, collaboration: 25, beneficiaries: 45 },
};

export const CONTRIBUTION_EVENT_TYPE_LABELS: Record<ContributionEventType, string> = {
  law_contribution: 'Law library',
  funding_record: 'Verified work',
  solution_problem: 'Solution problem',
  solution_comment: 'Solution discuss',
  solution_endorsement: 'Solution endorsement',
  governance_proposal: 'Governance proposal',
  governance_vote: 'Governance vote',
  development_story: 'Platform improvement',
  post: 'Post',
  post_comment: 'Comment',
  content_item: 'Content',
};

/** Soft-cap for quantity curve — sustained builders need room before diminishing returns flatten. */
export const CONTRIBUTION_QUANTITY_SOFT_CAP = 48;
export const CONTRIBUTION_QUANTITY_MAX = 48;

const SKIP_CONTENT_SOURCE_TABLES = new Set([
  'posts',
  'post_comments',
  'law_contributions',
  'solution_problems',
  'solution_comments',
  'governance_proposals',
  'governance_proposal_votes',
  'contribution_records',
  'development_stories',
  // Chat mirrors are not civic contribution artifacts; development_stories capture product work.
  'private_messages',
  'messages',
]);

function clampFactor(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Soft size multiplier from text length (capacity). */
export function contentSizeFactor(textLen: number): number {
  if (textLen > 300) return 1.1;
  if (textLen < 50) return 0.85;
  return 1;
}

export function applyVerifiedImpactBoost(impact: number, verified: boolean): number {
  return clampFactor(verified ? impact * 1.25 : impact);
}

export type EstimateContributionInput = {
  eventType: ContributionEventType;
  title?: string | null;
  summary?: string | null;
  textLen?: number;
  verified?: boolean;
  /** Optional 0–100 overrides (e.g. funding quality/impact scores). */
  capacityOverride?: number | null;
  impactOverride?: number | null;
  beneficiaryOverride?: number | null;
  rawMeta?: Record<string, unknown>;
  occurredAt?: string;
  sourceTable: string;
  sourceId: string;
  profileId: string;
};

export function estimateContributionEvent(input: EstimateContributionInput): ContributionEvent {
  const base = CONTRIBUTION_TYPE_BASES[input.eventType];
  const size = contentSizeFactor(input.textLen ?? 0);
  const verified = Boolean(input.verified);

  const capacity = clampFactor(
    input.capacityOverride != null && Number.isFinite(input.capacityOverride)
      ? Number(input.capacityOverride)
      : base.capacity * size,
  );

  const impactBase =
    input.impactOverride != null && Number.isFinite(input.impactOverride)
      ? Number(input.impactOverride)
      : base.impact;
  const impact = applyVerifiedImpactBoost(impactBase, verified);

  const beneficiaries = clampFactor(
    input.beneficiaryOverride != null && Number.isFinite(input.beneficiaryOverride)
      ? Number(input.beneficiaryOverride)
      : base.beneficiaries,
  );

  const title =
    (input.title?.trim() || CONTRIBUTION_EVENT_TYPE_LABELS[input.eventType]).slice(0, 120);

  return {
    profileId: input.profileId,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    eventType: input.eventType,
    title,
    summary: input.summary?.trim() ? input.summary.trim().slice(0, 80) : null,
    capacityEstimate: capacity,
    impactEstimate: impact,
    collaborationEstimate: clampFactor(base.collaboration),
    beneficiaryEstimate: beneficiaries,
    verified,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    rawMeta: input.rawMeta ?? {},
  };
}

function confidenceFromVerified(verifiedCount: number, total: number): ScoreConfidence {
  if (total <= 0) return 'insufficient';
  if (verifiedCount <= 0) return 'low';
  if (verifiedCount < 3) return 'moderate';
  if (verifiedCount < 10) return 'high';
  return 'very_high';
}

/**
 * Score Contributions from estimated events.
 * Quantity uses a higher soft-cap so sustained platform builders are not stuck near ~40
 * after a handful of mid-tier content items; impact + capacity still dominate over spam.
 */
export function scoreContributionsFromEvents(
  events: ContributionEvent[],
): CategoryScoreInput | null {
  if (events.length === 0) return null;

  // Weight quantity by relative impact so many high-impact stories outrank many empty posts.
  const impactWeightedCount = events.reduce((sum, e) => {
    const weight = Math.max(0.35, Math.min(1.5, e.impactEstimate / 50));
    return sum + weight;
  }, 0);
  const quantityPart = diminishingQuantityScore(
    impactWeightedCount,
    CONTRIBUTION_QUANTITY_SOFT_CAP,
    CONTRIBUTION_QUANTITY_MAX,
  );
  const capacityPart = mean(events.map((e) => e.capacityEstimate)) * 0.2;
  const impactWeights = events.map((e) => (e.verified ? e.impactEstimate * 1.25 : e.impactEstimate));
  const impactPart = Math.min(30, mean(impactWeights.map((v) => Math.min(100, v))) * 0.3);
  const uniqueTypes = new Set(events.map((e) => e.eventType)).size;
  const diversityPart = Math.min(10, uniqueTypes * 2);
  const collabMean = mean(events.map((e) => e.collaborationEstimate));
  const collabBoost = Math.min(5, (collabMean / 100) * 5);
  // Reward long-running contribution without letting raw count linear-scale the score.
  const sustainedBoost = Math.min(8, Math.log1p(events.length) * 1.15);

  const score = clampScore(
    quantityPart + capacityPart + impactPart + diversityPart + collabBoost + sustainedBoost,
  );

  const verifiedCount = events.filter((e) => e.verified).length;
  const now = Date.now();
  const recentCutoff = now - 90 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((e) => {
    const t = Date.parse(e.occurredAt);
    return Number.isFinite(t) && t >= recentCutoff;
  });

  const metrics: ScoreMetric[] = [
    {
      id: 'recent',
      label: 'Recent Contributions',
      value: clampScore(diminishingQuantityScore(recentEvents.length, 8, 70)),
      sourceCount: recentEvents.length,
      confidence: confidenceFromVerified(
        recentEvents.filter((e) => e.verified).length,
        recentEvents.length,
      ),
    },
    {
      id: 'verified',
      label: 'Verified Contributions',
      value: verifiedCount > 0 ? clampScore(diminishingQuantityScore(verifiedCount, 6, 80)) : null,
      sourceCount: verifiedCount,
      confidence: confidenceFromVerified(verifiedCount, events.length),
    },
    {
      id: 'impact',
      label: 'Impact',
      value: clampScore(mean(events.map((e) => e.impactEstimate))),
      sourceCount: events.length,
      confidence: confidenceFromVerified(verifiedCount, events.length),
    },
    {
      id: 'collaboration',
      label: 'Collaboration',
      value: clampScore(collabMean),
      sourceCount: events.length,
      confidence: confidenceFromVerified(verifiedCount, events.length),
    },
    {
      id: 'beneficiaries',
      label: 'Beneficiaries',
      value: clampScore(mean(events.map((e) => e.beneficiaryEstimate))),
      sourceCount: events.length,
      confidence: confidenceFromVerified(verifiedCount, events.length),
    },
    {
      id: 'ratings',
      label: 'Ratings',
      value: null,
      sourceCount: 0,
      confidence: 'insufficient',
    },
  ];

  return {
    score,
    sourceCount: events.length,
    verifiedSourceCount: verifiedCount,
    confidence: confidenceFromVerified(verifiedCount, events.length),
    metrics,
  };
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

type DbClient = typeof supabase;

/**
 * Fan-out collect + estimate from live domain tables for one profile.
 */
export async function collectContributionSources(
  profileId: string,
  userId: string | null | undefined,
  client: DbClient = supabase,
): Promise<ContributionEvent[]> {
  const events: ContributionEvent[] = [];
  const db = client as any;

  const [
    lawRes,
    solutionsRes,
    commentsRes,
    endorseRes,
    proposalsRes,
    votesRes,
    postsRes,
    postCommentsRes,
    contentRes,
    storiesRes,
  ] = await Promise.all([
    db
      .from('law_contributions')
      .select('id, title, note, contribution_type, status, reviewed_at, created_at')
      .eq('author_id', profileId),
    db
      .from('solution_problems')
      .select('id, title, body, status, created_at')
      .eq('author_id', profileId),
    db
      .from('solution_comments')
      .select('id, body, created_at')
      .eq('author_id', profileId),
    db
      .from('solution_proposal_endorsements')
      .select('proposal_id, profile_id, created_at')
      .eq('profile_id', profileId),
    db
      .from('governance_proposals')
      .select('id, title, body, status, created_at')
      .eq('proposer_id', profileId),
    db
      .from('governance_proposal_votes')
      .select('id, choice, proposal_id, created_at')
      .eq('voter_id', profileId),
    db.from('posts').select('id, content, created_at').eq('author_id', profileId),
    db.from('post_comments').select('id, content, created_at').eq('author_id', profileId),
    db
      .from('content_items')
      .select('id, title, body_preview, review_status, content_type, source_table, submitted_at, created_at')
      .eq('author_id', profileId),
    db
      .from('development_stories')
      .select(
        'id, title, original_instruction, rephrased_description, section, area, created_features, requested_at, created_at',
      )
      .eq('author_id', profileId),
  ]);

  for (const row of lawRes.data ?? []) {
    const status = asText(row.status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'law_contributions',
        sourceId: String(row.id),
        eventType: 'law_contribution',
        title: asText(row.title),
        summary: asText(row.contribution_type),
        textLen: asText(row.note).length,
        verified: status === 'approved',
        occurredAt: asText(row.reviewed_at) || asText(row.created_at),
        rawMeta: { status, contribution_type: row.contribution_type },
      }),
    );
  }

  for (const row of solutionsRes.data ?? []) {
    const status = asText(row.status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'solution_problems',
        sourceId: String(row.id),
        eventType: 'solution_problem',
        title: asText(row.title),
        summary: status,
        textLen: asText(row.body).length,
        verified: status === 'consensus' || status === 'closed',
        occurredAt: asText(row.created_at),
        rawMeta: { status },
      }),
    );
  }

  for (const row of commentsRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'solution_comments',
        sourceId: String(row.id),
        eventType: 'solution_comment',
        title: asText(row.body).slice(0, 120),
        summary: 'discuss',
        textLen: asText(row.body).length,
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: {},
      }),
    );
  }

  for (const row of endorseRes.data ?? []) {
    const proposalId = String(row.proposal_id);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'solution_proposal_endorsements',
        sourceId: `${proposalId}:${profileId}`,
        eventType: 'solution_endorsement',
        title: 'Solution endorsement',
        summary: 'endorse',
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: { proposal_id: proposalId },
      }),
    );
  }

  for (const row of proposalsRes.data ?? []) {
    const status = asText(row.status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'governance_proposals',
        sourceId: String(row.id),
        eventType: 'governance_proposal',
        title: asText(row.title),
        summary: status,
        textLen: asText(row.body).length,
        verified: status === 'approved',
        occurredAt: asText(row.created_at),
        rawMeta: { status },
      }),
    );
  }

  for (const row of votesRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'governance_proposal_votes',
        sourceId: String(row.id),
        eventType: 'governance_vote',
        title: 'Governance vote',
        summary: asText(row.choice),
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: { choice: row.choice, proposal_id: row.proposal_id },
      }),
    );
  }

  for (const row of postsRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'posts',
        sourceId: String(row.id),
        eventType: 'post',
        title: asText(row.content).slice(0, 120),
        summary: 'social',
        textLen: asText(row.content).length,
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: {},
      }),
    );
  }

  for (const row of postCommentsRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'post_comments',
        sourceId: String(row.id),
        eventType: 'post_comment',
        title: asText(row.content).slice(0, 120),
        summary: 'social',
        textLen: asText(row.content).length,
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: {},
      }),
    );
  }

  for (const row of contentRes.data ?? []) {
    const sourceTable = asText(row.source_table);
    if (sourceTable && SKIP_CONTENT_SOURCE_TABLES.has(sourceTable)) continue;
    const status = asText(row.review_status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'content_items',
        sourceId: String(row.id),
        eventType: 'content_item',
        title: asText(row.title) || asText(row.body_preview),
        summary: status || asText(row.content_type),
        textLen: asText(row.body_preview).length,
        verified: status === 'approved',
        occurredAt: asText(row.submitted_at) || asText(row.created_at),
        rawMeta: { review_status: status, source_table: sourceTable },
      }),
    );
  }

  for (const row of storiesRes.data ?? []) {
    const instruction = asText(row.original_instruction) || asText(row.rephrased_description);
    const features = Array.isArray(row.created_features) ? row.created_features : [];
    const hasFeatures = features.length > 0;
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'development_stories',
        sourceId: String(row.id),
        eventType: 'development_story',
        title: asText(row.title) || 'Platform improvement',
        summary: [asText(row.section), asText(row.area)].filter(Boolean).join(' · ') || 'story',
        textLen: instruction.length,
        verified: hasFeatures,
        // Stories with shipped features get a modest impact lift.
        impactOverride: hasFeatures ? 78 : 62,
        capacityOverride: hasFeatures ? 78 : 68,
        occurredAt: asText(row.requested_at) || asText(row.created_at),
        rawMeta: {
          section: row.section,
          area: row.area,
          feature_count: features.length,
        },
      }),
    );
  }

  if (userId) {
    const { data: contributor } = await db
      .from('contributor_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (contributor?.id) {
      const { data: records } = await db
        .from('contribution_records')
        .select(
          'id, work_type, quality_score, impact_score, verified_points, status, created_at',
        )
        .eq('contributor_id', contributor.id);

      for (const row of records ?? []) {
        const status = asText(row.status);
        const verifiedPoints = asNumber(row.verified_points) ?? 0;
        events.push(
          estimateContributionEvent({
            profileId,
            sourceTable: 'contribution_records',
            sourceId: String(row.id),
            eventType: 'funding_record',
            title: asText(row.work_type) || 'Funding contribution',
            summary: status,
            verified: status === 'verified',
            capacityOverride: asNumber(row.quality_score) ?? undefined,
            impactOverride: asNumber(row.impact_score) ?? undefined,
            beneficiaryOverride: clampFactor(Math.max(55, Math.min(100, verifiedPoints / 10))),
            occurredAt: asText(row.created_at),
            rawMeta: {
              status,
              verified_points: verifiedPoints,
            },
          }),
        );
      }
    }
  }

  events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return events;
}

function eventToRow(event: ContributionEvent) {
  return {
    profile_id: event.profileId,
    source_table: event.sourceTable,
    source_id: event.sourceId,
    event_type: event.eventType,
    title: event.title,
    summary: event.summary,
    capacity_estimate: event.capacityEstimate,
    impact_estimate: event.impactEstimate,
    collaboration_estimate: event.collaborationEstimate,
    beneficiary_estimate: event.beneficiaryEstimate,
    verified: event.verified,
    occurred_at: event.occurredAt,
    raw_meta: event.rawMeta,
    updated_at: new Date().toISOString(),
  };
}

export function mapContributionEventRow(row: Record<string, unknown>): ContributionEvent {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    profileId: String(row.profile_id),
    sourceTable: String(row.source_table),
    sourceId: String(row.source_id),
    eventType: String(row.event_type) as ContributionEventType,
    title: asText(row.title) || CONTRIBUTION_EVENT_TYPE_LABELS[String(row.event_type) as ContributionEventType] || 'Contribution',
    summary: asText(row.summary) || null,
    capacityEstimate: asNumber(row.capacity_estimate) ?? 0,
    impactEstimate: asNumber(row.impact_estimate) ?? 0,
    collaborationEstimate: asNumber(row.collaboration_estimate) ?? 0,
    beneficiaryEstimate: asNumber(row.beneficiary_estimate) ?? 0,
    verified: Boolean(row.verified),
    occurredAt: asText(row.occurred_at) || new Date().toISOString(),
    rawMeta:
      row.raw_meta && typeof row.raw_meta === 'object' && !Array.isArray(row.raw_meta)
        ? (row.raw_meta as Record<string, unknown>)
        : {},
  };
}

/**
 * Collect domain activity, upsert into the ledger, return estimated events.
 */
export async function syncContributionEvents(
  profileId: string,
  userId?: string | null,
  client: DbClient = supabase,
): Promise<ContributionEvent[]> {
  const events = await collectContributionSources(profileId, userId, client);
  const db = client as any;

  if (events.length === 0) {
    const { data } = await db
      .from('profile_contribution_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('occurred_at', { ascending: false });
    return (data ?? []).map((row: Record<string, unknown>) => mapContributionEventRow(row));
  }

  const rows = events.map(eventToRow);
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await db
      .from('profile_contribution_events')
      .upsert(chunk, { onConflict: 'source_table,source_id' });
    if (error) {
      console.error('syncContributionEvents upsert failed', error);
      break;
    }
  }

  // Drop chat-mirror content_items that were backfilled before the skip list.
  await db
    .from('profile_contribution_events')
    .delete()
    .eq('profile_id', profileId)
    .eq('source_table', 'content_items')
    .filter('raw_meta->>source_table', 'in', '("private_messages","messages")');

  const { data } = await db
    .from('profile_contribution_events')
    .select('*')
    .eq('profile_id', profileId)
    .order('occurred_at', { ascending: false });

  return (data ?? []).map((row: Record<string, unknown>) => mapContributionEventRow(row));
}

/** Ledger display: group high-volume types; keep recent individuals. */
export type ContributionLedgerItem =
  | { kind: 'event'; event: ContributionEvent }
  | {
      kind: 'group';
      eventType: ContributionEventType;
      count: number;
      verifiedCount: number;
      capacityEstimate: number;
      impactEstimate: number;
      collaborationEstimate: number;
      latestAt: string;
    };

export function buildContributionLedgerItems(
  events: ContributionEvent[],
  options?: { recentLimit?: number; groupThreshold?: number },
): ContributionLedgerItem[] {
  const recentLimit = options?.recentLimit ?? 12;
  const groupThreshold = options?.groupThreshold ?? 8;
  const byType = new Map<ContributionEventType, ContributionEvent[]>();
  for (const event of events) {
    const list = byType.get(event.eventType) ?? [];
    list.push(event);
    byType.set(event.eventType, list);
  }

  const groups: ContributionLedgerItem[] = [];
  const samples: ContributionLedgerItem[] = [];
  const small: ContributionLedgerItem[] = [];
  const sortedTypes = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [eventType, list] of sortedTypes) {
    const ordered = [...list].sort(
      (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );
    if (ordered.length >= groupThreshold) {
      groups.push({
        kind: 'group',
        eventType,
        count: ordered.length,
        verifiedCount: ordered.filter((e) => e.verified).length,
        capacityEstimate: mean(ordered.map((e) => e.capacityEstimate)),
        impactEstimate: mean(ordered.map((e) => e.impactEstimate)),
        collaborationEstimate: mean(ordered.map((e) => e.collaborationEstimate)),
        latestAt: ordered[0]?.occurredAt ?? new Date().toISOString(),
      });
      for (const event of ordered.slice(0, 3)) {
        samples.push({ kind: 'event', event });
      }
    } else {
      for (const event of ordered) {
        small.push({ kind: 'event', event });
      }
    }
  }

  return [...groups, ...samples, ...small].slice(0, groups.length + recentLimit);
}

export async function loadContributionEvents(
  profileId: string,
  client: DbClient = supabase,
): Promise<ContributionEvent[]> {
  const { data, error } = await (client as any)
    .from('profile_contribution_events')
    .select('*')
    .eq('profile_id', profileId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('loadContributionEvents failed', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapContributionEventRow(row));
}
