import { describe, expect, it } from 'vitest';

import {
  assessmentSummaryScore,
  buildOpportunityScoreEvent,
  canApplyToOpportunity,
  canEvaluateWork,
  canRecordWorkAssessment,
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
  performanceFactorsFromAssessment,
  profileCanManagePublisher,
  sanitizeEvaluationDimensions,
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
    evaluationDimensions: [],
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
    expect(
      organizerNextAction(
        participation({ status: 'completed', verificationStatus: 'verified' }),
        opportunity({ evaluationDimensions: ['quality'] }),
      ),
    ).toBe('assess');
    expect(
      organizerNextAction(
        participation({ status: 'completed', verificationStatus: 'verified' }),
        opportunity(),
      ),
    ).toBe('none');
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
    expect(event.impactEstimate).toBe(60);
    expect(event.collaborationEstimate).toBe(40);
  });

  it('projects a score event for verified work even when no evaluation was recorded', () => {
    const verified = participation({
      status: 'completed',
      verificationStatus: 'verified',
      completedAt: '2026-08-20T00:00:00.000Z',
    });
    expect(shouldProjectScoreEvent(verified)).toBe(true);
    const event = buildOpportunityScoreEvent({
      participation: verified,
      opportunity: opportunity(),
    });
    expect(event.capacityEstimate).toBe(75);
    expect(event.impactEstimate).toBe(70);
    expect(event.collaborationEstimate).toBe(40);
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

  it('maps community implementation opportunities without treating them as professional listings', () => {
    const mapped = mapContributionOpportunity({
      id: 'opp-2',
      publisher_profile_id: 'org-1',
      title: 'Map garden beds and the current water points',
      summary: 'Walk the plot with two garden members.',
      status: 'open',
      opportunity_kind: 'community_implementation',
      required_skills: [],
      optional_skills: [],
      is_remote: false,
      compensation_status: 'volunteer',
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mapped.opportunityKind).toBe('community_implementation');
    expect(mapped.status).toBe('open');
  });

  it('maps knowledge-gap opportunities without treating them as professional listings', () => {
    const mapped = mapContributionOpportunity({
      id: 'opp-3',
      publisher_profile_id: 'org-1',
      title: 'Write a short note on unlit walking streets',
      summary: 'Walk two streets after dusk and record where light is missing.',
      status: 'open',
      opportunity_kind: 'knowledge_gap',
      required_skills: [],
      optional_skills: [],
      is_remote: false,
      compensation_status: 'volunteer',
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mapped.opportunityKind).toBe('knowledge_gap');
    expect(mapped.status).toBe('open');
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

describe('optional work assessment independent of verification', () => {
  const verified = participation({
    status: 'completed',
    verificationStatus: 'verified',
    completedAt: '2026-08-20T00:00:00.000Z',
  });

  it('keeps unknown or duplicate dimension choices out of the opportunity config', () => {
    expect(sanitizeEvaluationDimensions(['quality', 'impact', 'quality', 'unknown'])).toEqual([
      'quality',
      'impact',
    ]);
    expect(sanitizeEvaluationDimensions(['impact', 'completion', 'collaboration'])).toEqual([
      'completion',
      'collaboration',
      'impact',
    ]);
  });

  it('allows evaluation only after verified completion and only for selected dimensions', () => {
    expect(
      canRecordWorkAssessment({
        participation: participation({ status: 'submitted', verificationStatus: 'pending' }),
        evaluationDimensions: ['quality'],
      }),
    ).toBe(false);
    expect(
      canRecordWorkAssessment({
        participation: verified,
        evaluationDimensions: [],
      }),
    ).toBe(false);
    expect(
      canRecordWorkAssessment({
        participation: verified,
        evaluationDimensions: ['quality', 'impact'],
      }),
    ).toBe(true);
    expect(canEvaluateWork(participation({ status: 'submitted', verificationStatus: 'pending' }))).toBe(
      true,
    );
    expect(canEvaluateWork(verified)).toBe(false);
  });

  it('maps only quality, impact, and collaboration into Performance estimates', () => {
    const withSelected = performanceFactorsFromAssessment({
      assessment: {
        scores: {
          completion: 40,
          quality: 90,
          reliability: 20,
          collaboration: 80,
          outcome: 15,
          impact: 60,
        },
      },
    });
    expect(withSelected.capacityEstimate).toBe(90);
    expect(withSelected.impactEstimate).toBe(60);
    expect(withSelected.collaborationEstimate).toBe(80);

    const withoutPerformanceDims = performanceFactorsFromAssessment({
      assessment: {
        scores: { completion: 40, reliability: 20, outcome: 15 },
      },
    });
    expect(withoutPerformanceDims.capacityEstimate).toBe(75);
    expect(withoutPerformanceDims.impactEstimate).toBe(70);
    expect(withoutPerformanceDims.collaborationEstimate).toBe(40);
  });

  it('summarizes selected scored dimensions without requiring every dimension', () => {
    expect(
      assessmentSummaryScore({ quality: 80, impact: 70, completion: null }, ['quality', 'impact', 'completion']),
    ).toBe(75);
    const event = buildOpportunityScoreEvent({
      participation: verified,
      opportunity: opportunity({ evaluationDimensions: ['quality', 'completion'] }),
      assessment: { scores: { quality: 88, completion: 40 } },
    });
    expect(event.capacityEstimate).toBe(88);
    expect(event.collaborationEstimate).toBe(40);
  });
});
