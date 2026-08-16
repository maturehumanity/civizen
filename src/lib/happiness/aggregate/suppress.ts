import { WELLBEING_AGGREGATE_PRIVACY_V1 } from './policy';
import type { EligibleObservation, ParticipationBand } from './types';

export function effectiveCohort(rows: EligibleObservation[]): string[] {
  return [...new Set(rows.map((row) => row.memberKey))];
}

export function participationBand(count: number, minCohort: number): ParticipationBand {
  if (count < minCohort) return 'insufficient';
  if (count >= minCohort * 4) return 'broad';
  return 'sufficient';
}

export function countBy<K extends string>(rows: EligibleObservation[], keyOf: (row: EligibleObservation) => K | undefined): Map<K, number> {
  const counts = new Map<K, number>();
  const seen = new Map<K, Set<string>>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const members = seen.get(key) ?? new Set<string>();
    if (members.has(row.memberKey)) continue;
    members.add(row.memberKey);
    seen.set(key, members);
    counts.set(key, members.size);
  }
  return counts;
}

export function suppressSmallCells(
  counts: Map<string, number>,
  policy = WELLBEING_AGGREGATE_PRIVACY_V1,
): { visible: Record<string, 'shown' | 'grouped' | 'suppressed'>; grouped: boolean } {
  const visible: Record<string, 'shown' | 'grouped' | 'suppressed'> = {};
  let grouped = false;
  for (const [key, count] of counts) {
    if (count < policy.smallCellMin) {
      visible[key] = 'grouped';
      grouped = true;
    } else {
      visible[key] = 'shown';
    }
  }
  return { visible, grouped };
}

export function stripPrivateFields<T extends { memberKey?: string; privateNote?: string }>(row: T): Omit<T, 'memberKey' | 'privateNote'> {
  const { memberKey: _memberKey, privateNote: _privateNote, ...rest } = row;
  return rest;
}
