import type { WorkShareablePreferences } from '@/lib/work-fulfillment/types';

/** Private Happiness / Work Fulfillment sources that must never be sent to Marketplace Jobs. */
export const PRIVATE_FIELDS_FORBIDDEN_IN_JOBS = [
  'happinessLevel',
  'overallLevel',
  'domainLevels',
  'checkIns',
  'aggregateParticipation',
  'wellbeingAggregate',
  'workJoy',
  'work_joy_entries',
  'dissatisfaction',
  'currentEmployerConcerns',
  'managerConcerns',
  'teamConcerns',
  'privateNotes',
  'diagnosis',
  'hypotheses',
  'interventionHistory',
  'followUpOutcomes',
  'fulfillmentPlans',
] as const;

export type ApprovedJobsPrefill = {
  path: string;
  jobTypes: string[];
  notes: string;
  approved: boolean;
};

function cleanList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean).slice(0, 3);
}

/**
 * Build a Marketplace Jobs URL from member-approved shareable Work Fit prefs only.
 * Derived prefs may be included only after explicit approval. Source private records stay private.
 */
export function marketJobsPrefillFromShareable(prefs: WorkShareablePreferences | null | undefined): ApprovedJobsPrefill {
  const empty: ApprovedJobsPrefill = { path: '/market?section=jobs', jobTypes: [], notes: '', approved: false };
  if (!prefs?.approved) return empty;
  const jobTypes = cleanList([...prefs.roleTypesSought, ...prefs.activitiesSought]);
  const notes: string[] = [];
  if (prefs.locationMode && prefs.locationMode !== 'not_specified') notes.push(`Location preference: ${prefs.locationMode}`);
  if (prefs.scheduleNote?.trim()) notes.push(prefs.scheduleNote.trim());
  const params = new URLSearchParams({ section: 'jobs', from: 'work-fit' });
  if (jobTypes.length) params.set('jobTypes', jobTypes.join('|'));
  if (notes.length) params.set('notes', notes.join(' · '));
  return {
    path: `/market?${params.toString()}`,
    jobTypes,
    notes: notes.join(' · '),
    approved: true,
  };
}

export function jobsPrefillOmitsPrivateSource(prefill: ApprovedJobsPrefill, privatePayload: Record<string, unknown>): boolean {
  const blob = `${prefill.path} ${prefill.notes} ${prefill.jobTypes.join(' ')}`.toLowerCase();
  for (const field of PRIVATE_FIELDS_FORBIDDEN_IN_JOBS) {
    const value = privatePayload[field];
    if (typeof value === 'string' && value.trim() && blob.includes(value.trim().toLowerCase())) return false;
  }
  return true;
}
