import { describe, expect, it } from 'vitest';

import { mapContributionProgram, mapSolutionRecord } from '@/lib/challenges-map';
import {
  attributionLabel,
  canConvertGapToChallenge,
  canConvertGapToOpportunity,
  canCreateKnowledgeSpace,
  canManageKnowledgeSpace,
  canPublishSolutionRecordAsResource,
  canResolveKnowledgeGap,
  pathwayResources,
  publicSpaceStage,
  spaceCardAction,
  type KnowledgeGap,
  type KnowledgeResource,
  type KnowledgeSpace,
} from '@/lib/knowledge';
import { mapKnowledgeGap, mapKnowledgeResource, mapKnowledgeSpace } from '@/lib/knowledge-map';
import { mapContributionOpportunity } from '@/lib/opportunities-map';

function space(overrides: Partial<KnowledgeSpace> = {}): KnowledgeSpace {
  return {
    id: 'space-1',
    publisherProfileId: 'coord-1',
    programId: 'prog-1',
    title: 'Neighborhood practical knowledge',
    summary: 'Short reusable notes neighbors can actually use.',
    description: null,
    areaNodeId: 'foundational_areas.v1.health',
    status: 'shared',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

function gap(overrides: Partial<KnowledgeGap> = {}): KnowledgeGap {
  return {
    id: 'gap-1',
    spaceId: 'space-1',
    publisherProfileId: 'coord-1',
    programId: 'prog-1',
    title: 'Safe walking after dark is still undocumented',
    description: 'Neighbors still lack a short note on which streets stay dark.',
    gapKind: 'missing',
    status: 'open',
    opportunityId: null,
    challengeId: null,
    resultResourceId: null,
    resultSolutionRecordId: null,
    resolutionNotes: null,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

function resource(overrides: Partial<KnowledgeResource> = {}): KnowledgeResource {
  return {
    id: 'res-1',
    spaceId: 'space-1',
    publisherProfileId: 'coord-1',
    programId: 'prog-1',
    title: 'How to set up a surplus-food table',
    summary: 'A one-evening method for sharing leftover market food.',
    resourceType: 'guide',
    bodyText: null,
    externalUrl: null,
    relatedSkills: ['Coordination'],
    status: 'reviewed',
    reviewerNotes: null,
    sourceEvidence: null,
    uncertaintyNotes: null,
    challengeId: null,
    opportunityId: null,
    solutionRecordId: null,
    pathwayOrder: 1,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('knowledge space permissions', () => {
  it('lets a signed-in profile create a space and only the publisher or linked owner manage it', () => {
    expect(canCreateKnowledgeSpace('user-1')).toBe(true);
    expect(canCreateKnowledgeSpace(null)).toBe(false);
    expect(canManageKnowledgeSpace({ space: space(), currentProfileId: 'coord-1' })).toBe(true);
    expect(canManageKnowledgeSpace({ space: space(), currentProfileId: 'user-1' })).toBe(false);
    expect(
      canManageKnowledgeSpace({
        space: space(),
        currentProfileId: 'user-1',
        ownedLinkedProfileIds: ['coord-1'],
      }),
    ).toBe(true);
    expect(spaceCardAction({ space: space(), currentProfileId: 'user-1' })).toBe('view');
    expect(spaceCardAction({ space: space(), currentProfileId: 'coord-1' })).toBe('manage');
    expect(publicSpaceStage('archived')).toBe('draft');
  });
});

describe('knowledge resource attribution and pathway', () => {
  it('keeps attribution concise and orders an optional pathway without becoming an LMS', () => {
    expect(
      attributionLabel({ displayName: 'Neighborhood Health Circle', attributionKind: 'organization' }),
    ).toBe('Neighborhood Health Circle');
    expect(attributionLabel({ displayName: '  ', attributionKind: 'person' })).toBe('Contributor');
    expect(
      pathwayResources([
        resource({ id: 'res-b', pathwayOrder: 2, title: 'After-school session notes' }),
        resource({ id: 'res-a', pathwayOrder: 1 }),
        resource({ id: 'res-c', pathwayOrder: null, title: 'Unsequenced note' }),
      ]).map((row) => row.id),
    ).toEqual(['res-a', 'res-b']);
  });
});

describe('knowledge gap conversion and resolution', () => {
  it('creates an open gap that can convert to an existing opportunity or challenge', () => {
    expect(canConvertGapToOpportunity({ gap: gap() })).toEqual({ ok: true });
    expect(canConvertGapToChallenge({ gap: gap() })).toEqual({ ok: true });
    expect(canConvertGapToOpportunity({ gap: gap({ opportunityId: 'opp-1' }) }).reason).toBe(
      'gap_already_has_opportunity',
    );
    expect(canConvertGapToChallenge({ gap: gap({ challengeId: 'ch-1' }) }).reason).toBe(
      'gap_already_has_challenge',
    );
    expect(canConvertGapToOpportunity({ gap: gap({ status: 'resolved' }) }).reason).toBe(
      'gap_already_resolved',
    );
  });

  it('requires a resulting resource or solution record before a full resolution', () => {
    expect(
      canResolveKnowledgeGap({
        gap: gap(),
        resolutionStatus: 'resolved',
      }).reason,
    ).toBe('result_required');
    expect(
      canResolveKnowledgeGap({
        gap: gap(),
        resolutionStatus: 'resolved',
        resultResourceId: 'res-1',
      }),
    ).toEqual({ ok: true });
    expect(
      canResolveKnowledgeGap({
        gap: gap(),
        resolutionStatus: 'partially_resolved',
      }),
    ).toEqual({ ok: true });
    expect(
      canResolveKnowledgeGap({
        gap: gap({ status: 'resolved' }),
        resolutionStatus: 'partially_resolved',
      }).reason,
    ).toBe('gap_already_resolved');
  });

  it('lets a solution record become a knowledge resource once', () => {
    expect(canPublishSolutionRecordAsResource({})).toEqual({ ok: true });
    expect(canPublishSolutionRecordAsResource({ existingResourceId: 'res-9' }).reason).toBe(
      'solution_already_published',
    );
  });
});

describe('knowledge mapping and Slice 1–3 kinds', () => {
  it('maps spaces, resources, and gaps from persisted rows', () => {
    const mappedSpace = mapKnowledgeSpace({
      id: 'space-1',
      publisher_profile_id: 'coord-1',
      program_id: 'prog-1',
      title: 'Neighborhood practical knowledge',
      summary: 'Short reusable notes neighbors can actually use.',
      status: 'shared',
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mappedSpace.status).toBe('shared');
    expect(mappedSpace.programId).toBe('prog-1');

    const mappedResource = mapKnowledgeResource({
      id: 'res-1',
      space_id: 'space-1',
      publisher_profile_id: 'coord-1',
      program_id: 'prog-1',
      title: 'How to set up a surplus-food table',
      summary: 'A one-evening method for sharing leftover market food.',
      resource_type: 'guide',
      status: 'reviewed',
      solution_record_id: 'sol-1',
      pathway_order: 1,
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mappedResource.resourceType).toBe('guide');
    expect(mappedResource.status).toBe('reviewed');
    expect(mappedResource.solutionRecordId).toBe('sol-1');

    const mappedGap = mapKnowledgeGap({
      id: 'gap-1',
      space_id: 'space-1',
      publisher_profile_id: 'coord-1',
      program_id: 'prog-1',
      title: 'Safe walking after dark is still undocumented',
      description: 'Neighbors still lack a short note on which streets stay dark.',
      gap_kind: 'missing',
      status: 'in_progress',
      opportunity_id: 'opp-1',
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
    });
    expect(mappedGap.opportunityId).toBe('opp-1');
    expect(mappedGap.status).toBe('in_progress');
  });

  it('keeps Shared Knowledge programs and gap opportunities distinct from professional listings', () => {
    expect(
      mapContributionProgram({
        id: 'prog-1',
        publisher_profile_id: 'coord-1',
        title: 'Shared Knowledge Challenge',
        summary: 'Collect practical neighborhood knowledge.',
        status: 'active',
        program_kind: 'shared_knowledge',
        created_at: '2026-08-13T00:00:00.000Z',
        updated_at: '2026-08-13T00:00:00.000Z',
      }).programKind,
    ).toBe('shared_knowledge');

    expect(
      mapContributionOpportunity({
        id: 'opp-3',
        publisher_profile_id: 'coord-1',
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
      }).opportunityKind,
    ).toBe('knowledge_gap');

    expect(
      mapSolutionRecord({
        id: 'sol-1',
        challenge_id: 'ch-1',
        program_id: 'prog-1',
        publisher_profile_id: 'coord-1',
        problem_context: 'Market food was wasted.',
        implemented_solution: 'A surplus table.',
        implementation_summary: 'Neighbors ran the table for two evenings.',
        outcome: 'Food was shared instead of discarded.',
        knowledge_resource_id: 'res-9',
        knowledge_space_id: 'space-1',
        created_at: '2026-08-13T00:00:00.000Z',
        updated_at: '2026-08-13T00:00:00.000Z',
      }),
    ).toMatchObject({
      knowledgeResourceId: 'res-9',
      knowledgeSpaceId: 'space-1',
    });
  });
});
