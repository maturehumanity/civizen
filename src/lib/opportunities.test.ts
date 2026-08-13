import { describe, expect, it } from 'vitest';

import {
  buildOpportunityScoreEvent,
  canApplyToOpportunity,
  canEvaluateWork,
  canTransitionOpportunityStatus,
  canWithdrawParticipation,
  demonstratedExperienceFromVerified,
  demonstratedSkillsNotInDeclared,
  forbidSelfEvaluation,
  isVerifiedCompletedParticipation,
  mapContributionOpportunity,
  mapOpportunityApplicantIdentity,
  opportunityCardSkills,
  organizerNextAction,
  participantNextAction,
  parseOptionalEvaluationScore,
  profileCanManagePublisher,
  shouldProjectScoreEvent,
  type ContributionOpportunity,
  type OpportunityParticipation,
} from '@/lib/opportunities';

function opportunity(overrides: Partial<ContributionOpportunity> = {}): ContributionOpportunity {
  return {
    id: 'opp-1',
    publisherProfileId: 'org-1',
    title: 'Document a local clinic workflow',
    summary: 'Help a partner clinic record how intake currently works.',
    description: null,
    status: 'open',
    opportunityKind: 'education_to_contribution',
    areaNodeId: 'area.education',
    requiredSkills: ['Documentation', 'Interviewing'],
    optionalSkills: ['Spanish'],
    locationText: 'Remote',
    isRemote: true,
    estimatedEffort: '6 hours',
    applicationDeadline: null,
    workStartsAt: null,
    workEndsAt: null,
    compensationStatus: 'learning',
    expectedOutcome: 'A one-page workflow note',
    evidenceRequirements: 'Link or description of the note',
    evaluationCriteria: 'Complete and usable by the clinic',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

function participation(overrides: Partial<OpportunityParticipation> = {}): OpportunityParticipation {
  return {
    id: 'part-1',
    opportunityId: 'opp-1',
    participantProfileId: 'user-1',
    status: 'applied',
    verificationStatus: 'not_submitted',
    applicationMessage: 'I can help.',
    appliedAt: '2026-08-13T00:00:00.000Z',
    acceptedAt: null,
    acceptedBy: null,
    declinedAt: null,
    declinedBy: null,
    declineNote: null,
    activatedAt: null,
    submittedAt: null,
    completedAt: null,
    completedBy: null,
    withdrawnAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('opportunity authorization helpers', () => {
  it('lets the publishing profile and linked owner manage the opportunity', () => {
    expect(
      profileCanManagePublisher({
        currentProfileId: 'org-1',
        publisherProfileId: 'org-1',
      }),
    ).toBe(true);
    expect(
      profileCanManagePublisher({
        currentProfileId: 'owner-1',
        publisherProfileId: 'org-1',
        ownedLinkedProfileIds: ['org-1'],
      }),
    ).toBe(true);
    expect(
      profileCanManagePublisher({
        currentProfileId: 'user-1',
        publisherProfileId: 'org-1',
      }),
    ).toBe(false);
  });

  it('prevents duplicate applications and self-application', () => {
    expect(
      canApplyToOpportunity({
        opportunity: opportunity(),
        currentProfileId: 'user-1',
      }).ok,
    ).toBe(true);
    expect(
      canApplyToOpportunity({
        opportunity: opportunity(),
        currentProfileId: 'user-1',
        existingParticipation: participation(),
      }),
    ).toEqual({ ok: false, reason: 'already_applied' });
    expect(
      canApplyToOpportunity({
        opportunity: opportunity(),
        currentProfileId: 'org-1',
      }),
    ).toEqual({ ok: false, reason: 'cannot_apply_to_own_opportunity' });
    expect(
      canApplyToOpportunity({
        opportunity: opportunity({ status: 'draft' }),
        currentProfileId: 'user-1',
      }),
    ).toEqual({ ok: false, reason: 'opportunity_not_open' });
  });

  it('prevents self-evaluation', () => {
    expect(forbidSelfEvaluation('user-1', 'user-1')).toBe(true);
    expect(forbidSelfEvaluation('user-1', 'org-1')).toBe(false);
  });
});

describe('opportunity lifecycle transitions', () => {
  it('allows draft → open → closed and rejects cancelled reopen', () => {
    expect(canTransitionOpportunityStatus('draft', 'open')).toBe(true);
    expect(canTransitionOpportunityStatus('open', 'closed')).toBe(true);
    expect(canTransitionOpportunityStatus('closed', 'open')).toBe(true);
    expect(canTransitionOpportunityStatus('cancelled', 'open')).toBe(false);
    expect(canTransitionOpportunityStatus('draft', 'closed')).toBe(false);
  });

  it('withdraws only before work starts', () => {
    expect(canWithdrawParticipation('applied')).toBe(true);
    expect(canWithdrawParticipation('accepted')).toBe(true);
    expect(canWithdrawParticipation('active')).toBe(false);
    expect(canWithdrawParticipation('submitted')).toBe(false);
  });

  it('evaluates only submitted work awaiting review', () => {
    expect(canEvaluateWork(participation({ status: 'submitted', verificationStatus: 'pending' }))).toBe(
      true,
    );
    expect(canEvaluateWork(participation({ status: 'active', verificationStatus: 'not_submitted' }))).toBe(
      false,
    );
    expect(canEvaluateWork(participation({ status: 'completed', verificationStatus: 'verified' }))).toBe(
      false,
    );
  });

  it('exposes the next useful participant and organizer actions', () => {
    expect(
      participantNextAction({
        opportunity: opportunity(),
        currentProfileId: 'user-1',
        participation: null,
      }),
    ).toBe('apply');
    expect(
      participantNextAction({
        opportunity: opportunity(),
        currentProfileId: 'user-1',
        participation: participation(),
      }),
    ).toBe('withdraw');
    expect(
      participantNextAction({
        opportunity: opportunity(),
        currentProfileId: 'user-1',
        participation: participation({ status: 'accepted' }),
      }),
    ).toBe('start');
    expect(
      participantNextAction({
        opportunity: opportunity(),
        currentProfileId: 'user-1',
        participation: participation({ status: 'active' }),
      }),
    ).toBe('submit_evidence');
    expect(
      organizerNextAction(participation({ status: 'applied' })),
    ).toBe('review_application');
    expect(
      organizerNextAction(participation({ status: 'submitted', verificationStatus: 'pending' })),
    ).toBe('evaluate');
  });
});

describe('verified score and profile projection', () => {
  it('projects a score event only for completed + verified work', () => {
    const unverified = participation({ status: 'submitted', verificationStatus: 'pending' });
    const verified = participation({
      status: 'completed',
      verificationStatus: 'verified',
      completedAt: '2026-08-20T00:00:00.000Z',
    });
    expect(shouldProjectScoreEvent(unverified)).toBe(false);
    expect(isVerifiedCompletedParticipation(verified)).toBe(true);

    const event = buildOpportunityScoreEvent({
      participation: verified,
      opportunity: opportunity(),
      evaluation: {
        qualityScore: 80,
        impactScore: 60,
      },
    });
    expect(event.sourceTable).toBe('opportunity_participations');
    expect(event.sourceId).toBe('part-1');
    expect(event.eventType).toBe('opportunity_participation');
    expect(event.verified).toBe(true);
    expect(event.rawMeta).toEqual({ kind: 'education_to_contribution' });
    expect(event.capacityEstimate).toBe(80);
    expect(event.impactEstimate).toBe(75);
  });

  it('is idempotent for the same participation source id', () => {
    const verified = participation({
      status: 'completed',
      verificationStatus: 'verified',
      completedAt: '2026-08-20T00:00:00.000Z',
    });
    const first = buildOpportunityScoreEvent({
      participation: verified,
      opportunity: opportunity(),
    });
    const second = buildOpportunityScoreEvent({
      participation: verified,
      opportunity: opportunity({ title: 'Document a local clinic workflow' }),
    });
    expect(first.sourceTable).toBe(second.sourceTable);
    expect(first.sourceId).toBe(second.sourceId);
  });

  it('treats demonstrated skills as evidence, not a replacement for declared skills', () => {
    const result = demonstratedSkillsNotInDeclared({
      demonstrated: ['Documentation', 'Facilitation', 'documentation'],
      declaredHard: ['Documentation'],
      declaredSoft: ['Interviewing'],
    });
    expect(result.overlapping).toEqual(['Documentation']);
    expect(result.additional).toEqual(['Facilitation']);
  });

  it('does not emit demonstrated experience until the participation is verified and completed', () => {
    expect(
      demonstratedExperienceFromVerified({
        opportunity: opportunity(),
        participation: participation({ status: 'active' }),
      }),
    ).toBeNull();
    const demonstrated = demonstratedExperienceFromVerified({
      opportunity: opportunity(),
      participation: participation({
        status: 'completed',
        verificationStatus: 'verified',
        completedAt: '2026-08-20T00:00:00.000Z',
      }),
      skills: ['Documentation'],
    });
    expect(demonstrated?.title).toBe('Document a local clinic workflow');
    expect(demonstrated?.skills).toEqual(['Documentation']);
  });

  it('keeps opportunity cards to a few skill labels', () => {
    expect(opportunityCardSkills(opportunity())).toEqual(['Documentation', 'Interviewing', 'Spanish']);
    expect(
      opportunityCardSkills(
        opportunity({
          requiredSkills: ['A', 'B', 'C', 'D'],
          optionalSkills: ['E'],
        }),
        3,
      ),
    ).toHaveLength(3);
  });
});

describe('opportunity row mapping', () => {
  it('maps database rows without exposing draft as open', () => {
    const mapped = mapContributionOpportunity({
      id: 'opp-1',
      publisher_profile_id: 'org-1',
      title: 'Title here',
      summary: 'Short purpose',
      status: 'draft',
      opportunity_kind: 'education_to_contribution',
      required_skills: ['Writing'],
      optional_skills: [],
      is_remote: true,
      compensation_status: 'volunteer',
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mapped.status).toBe('draft');
    expect(mapped.requiredSkills).toEqual(['Writing']);
  });
});

describe('evaluation scores and applicant identity mapping', () => {
  it('accepts blank or 0–100 scores and rejects out of range values', () => {
    expect(parseOptionalEvaluationScore('')).toEqual({ ok: true, value: null });
    expect(parseOptionalEvaluationScore(' 82 ')).toEqual({ ok: true, value: 82 });
    expect(parseOptionalEvaluationScore('0')).toEqual({ ok: true, value: 0 });
    expect(parseOptionalEvaluationScore('100')).toEqual({ ok: true, value: 100 });
    expect(parseOptionalEvaluationScore('101').ok).toBe(false);
    expect(parseOptionalEvaluationScore('-1').ok).toBe(false);
  });

  it('maps applicant identity without attaching it to the participation row', () => {
    const identity = mapOpportunityApplicantIdentity({
      participation_id: 'part-1',
      profile_id: 'user-2',
      display_name: 'Ada Example',
      username: 'ada',
      avatar_url: 'https://example.test/ada.png',
    });
    expect(identity).toEqual({
      participationId: 'part-1',
      profileId: 'user-2',
      displayName: 'Ada Example',
      username: 'ada',
      avatarUrl: 'https://example.test/ada.png',
    });
    expect(participation({ participantProfileId: 'user-2' })).not.toHaveProperty('displayName');
  });
});
