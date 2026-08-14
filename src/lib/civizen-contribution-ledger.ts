/** Canonical contribution ledger queries. Does not hide score-affecting roots. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import {
  evaluateContributionObservation,
  type ContributionObservationView,
} from '@/lib/civizen-contribution-observation';

export type ContributionLedgerRecord = {
  event: ContributionEvent;
  observation: ContributionObservationView;
};

export type ContributionLedgerSort =
  | 'newest'
  | 'oldest'
  | 'highest_observation'
  | 'highest_impact';

export type ContributionLedgerQuery = {
  search?: string;
  sort?: ContributionLedgerSort;
  verified?: 'all' | 'verified' | 'unverified';
  verificationKind?: string;
  contributionFunction?: string;
  domain?: string;
  role?: string;
  page?: number;
  pageSize?: number;
};

export type ContributionLedgerPage = {
  records: ContributionLedgerRecord[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function canonicalContributionRecords(events: ContributionEvent[]): ContributionLedgerRecord[] {
  const unique = new Map<string, ContributionEvent>();
  for (const event of events) {
    const key = `${event.sourceTable}:${event.sourceId}`;
    if (!unique.has(key)) unique.set(key, event);
  }
  return [...unique.values()].map((event) => ({
    event,
    observation: evaluateContributionObservation(event),
  }));
}

export function summarizeContributionTypes(events: ContributionEvent[]): Array<{ eventType: string; count: number }> {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  return [...counts.entries()].map(([eventType, count]) => ({ eventType, count })).sort((a, b) => b.count - a.count);
}

export function summarizeContributionFunctions(
  events: ContributionEvent[],
): Array<{ contributionFunction: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of canonicalContributionRecords(events)) {
    const key = item.observation.contributionFunction;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([contributionFunction, count]) => ({ contributionFunction, count }))
    .sort((a, b) => b.count - a.count);
}

export function summarizeArtifactFunctions(
  events: ContributionEvent[],
): Array<{ artifactFunction: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of canonicalContributionRecords(events)) {
    const key = item.observation.artifactFunction;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([artifactFunction, count]) => ({ artifactFunction, count }))
    .sort((a, b) => b.count - a.count);
}

export function queryContributionLedger(
  events: ContributionEvent[],
  query: ContributionLedgerQuery = {},
): ContributionLedgerPage {
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const page = Math.max(1, query.page ?? 1);
  const search = (query.search ?? '').trim().toLowerCase();
  let records = canonicalContributionRecords(events);

  if (search) {
    records = records.filter((item) => {
      const hay = [
        item.event.title,
        item.event.summary ?? '',
        item.observation.contributionFunction,
        item.observation.verificationKind,
        ...item.observation.subsystems,
      ].join(' ').toLowerCase();
      return hay.includes(search);
    });
  }
  if (query.verified === 'verified') records = records.filter((item) => item.event.verified);
  if (query.verified === 'unverified') records = records.filter((item) => !item.event.verified);
  if (query.verificationKind) {
    records = records.filter((item) => item.observation.verificationKind === query.verificationKind);
  }
  if (query.contributionFunction) {
    records = records.filter((item) => item.observation.contributionFunction === query.contributionFunction);
  }
  if (query.domain) {
    records = records.filter((item) => item.observation.domain === query.domain);
  }
  if (query.role) {
    records = records.filter((item) => item.observation.roles.includes(query.role!));
  }

  const sort = query.sort ?? 'newest';
  records = [...records].sort((a, b) => {
    if (sort === 'oldest') return Date.parse(a.event.occurredAt) - Date.parse(b.event.occurredAt);
    if (sort === 'highest_observation') return (b.observation.observation ?? -1) - (a.observation.observation ?? -1);
    if (sort === 'highest_impact') {
      const impactA = a.observation.realizedImpact === 'unknown' ? -1 : a.observation.realizedImpact;
      const impactB = b.observation.realizedImpact === 'unknown' ? -1 : b.observation.realizedImpact;
      return impactB - impactA;
    }
    return Date.parse(b.event.occurredAt) - Date.parse(a.event.occurredAt);
  });

  const total = records.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  return {
    records: records.slice(start, start + pageSize),
    total,
    page: current,
    pageSize,
    pageCount,
  };
}

export function previewContributionRecords(events: ContributionEvent[], limit = 5): ContributionLedgerRecord[] {
  return queryContributionLedger(events, { sort: 'newest', page: 1, pageSize: limit }).records;
}

export function contributionRecordKey(event: ContributionEvent): string {
  return `${event.sourceTable}|${event.sourceId}`;
}

export function findContributionRecord(
  events: ContributionEvent[],
  key: string | null | undefined,
): ContributionLedgerRecord | null {
  if (!key) return null;
  return canonicalContributionRecords(events).find((item) => contributionRecordKey(item.event) === key) ?? null;
}
