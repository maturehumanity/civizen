/**
 * Contributions category reputation: unique evidence roots, not duplicated projections.
 */

import {
  clampScore,
  diminishingQuantityScore,
  type CategoryScoreInput,
  type ScoreMetric,
} from '@/lib/civizen-score';
import {
  blendActivityEvaluation,
  evidenceRootId,
  meanFinite,
  reputationFromObservations,
  type CategoryObservation,
  type EvidenceRootRef,
} from '@/lib/civizen-score-model';
import type { ContributionEvent } from '@/lib/civizen-contributions';

function contributionEventRoot(event: ContributionEvent): string {
  return evidenceRootId(event.sourceTable, event.sourceId);
}

function contributionObservation(event: ContributionEvent): CategoryObservation | null {
  const value = blendActivityEvaluation({
    quality: event.capacityEstimate,
    impact: event.impactEstimate,
    collaboration: event.collaborationEstimate,
  });
  if (value == null) return null;
  const evaluatorIds = Array.isArray(event.rawMeta.evaluatorIds)
    ? event.rawMeta.evaluatorIds.filter((id): id is string => typeof id === 'string')
    : [];
  const evaluationCount =
    typeof event.rawMeta.evaluationCount === 'number' ? event.rawMeta.evaluationCount : evaluatorIds.length;
  return {
    evidenceRootId: contributionEventRoot(event),
    value,
    verified: event.verified,
    occurredAt: event.occurredAt,
    evaluatorIds,
    evaluationCount,
    durationMinutes:
      typeof event.rawMeta.durationMinutes === 'number' ? event.rawMeta.durationMinutes : null,
  };
}

export function contributionEvidenceRoots(events: ContributionEvent[]): EvidenceRootRef[] {
  return events.map((event) => {
    const evaluatorIds = Array.isArray(event.rawMeta.evaluatorIds)
      ? event.rawMeta.evaluatorIds.filter((id): id is string => typeof id === 'string')
      : [];
    return {
      id: contributionEventRoot(event),
      sourceTable: event.sourceTable,
      sourceId: event.sourceId,
      verified: event.verified,
      occurredAt: event.occurredAt,
      evaluatorIds,
      evaluationCount:
        typeof event.rawMeta.evaluationCount === 'number' ? event.rawMeta.evaluationCount : evaluatorIds.length,
    };
  });
}

/**
 * Score Contributions as accumulated reputation, not as a copy of activity evaluations.
 * Unique evidence roots are the unit of evidence; duplicate projections collapse.
 */
