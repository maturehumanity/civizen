import { describe, expect, it } from 'vitest';

import {
  canCompleteChallenge,
  canCreateSolutionRecord,
  canSelectProposal,
  canSubmitProposal,
  canTransitionChallengeStatus,
  challengeCardAction,
  participantChallengeAction,
  publicChallengeStage,
  type ChallengeProposal,
  type CommunityChallenge,
  type ImplementationProject,
  type SolutionRecord,
} from '@/lib/challenges';
import { mapCommunityChallenge } from '@/lib/challenges-map';

function challenge(overrides: Partial<CommunityChallenge> = {}): CommunityChallenge {
  return {
    id: 'ch-1',
    programId: 'prog-1',
    publisherProfileId: 'coord-1',
    title: 'Restore water to the shared community garden',
    problemStatement: 'The neighborhood garden lost its water connection last season.',
    whyItMatters: 'The garden is one of the few shared growing spaces.',
    affected: 'Garden members',
    areaNodeId: 'foundational_areas.v1.environment',
    scope: 'The existing plot only.',
    successCriteria: 'Water reaches the beds and half are planted again.',
    status: 'active',
    evidenceLinks: null,
    constraints: null,
    resources: null,
    contextDetail: null,
    selectedProposalId: null,
    outcomeSummary: null,
    outcomeEvidence: null,
    successCriteriaResult: null,
    lessonsLearned: null,
    completedAt: null,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

function proposal(overrides: Partial<ChallengeProposal> = {}): ChallengeProposal {
  return {
    id: 'prop-1',
    challengeId: 'ch-1',
    authorProfileId: 'user-1',
    title: 'Collect rainwater and water the beds with drip lines',
    rationale: 'A tank and drip tape can water the beds without a municipal reconnection.',
    expectedResult: 'Beds receive water maintained by garden members.',
    implementationApproach: null,
    resourcesNeeded: null,
    risks: null,
    supportingEvidence: null,
    status: 'submitted',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

function project(overrides: Partial<ImplementationProject> = {}): ImplementationProject {
  return {
    id: 'proj-1',
    challengeId: 'ch-1',
    proposalId: 'prop-1',
    publisherProfileId: 'coord-1',
    title: 'Rainwater and drip lines',
    summary: 'Fit a tank and drip tape.',
    status: 'active',
    keySteps: null,
    outcomeEvidence: null,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('challenge lifecycle', () => {
  it('keeps participant-facing stages simple', () => {
    expect(publicChallengeStage('proposal_review')).toBe('proposal_review');
    expect(publicChallengeStage('cancelled')).toBe('draft');
    expect(canTransitionChallengeStatus('draft', 'active')).toBe(true);
    expect(canTransitionChallengeStatus('draft', 'completed')).toBe(false);
    expect(canTransitionChallengeStatus('active', 'implementation')).toBe(false);
    expect(canTransitionChallengeStatus('implementation', 'completed')).toBe(true);
  });

  it('lets ordinary participants propose on an active challenge they do not coordinate', () => {
    expect(
      canSubmitProposal({
        challenge: challenge(),
        currentProfileId: 'user-1',
      }),
    ).toEqual({ ok: true });
    expect(
      canSubmitProposal({
        challenge: challenge(),
        currentProfileId: 'coord-1',
      }).ok,
    ).toBe(false);
    expect(
      canSubmitProposal({
        challenge: challenge({ status: 'implementation' }),
        currentProfileId: 'user-1',
      }).reason,
    ).toBe('challenge_not_open_for_proposals');
    expect(participantChallengeAction({ challenge: challenge(), currentProfileId: 'user-1' })).toBe(
      'propose',
    );
    expect(participantChallengeAction({ challenge: challenge(), currentProfileId: 'coord-1' })).toBe(
      'none',
    );
  });

  it('allows coordinators to select a submitted proposal only before implementation', () => {
    expect(
      canSelectProposal({
        challenge: challenge({ status: 'proposal_review' }),
        proposal: proposal(),
        challengeId: 'ch-1',
      }),
    ).toEqual({ ok: true });
    expect(
      canSelectProposal({
        challenge: challenge({ status: 'implementation' }),
        proposal: proposal(),
        challengeId: 'ch-1',
      }).reason,
    ).toBe('challenge_not_in_selection');
    expect(
      canSelectProposal({
        challenge: challenge(),
        proposal: proposal({ status: 'selected' }),
        challengeId: 'ch-1',
      }).reason,
    ).toBe('proposal_not_selectable');
  });

  it('does not treat selection as completion', () => {
    const selected = challenge({
      status: 'implementation',
      selectedProposalId: 'prop-1',
    });
    expect(canCompleteChallenge({ challenge: selected, project: project() }).reason).toBe(
      'outcome_required',
    );
    expect(
      canCompleteChallenge({
        challenge: challenge({ status: 'proposal_review', selectedProposalId: 'prop-1' }),
        project: project(),
      }).reason,
    ).toBe('challenge_not_in_implementation');
    expect(
      canCompleteChallenge({
        challenge: challenge({
          status: 'implementation',
          selectedProposalId: 'prop-1',
          outcomeSummary: 'Water reached half the beds.',
        }),
        project: null,
      }).reason,
    ).toBe('project_required');
    expect(
      canCompleteChallenge({
        challenge: challenge({
          status: 'implementation',
          selectedProposalId: 'prop-1',
          outcomeSummary: 'Water reached half the beds.',
        }),
        project: project(),
      }),
    ).toEqual({ ok: true });
  });

  it('creates a solution record only after the challenge is completed', () => {
    expect(
      canCreateSolutionRecord({
        challenge: challenge({ status: 'implementation' }),
      }).reason,
    ).toBe('challenge_not_completed');
    expect(
      canCreateSolutionRecord({
        challenge: challenge({ status: 'completed' }),
      }),
    ).toEqual({ ok: true });
    expect(
      canCreateSolutionRecord({
        challenge: challenge({ status: 'completed' }),
        existing: { id: 'sol-1' } as Pick<SolutionRecord, 'id'>,
      }).reason,
    ).toBe('solution_record_exists');
  });

  it('keeps default card actions concise', () => {
    expect(challengeCardAction({ challenge: challenge(), currentProfileId: 'user-1' })).toBe(
      'propose',
    );
    expect(
      challengeCardAction({
        challenge: challenge({ status: 'implementation' }),
        currentProfileId: 'user-1',
      }),
    ).toBe('join');
    expect(challengeCardAction({ challenge: challenge(), currentProfileId: 'coord-1' })).toBe(
      'manage',
    );
  });

  it('maps challenge rows including program attribution', () => {
    const mapped = mapCommunityChallenge({
      id: 'ch-1',
      program_id: 'prog-1',
      publisher_profile_id: 'coord-1',
      title: 'Restore water to the shared community garden',
      problem_statement: 'The neighborhood garden lost its water connection last season.',
      why_it_matters: 'The garden is one of the few shared growing spaces.',
      success_criteria: 'Water reaches the beds.',
      status: 'active',
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mapped.programId).toBe('prog-1');
    expect(mapped.status).toBe('active');
  });
});
