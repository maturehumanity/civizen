/**
 * Shared fixtures for Civizen Score V2 tests.
 */
import { estimateContributionEvent } from '@/lib/civizen-contributions';

export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function opportunityEvent(args: {
  sourceId: string;
  quality: number;
  impact: number;
  collaboration?: number;
  verified?: boolean;
  occurredAt?: string;
  evaluationCount?: number;
  evaluatorIds?: string[];
  skills?: string[];
  opportunityId?: string;
  durationMinutes?: number;
}) {
  return estimateContributionEvent({
    profileId: 'user-1',
    sourceTable: 'opportunity_participations',
    sourceId: args.sourceId,
    eventType: 'opportunity_participation',
    title: `Activity ${args.sourceId}`,
    verified: args.verified ?? true,
    capacityOverride: args.quality,
    impactOverride: args.impact,
    occurredAt: args.occurredAt ?? daysAgo(1),
    rawMeta: {
      evaluationCount: args.evaluationCount ?? 1,
      evaluatorIds: args.evaluatorIds ?? ['org-1'],
      demonstratedSkills: args.skills ?? [],
      opportunityId: args.opportunityId ?? `opp-${args.sourceId}`,
      collaborationOverride: args.collaboration,
      durationMinutes: args.durationMinutes,
    },
  });
}

