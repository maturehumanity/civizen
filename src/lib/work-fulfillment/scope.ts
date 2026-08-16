import type { WorkAssessment, WorkContext, WorkJoyEntry } from './types';

export function primaryWorkContext(contexts: WorkContext[]): WorkContext | null {
  return contexts.find((context) => context.isPrimary && context.status === 'current')
    ?? contexts.find((context) => context.status === 'current')
    ?? contexts[0]
    ?? null;
}

export function latestAssessmentForContext(
  assessments: WorkAssessment[],
  contextId: string | null | undefined,
): WorkAssessment | null {
  if (!contextId) return assessments[0] ?? null;
  return assessments.find((assessment) => assessment.workContextId === contextId) ?? null;
}

export function joyEntriesForContext(
  entries: WorkJoyEntry[],
  contextId: string | null | undefined,
): WorkJoyEntry[] {
  if (!contextId) return entries;
  return entries.filter((entry) => entry.workContextId === contextId);
}
