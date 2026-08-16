import type { HappinessCauseGroup } from './types';

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

export function causeTagKey(group: HappinessCauseGroup, tag: string): string {
  return `happiness.causes.${group}.${tag}`;
}

export function causeGroupKey(group: HappinessCauseGroup): string {
  return `happiness.causeGroups.${group}`;
}

export function isCauseTag(group: HappinessCauseGroup, tag: string): boolean {
  return (CAUSE_TAGS[group] as readonly string[]).includes(tag);
}
