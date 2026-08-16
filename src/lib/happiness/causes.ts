import {
  AFFECTING_CATEGORIES,
  type AffectingCategory,
  type CausePolarity,
  type CheckInArea,
  type HappinessCauseGroup,
} from './types';

export const CAUSE_TAGS: Record<HappinessCauseGroup, readonly string[]> = {
  work: [
    'tasks',
    'workload',
    'manager',
    'team',
    'schedule',
    'commute',
    'pay',
    'instability',
    'lack_of_autonomy',
    'lack_of_purpose',
    'poor_fit',
    'unsafe_environment',
  ],
  health: ['physical_discomfort', 'sleep', 'energy', 'access_to_care', 'movement_activity'],
  relationships: ['loneliness', 'conflict', 'family_pressure', 'lack_of_belonging'],
  security: ['housing', 'money', 'employment_instability', 'personal_safety'],
  time: ['overwork', 'caregiving', 'commute', 'insufficient_rest', 'lack_of_personal_time'],
  purpose: ['feeling_underused', 'lack_of_contribution', 'lack_of_progress', 'lack_of_direction'],
};

/** Positive counterparts used only in check-in follow-up. Same cause groups, not a new system. */
export const SUPPORT_TAGS: Record<HappinessCauseGroup, readonly string[]> = {
  work: ['tasks_going_well', 'supportive_people', 'good_fit', 'manageable_workload', 'meaningful_work'],
  health: ['rest', 'energy', 'movement', 'care_access'],
  relationships: ['belonging', 'support', 'connection'],
  security: ['housing_stable', 'money_ok', 'safety'],
  time: ['rest', 'personal_time', 'manageable_pace'],
  purpose: ['contribution', 'progress', 'direction'],
};

export function causeTagKey(group: HappinessCauseGroup, tag: string): string {
  return `happiness.causes.${group}.${tag}`;
}

export function supportTagKey(group: HappinessCauseGroup, tag: string): string {
  return `happiness.supports.${group}.${tag}`;
}

export function causeGroupKey(group: HappinessCauseGroup): string {
  return `happiness.causeGroups.${group}`;
}

export function isCauseTag(group: HappinessCauseGroup, tag: string): boolean {
  return (CAUSE_TAGS[group] as readonly string[]).includes(tag);
}

export function isSupportTag(group: HappinessCauseGroup, tag: string): boolean {
  return (SUPPORT_TAGS[group] as readonly string[]).includes(tag);
}

export function isAffectingCategory(value: string | null | undefined): value is AffectingCategory {
  return Boolean(value && (AFFECTING_CATEGORIES as readonly string[]).includes(value));
}

export function tagsForPolarity(group: HappinessCauseGroup, polarity: CausePolarity): readonly string[] {
  return polarity === 'support' ? SUPPORT_TAGS[group] : CAUSE_TAGS[group];
}

export function tagLabelKey(group: HappinessCauseGroup, tag: string, polarity: CausePolarity): string {
  return polarity === 'support' ? supportTagKey(group, tag) : causeTagKey(group, tag);
}

export function parseCheckInAreas(raw: unknown, affectingMost?: string | null): CheckInArea[] {
  if (Array.isArray(raw)) {
    const areas: CheckInArea[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const row = item as { category?: unknown; polarity?: unknown };
      const category = typeof row.category === 'string' ? row.category : null;
      if (!isAffectingCategory(category)) continue;
      const polarity =
        row.polarity === 'support' || row.polarity === 'both' || row.polarity === 'problem' ? row.polarity : 'problem';
      areas.push({ category, polarity });
    }
    if (areas.length) return areas;
  }
  if (isAffectingCategory(affectingMost)) return [{ category: affectingMost, polarity: 'problem' }];
  return [];
}
