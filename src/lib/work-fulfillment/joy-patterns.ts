import type { WorkActivityTag, WorkJoyEntry, WorkJoyFeeling } from './types';

/** Versioned Work Joy pattern rules. Thresholds live here, not in UI. */
export const WORK_JOY_PATTERN_MODEL = 'work-joy-pattern-v1';
export const WORK_JOY_PATTERN_MIN_ENTRIES = 5;
export const WORK_JOY_PATTERN_MIN_PER_TAG = 3;

const FEELING_RANK: Record<WorkJoyFeeling, number> = {
  draining: 0,
  mostly_unpleasant: 1,
  neutral: 2,
  enjoyable: 3,
  energizing: 4,
};

export type WorkJoyPattern = {
  tag: string;
  kind: 'fulfilling' | 'draining';
  count: number;
  phraseKey: 'oftenHigher' | 'recentSuggestsHigher' | 'oftenLower' | 'worthExploring';
};

function tagOf(entry: WorkJoyEntry): string | null {
  const tagged = entry.activityTags.find((tag) => tag && tag !== 'other');
  if (tagged) return tagged;
  const text = (entry.activity ?? entry.taskTag ?? '').trim().toLowerCase();
  return text || null;
}

export function workJoyHasSufficientHistory(entries: WorkJoyEntry[]): boolean {
  return entries.length >= WORK_JOY_PATTERN_MIN_ENTRIES;
}

export function deriveWorkJoyPatterns(entries: WorkJoyEntry[]): WorkJoyPattern[] {
  if (!workJoyHasSufficientHistory(entries)) return [];

  const byTag = new Map<string, WorkJoyFeeling[]>();
  for (const entry of entries) {
    const tag = tagOf(entry);
    if (!tag) continue;
    const list = byTag.get(tag) ?? [];
    list.push(entry.feeling);
    byTag.set(tag, list);
  }

  const patterns: WorkJoyPattern[] = [];
  for (const [tag, feelings] of byTag) {
    if (feelings.length < WORK_JOY_PATTERN_MIN_PER_TAG) continue;
    const avg = feelings.reduce((sum, feeling) => sum + FEELING_RANK[feeling], 0) / feelings.length;
    if (avg >= 3) {
      patterns.push({
        tag,
        kind: 'fulfilling',
        count: feelings.length,
        phraseKey: feelings.length >= 5 ? 'oftenHigher' : 'recentSuggestsHigher',
      });
    } else if (avg <= 1) {
      patterns.push({
        tag,
        kind: 'draining',
        count: feelings.length,
        phraseKey: feelings.length >= 5 ? 'oftenLower' : 'worthExploring',
      });
    }
  }

  return patterns.sort((a, b) => b.count - a.count).slice(0, 6);
}

export function isWorkActivityTag(value: string): value is WorkActivityTag {
  return [
    'working_alone',
    'collaborating',
    'leading',
    'teaching',
    'creating',
    'analyzing',
    'organizing',
    'helping',
    'researching',
    'building',
    'solving_problems',
    'routine_administration',
    'customer_public',
    'physical_work',
    'other',
  ].includes(value);
}
