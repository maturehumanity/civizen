import type { CommunityChallenge } from '@/lib/challenges';

export type ChallengeFormState = {
  programId: string;
  newProgramTitle: string;
  newProgramSummary: string;
  title: string;
  problemStatement: string;
  whyItMatters: string;
  affected: string;
  areaNodeId: string;
  scope: string;
  successCriteria: string;
  evidenceLinks: string;
  constraints: string;
  resources: string;
  contextDetail: string;
};

export const emptyChallengeForm: ChallengeFormState = {
  programId: '',
  newProgramTitle: '',
  newProgramSummary: '',
  title: '',
  problemStatement: '',
  whyItMatters: '',
  affected: '',
  areaNodeId: 'none',
  scope: '',
  successCriteria: '',
  evidenceLinks: '',
  constraints: '',
  resources: '',
  contextDetail: '',
};

export function formFromChallenge(row: CommunityChallenge): ChallengeFormState {
  return {
    ...emptyChallengeForm,
    programId: row.programId,
    title: row.title,
    problemStatement: row.problemStatement,
    whyItMatters: row.whyItMatters,
    affected: row.affected ?? '',
    areaNodeId: row.areaNodeId ?? 'none',
    scope: row.scope ?? '',
    successCriteria: row.successCriteria,
    evidenceLinks: row.evidenceLinks ?? '',
    constraints: row.constraints ?? '',
    resources: row.resources ?? '',
    contextDetail: row.contextDetail ?? '',
  };
}