export function scoreContributionsFromEvents(
  events: ContributionEvent[],
): CategoryScoreInput | null {
  if (events.length === 0) return null;

  const observations = events
    .map(contributionObservation)
    .filter((item): item is CategoryObservation => item != null);
  const reputation = reputationFromObservations(observations);
  if (reputation.score == null) return null;

  const uniqueEvents = new Map<string, ContributionEvent>();
  for (const event of events) {
    const root = contributionEventRoot(event);
    if (!uniqueEvents.has(root)) uniqueEvents.set(root, event);
  }
  const unique = [...uniqueEvents.values()];
  const verifiedCount = unique.filter((event) => event.verified).length;
  const now = Date.now();
  const recentCutoff = now - 90 * 24 * 60 * 60 * 1000;
  const recentEvents = unique.filter((event) => {
    const t = Date.parse(event.occurredAt);
    return Number.isFinite(t) && t >= recentCutoff;
  });
  const impactMean = meanFinite(unique.map((event) => event.impactEstimate));
  const collabMean = meanFinite(unique.map((event) => event.collaborationEstimate));
  const beneficiaryMean = meanFinite(unique.map((event) => event.beneficiaryEstimate));

  const metrics: ScoreMetric[] = [
    {
      id: 'recent',
      label: 'Recent Contributions',
      value: recentEvents.length > 0 ? clampScore(diminishingQuantityScore(recentEvents.length, 8, 70)) : null,
      sourceCount: recentEvents.length,
      confidence: 'low',
    },
    {
      id: 'verified',
      label: 'Verified Contributions',
      value: verifiedCount > 0 ? clampScore(diminishingQuantityScore(verifiedCount, 6, 80)) : null,
      sourceCount: verifiedCount,
      confidence: 'low',
    },
    {
      id: 'impact',
      label: 'Impact',
      value: impactMean == null ? null : clampScore(impactMean),
      sourceCount: unique.length,
      confidence: 'low',
    },
    {
      id: 'collaboration',
      label: 'Collaboration',
      value: collabMean == null ? null : clampScore(collabMean),
      sourceCount: unique.length,
      confidence: 'low',
    },
    {
      id: 'beneficiaries',
      label: 'Beneficiaries',
      value: beneficiaryMean == null ? null : clampScore(beneficiaryMean),
      sourceCount: unique.length,
      confidence: 'low',
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
    score: reputation.score,
    sourceCount: unique.length,
    verifiedSourceCount: verifiedCount,
    confidence: 'low',
    status: reputation.status,
    independentEvidenceCount: reputation.independentEvidenceCount,
    effectiveEvidenceVolume: reputation.effectiveEvidenceVolume,
    evidenceRoots: reputation.evidenceRoots,
    evidenceRootRefs: contributionEvidenceRoots(unique),
    metrics,
  };
}

export function demonstratedSkillsFromContributionEvents(events: ContributionEvent[]): Array<{
  skillName: string;
  participationId: string;
  opportunityId?: string;
  evidenceRootId: string;
  verified: boolean;
  demonstratedAt: string | null;
}> {
  const rows: Array<{
    skillName: string;
    participationId: string;
    opportunityId?: string;
    evidenceRootId: string;
    verified: boolean;
    demonstratedAt: string | null;
  }> = [];
  for (const event of events) {
    if (event.sourceTable !== 'opportunity_participations' || !event.verified) continue;
    const skills = Array.isArray(event.rawMeta.demonstratedSkills)
      ? event.rawMeta.demonstratedSkills.filter((name): name is string => typeof name === 'string')
      : [];
    const root = contributionEventRoot(event);
    for (const skillName of skills) {
      rows.push({
        skillName,
        participationId: event.sourceId,
        opportunityId: typeof event.rawMeta.opportunityId === 'string' ? event.rawMeta.opportunityId : undefined,
        evidenceRootId: root,
        verified: true,
        demonstratedAt: event.occurredAt,
      });
    }
  }
  return rows;
}

export function demonstratedProjectsFromContributionEvents(events: ContributionEvent[]): Array<{
  opportunityId?: string | null;
  participationId?: string | null;
  evidenceRootId: string;
  verified: boolean;
  completedAt: string | null;
  durationMinutes: number | null;
  quality: number | null;
  impact: number | null;
}> {
  const byRoot = new Map<string, {
    opportunityId?: string | null;
    participationId?: string | null;
    evidenceRootId: string;
    verified: boolean;
    completedAt: string | null;
    durationMinutes: number | null;
    quality: number | null;
    impact: number | null;
  }>();
  for (const event of events) {
    if (event.sourceTable !== 'opportunity_participations' || !event.verified) continue;
    const root = contributionEventRoot(event);
    if (byRoot.has(root)) continue;
    byRoot.set(root, {
      opportunityId:
        typeof event.rawMeta.opportunityId === 'string' ? event.rawMeta.opportunityId : null,
      participationId: event.sourceId,
      evidenceRootId: root,
      verified: true,
      completedAt: event.occurredAt,
      durationMinutes:
        typeof event.rawMeta.durationMinutes === 'number' ? event.rawMeta.durationMinutes : null,
      quality: event.capacityEstimate,
      impact: event.impactEstimate,
    });
  }
  return [...byRoot.values()];
}

