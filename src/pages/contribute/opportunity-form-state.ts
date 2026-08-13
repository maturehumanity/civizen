import {
  type CompensationStatus,
  type ContributionOpportunity,
  type OpportunityPayload,
} from '@/lib/opportunities';

export function parseSkillList(value: string): string[] {
  return value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function fromDateInput(value: string): string | null {
  if (!value.trim()) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export type OpportunityFormState = {
  title: string;
  summary: string;
  description: string;
  requiredSkills: string;
  optionalSkills: string;
  locationText: string;
  isRemote: boolean;
  estimatedEffort: string;
  applicationDeadline: string;
  workStartsAt: string;
  workEndsAt: string;
  compensationStatus: CompensationStatus;
  areaNodeId: string;
  expectedOutcome: string;
  evidenceRequirements: string;
  evaluationCriteria: string;
};

export function emptyOpportunityForm(): OpportunityFormState {
  return {
    title: '',
    summary: '',
    description: '',
    requiredSkills: '',
    optionalSkills: '',
    locationText: '',
    isRemote: true,
    estimatedEffort: '',
    applicationDeadline: '',
    workStartsAt: '',
    workEndsAt: '',
    compensationStatus: 'learning',
    areaNodeId: 'none',
    expectedOutcome: '',
    evidenceRequirements: '',
    evaluationCriteria: '',
  };
}

export function formFromOpportunity(row: ContributionOpportunity): OpportunityFormState {
  return {
    title: row.title,
    summary: row.summary,
    description: row.description ?? '',
    requiredSkills: row.requiredSkills.join(', '),
    optionalSkills: row.optionalSkills.join(', '),
    locationText: row.locationText ?? '',
    isRemote: row.isRemote,
    estimatedEffort: row.estimatedEffort ?? '',
    applicationDeadline: toDateInput(row.applicationDeadline),
    workStartsAt: toDateInput(row.workStartsAt),
    workEndsAt: toDateInput(row.workEndsAt),
    compensationStatus: row.compensationStatus,
    areaNodeId: row.areaNodeId ?? 'none',
    expectedOutcome: row.expectedOutcome ?? '',
    evidenceRequirements: row.evidenceRequirements ?? '',
    evaluationCriteria: row.evaluationCriteria ?? '',
  };
}

export function formToPayload(form: OpportunityFormState, status: 'draft' | 'open'): OpportunityPayload {
  return {
    title: form.title.trim(),
    summary: form.summary.trim(),
    description: form.description.trim() || null,
    status,
    requiredSkills: parseSkillList(form.requiredSkills),
    optionalSkills: parseSkillList(form.optionalSkills),
    locationText: form.locationText.trim() || null,
    isRemote: form.isRemote,
    estimatedEffort: form.estimatedEffort.trim() || null,
    applicationDeadline: fromDateInput(form.applicationDeadline),
    workStartsAt: fromDateInput(form.workStartsAt),
    workEndsAt: fromDateInput(form.workEndsAt),
    compensationStatus: form.compensationStatus,
    areaNodeId: form.areaNodeId === 'none' ? null : form.areaNodeId,
    expectedOutcome: form.expectedOutcome.trim() || null,
    evidenceRequirements: form.evidenceRequirements.trim() || null,
    evaluationCriteria: form.evaluationCriteria.trim() || null,
  };
}
