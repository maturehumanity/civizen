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
  completeCommunityChallenge,
  createCommunityChallenge,
  createImplementationOpportunity,
  linkImplementationOpportunity,
  listProjectOpportunities,
  getChallengeIdForProject,
  selectChallengeProposal,
  submitChallengeProposal,
} from '@/lib/challenges-api';

describe('challenges API service boundary', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('creates challenges and proposals through RPCs rather than table inserts', async () => {
    rpc.mockResolvedValue({ data: 'ch-1', error: null });
    await createCommunityChallenge({
      programId: 'prog-1',
      title: 'Restore water to the shared community garden',
      problemStatement: 'The neighborhood garden lost its water connection last season.',
      whyItMatters: 'The garden is one of the few shared growing spaces.',
      successCriteria: 'Water reaches the beds and half are planted again.',
    });
    expect(rpc).toHaveBeenCalledWith('create_community_challenge', {
      payload: expect.objectContaining({
        program_id: 'prog-1',
        title: 'Restore water to the shared community garden',
        status: 'draft',
      }),
    });
    expect(from).not.toHaveBeenCalled();

    rpc.mockResolvedValue({ data: 'prop-1', error: null });
    await submitChallengeProposal('ch-1', {
      title: 'Collect rainwater and water the beds with drip lines',
      rationale: 'A tank and drip tape can water the beds.',
      expectedResult: 'Beds receive water maintained by garden members.',
    });
    expect(rpc).toHaveBeenCalledWith('submit_challenge_proposal', {
      p_challenge_id: 'ch-1',
      payload: expect.objectContaining({
        title: 'Collect rainwater and water the beds with drip lines',
      }),
    });
  });

  it('selects a proposal into an implementation project and links opportunities through RPCs', async () => {
    rpc.mockResolvedValue({ data: 'proj-1', error: null });
    await selectChallengeProposal('prop-1');
    expect(rpc).toHaveBeenCalledWith('select_challenge_proposal', { p_proposal_id: 'prop-1' });

    rpc.mockResolvedValue({ data: 'opp-1', error: null });
    await createImplementationOpportunity('proj-1', {
      title: 'Map garden beds and the current water points',
      summary: 'Walk the plot with two garden members.',
    });
    expect(rpc).toHaveBeenCalledWith('create_implementation_opportunity', {
      p_project_id: 'proj-1',
      payload: expect.objectContaining({
        title: 'Map garden beds and the current water points',
      }),
    });

    rpc.mockResolvedValue({ data: null, error: null });
    await linkImplementationOpportunity('proj-1', 'opp-2');
    expect(rpc).toHaveBeenCalledWith('link_implementation_opportunity', {
      p_project_id: 'proj-1',
      p_opportunity_id: 'opp-2',
    });
  });

  it('completes a challenge through the RPC that creates the solution record', async () => {
    rpc.mockResolvedValue({ data: 'sol-1', error: null });
    const id = await completeCommunityChallenge('ch-1');
    expect(id).toBe('sol-1');
    expect(rpc).toHaveBeenCalledWith('complete_community_challenge', { p_challenge_id: 'ch-1' });
  });

  it('lists project opportunities through a filtered table read, not a second work engine', async () => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    Object.assign(builder, {
      select: chain,
      eq: chain,
      order: async () => ({
        data: [
          {
            id: 'opp-1',
            title: 'Map garden beds and the current water points',
            status: 'open',
            summary: 'Walk the plot with two garden members.',
          },
        ],
        error: null,
      }),
    });
    from.mockReturnValue(builder);
    const rows = await listProjectOpportunities('proj-1');
    expect(from).toHaveBeenCalledWith('contribution_opportunities');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Map garden beds and the current water points');
  });

  it('resolves a Project back to its Challenge id', async () => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    Object.assign(builder, {
      select: chain,
      eq: chain,
      maybeSingle: async () => ({ data: { challenge_id: 'ch-1' }, error: null }),
    });
    from.mockReturnValue(builder);
    await expect(getChallengeIdForProject('proj-1')).resolves.toBe('ch-1');
    expect(from).toHaveBeenCalledWith('implementation_projects');
  });

  it('surfaces selection permission errors from the database', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_authorized' } });
    await expect(selectChallengeProposal('prop-1')).rejects.toThrow('not_authorized');
  });
});
