/** Derivation audit for Contributions reputation. Does not change Score V2. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import { observationWeight, reputationFromObservations } from '@/lib/civizen-score-model';
import { contributionObservationFromEvent } from '@/lib/civizen-contribution-score';

export type ContributionReputationAudit = {
  count: number;
  verifiedCount: number;
  min: number | null;
  median: number | null;
  mean: number | null;
  max: number | null;
  effectiveEvidenceVolume: number;
  functions: Array<{ contributionFunction: string; count: number }>;
  artifactFunctions: Array<{ artifactFunction: string; count: number }>;
  structural: Record<string, number>;
  realizedImpactKnown: number;
  systemVerified: number;
  independentlyValidated: number;
  reconstructionWeightedHighStructural: number;
  meanObservationByStructural: Record<string, number>;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function tally(values: string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function auditContributionReputation(events: ContributionEvent[]): ContributionReputationAudit {
  const unique = new Map<string, ContributionEvent>();
  for (const event of events) {
    const key = `${event.sourceTable}:${event.sourceId}`;
    if (!unique.has(key)) unique.set(key, event);
  }
  const roots = [...unique.values()];
  const views = roots.map((event) => ({ event, view: evaluateContributionLifecycle(event) }));
  const observations = views
    .map((item) => item.view.observation)
    .filter((value): value is number => value != null);
  const reputation = reputationFromObservations(
    roots.map((event) => contributionObservationFromEvent(event)).filter((item) => item != null),
  );
  const structural: Record<string, number> = {};
  const byStructural: Record<string, number[]> = {};
  for (const item of views) {
    structural[item.view.structuralSignificance] = (structural[item.view.structuralSignificance] ?? 0) + 1;
    if (item.view.observation != null) {
      const list = byStructural[item.view.structuralSignificance] ?? [];
      list.push(item.view.observation);
      byStructural[item.view.structuralSignificance] = list;
    }
  }
  const meanObservationByStructural: Record<string, number> = {};
  for (const [key, values] of Object.entries(byStructural)) {
    meanObservationByStructural[key] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }
  return {
    count: roots.length,
    verifiedCount: roots.filter((event) => event.verified).length,
    min: observations.length ? Math.min(...observations) : null,
    median: median(observations),
    mean: observations.length ? Math.round((observations.reduce((sum, value) => sum + value, 0) / observations.length) * 10) / 10 : null,
    max: observations.length ? Math.max(...observations) : null,
    effectiveEvidenceVolume: reputation.effectiveEvidenceVolume,
    functions: tally(views.map((item) => item.view.contributionFunction)).map((item) => ({
      contributionFunction: item.key,
      count: item.count,
    })),
    artifactFunctions: tally(views.map((item) => item.view.artifactFunction)).map((item) => ({
      artifactFunction: item.key,
      count: item.count,
    })),
    structural,
    realizedImpactKnown: views.filter((item) => item.view.realizedImpact !== 'unknown').length,
    systemVerified: views.filter((item) => item.view.verificationKind === 'system_verified').length,
    independentlyValidated: views.filter((item) => item.view.verificationKind === 'independently_validated').length,
    reconstructionWeightedHighStructural: views.filter((item) =>
      item.view.reconstructionResult != null && item.view.structuralSignificance === 'high',
    ).length,
    meanObservationByStructural,
  };
}

export function observationWeightBreakdown(event: ContributionEvent) {
  const observation = contributionObservationFromEvent(event);
  if (!observation) return null;
  return {
    observation: observation.value,
    verified: observation.verified,
    weight: observationWeight(observation),
    evaluatorReliability: observation.evaluatorReliability ?? 1,
  };
}
