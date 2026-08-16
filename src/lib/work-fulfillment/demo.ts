import type { HappinessLevel } from '@/lib/happiness/types';

import type { WorkAssessment, WorkAssessmentDimension, WorkJoyEntry } from './types';

/** Seeded example used by tests. Occupation may fit; task mix and autonomy need attention. */
export function demoWorkAssessment(profileId = 'demo'): WorkAssessment {
  const dimensions: Partial<Record<WorkAssessmentDimension, HappinessLevel>> = {
    task_enjoyment: 'unsettled',
    strength_utilization: 'flourishing',
    meaning_purpose: 'flourishing',
    autonomy: 'struggling',
    environment_social: 'balanced',
    workload_pace: 'balanced',
    schedule_lifestyle: 'balanced',
    growth_learning: 'balanced',
    recognition_fairness: 'balanced',
    security_compensation: 'balanced',
  };
  return {
    id: 'demo-assessment',
    profileId,
    workContextId: 'demo-context',
    modelVersion: 'work-assessment-v1',
    dimensions,
    createdAt: '2026-08-01T12:00:00Z',
  };
}

export function demoWorkJoyHistory(profileId = 'demo'): WorkJoyEntry[] {
  const days = [
    { feeling: 'energizing' as const, activity: 'mentoring', tags: ['teaching', 'helping'] },
    { feeling: 'enjoyable' as const, activity: 'mentoring', tags: ['teaching'] },
    { feeling: 'energizing' as const, activity: 'mentoring', tags: ['teaching', 'helping'] },
    { feeling: 'energizing' as const, activity: 'problem-solving', tags: ['solving_problems'] },
    { feeling: 'energizing' as const, activity: 'problem-solving', tags: ['solving_problems', 'building'] },
    { feeling: 'draining' as const, activity: 'repetitive administration', tags: ['routine_administration'] },
    { feeling: 'draining' as const, activity: 'repetitive administration', tags: ['routine_administration'] },
    { feeling: 'draining' as const, activity: 'reporting', tags: ['routine_administration'] },
    { feeling: 'neutral' as const, activity: 'meetings', tags: ['collaborating'] },
    { feeling: 'neutral' as const, activity: 'meetings', tags: ['collaborating'] },
  ];
  return days.map((day, index) => ({
    id: `joy-${index}`,
    profileId,
    feeling: day.feeling,
    activity: day.activity,
    taskTag: day.activity,
    project: null,
    context: null,
    note: null,
    workContextId: 'demo-context',
    activityTags: day.tags,
    modelVersion: 'work-joy-v1',
    createdAt: new Date(Date.UTC(2026, 7, 15 - index, 12)).toISOString(),
  }));
}
