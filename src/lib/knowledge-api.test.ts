import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc,
    from,
  },
}));

import {
  convertGapToChallenge,
  convertGapToOpportunity,
  createKnowledgeGap,
  createKnowledgeResource,
  createKnowledgeSpace,
  publishSolutionRecordAsResource,
  resolveKnowledgeGap,
  setKnowledgeResourceStatus,
} from '@/lib/knowledge-api';

describe('knowledge API service boundary', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('creates spaces, resources, and gaps through RPCs rather than table inserts', async () => {
    rpc.mockResolvedValue({ data: 'space-1', error: null });
    await createKnowledgeSpace({
      programId: 'prog-1',
      title: 'Neighborhood practical knowledge',
      summary: 'Short reusable notes neighbors can actually use.',
    });
    expect(rpc).toHaveBeenCalledWith('create_knowledge_space', {
      payload: expect.objectContaining({
        program_id: 'prog-1',
        title: 'Neighborhood practical knowledge',
        status: 'draft',
      }),
    });
    expect(from).not.toHaveBeenCalled();

    rpc.mockResolvedValue({ data: 'res-1', error: null });
    await createKnowledgeResource({
      spaceId: 'space-1',
      title: 'How to set up a surplus-food table',
      summary: 'A one-evening method for sharing leftover market food.',
      resourceType: 'guide',
      attributions: [
        { attributionKind: 'person', profileId: 'coord-1' },
        { attributionKind: 'organization', organizationName: 'Neighborhood Health Circle' },
      ],
    });
    expect(rpc).toHaveBeenCalledWith('create_knowledge_resource', {
      payload: expect.objectContaining({
        space_id: 'space-1',
        resource_type: 'guide',
        attributions: [
          { attribution_kind: 'person', profile_id: 'coord-1', organization_name: null },
          {
            attribution_kind: 'organization',
            profile_id: null,
            organization_name: 'Neighborhood Health Circle',
          },
        ],
      }),
    });

    rpc.mockResolvedValue({ data: 'gap-1', error: null });
    await createKnowledgeGap({
      spaceId: 'space-1',
      title: 'Safe walking after dark is still undocumented',
      description: 'Neighbors still lack a short note on which streets stay dark.',
    });
    expect(rpc).toHaveBeenCalledWith('create_knowledge_gap', {
      payload: expect.objectContaining({
        space_id: 'space-1',
        gap_kind: 'missing',
      }),
    });
  });

  it('converts gaps into the existing opportunity and challenge engines', async () => {
    rpc.mockResolvedValue({ data: 'opp-1', error: null });
    await convertGapToOpportunity('gap-1', {
      title: 'Write a short note on unlit walking streets',
      summary: 'Walk two streets after dusk and record where light is missing.',
    });
    expect(rpc).toHaveBeenCalledWith('convert_knowledge_gap_to_opportunity', {
      p_gap_id: 'gap-1',
      payload: expect.objectContaining({
        title: 'Write a short note on unlit walking streets',
      }),
    });

    rpc.mockResolvedValue({ data: 'ch-1', error: null });
    await convertGapToChallenge('gap-1', {
      title: 'Restore reliable watering for the shared garden',
      problemStatement: 'Beds dry out between volunteer visits.',
      whyItMatters: 'The garden is one of the few shared growing spaces.',
      successCriteria: 'A watering routine that two members can keep.',
    });
    expect(rpc).toHaveBeenCalledWith('convert_knowledge_gap_to_challenge', {
      p_gap_id: 'gap-1',
      payload: expect.objectContaining({
        problem_statement: 'Beds dry out between volunteer visits.',
      }),
    });
  });

  it('links results back and publishes a solution record as a resource through RPCs', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await resolveKnowledgeGap('gap-1', {
      status: 'resolved',
      resultResourceId: 'res-1',
      resolutionNotes: 'The surplus-table guide now covers the missing steps.',
    });
    expect(rpc).toHaveBeenCalledWith('resolve_knowledge_gap', {
      p_gap_id: 'gap-1',
      payload: expect.objectContaining({
        status: 'resolved',
        result_resource_id: 'res-1',
      }),
    });

    rpc.mockResolvedValue({ data: 'res-9', error: null });
    const id = await publishSolutionRecordAsResource('sol-1', 'space-1');
    expect(id).toBe('res-9');
    expect(rpc).toHaveBeenCalledWith('publish_solution_record_as_resource', {
      p_solution_id: 'sol-1',
      p_space_id: 'space-1',
    });

    rpc.mockResolvedValue({ data: null, error: null });
    await setKnowledgeResourceStatus('res-1', 'reviewed');
    expect(rpc).toHaveBeenCalledWith('set_knowledge_resource_status', {
      p_resource_id: 'res-1',
      p_status: 'reviewed',
    });
  });

  it('surfaces coordinator permission errors from the database', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_authorized' } });
    await expect(
      createKnowledgeSpace({
        programId: 'prog-1',
        title: 'Neighborhood practical knowledge',
        summary: 'Short reusable notes neighbors can actually use.',
      }),
    ).rejects.toThrow('not_authorized');
  });
});
