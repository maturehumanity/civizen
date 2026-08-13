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
  applyToContributionOpportunity,
  createContributionOpportunity,
  evaluateOpportunityWork,
  listOpenOpportunities,
  listOpportunityApplicantIdentities,
  listVerifiedSkillEvidenceForProfile,
} from '@/lib/opportunities-api';

describe('opportunities API service boundary', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('creates and applies through RPCs rather than table inserts', async () => {
    rpc.mockResolvedValue({ data: 'opp-1', error: null });
    await createContributionOpportunity({
      title: 'Clinic workflow',
      summary: 'Document intake.',
    });
    expect(rpc).toHaveBeenCalledWith('create_contribution_opportunity', {
      payload: expect.objectContaining({
        title: 'Clinic workflow',
        opportunity_kind: 'education_to_contribution',
        status: 'draft',
      }),
    });

    rpc.mockResolvedValue({ data: 'part-1', error: null });
    await applyToContributionOpportunity('opp-1', 'I can help this week.');
    expect(rpc).toHaveBeenCalledWith('apply_to_contribution_opportunity', {
      p_opportunity_id: 'opp-1',
      p_message: 'I can help this week.',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('evaluates through the RPC and surfaces database errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'self_evaluation_forbidden' } });
    await expect(
      evaluateOpportunityWork({
        participationId: 'part-1',
        decision: 'verified',
      }),
    ).rejects.toThrow('self_evaluation_forbidden');
    expect(rpc).toHaveBeenCalledWith(
      'evaluate_opportunity_work',
      expect.objectContaining({
        p_participation_id: 'part-1',
        p_decision: 'verified',
      }),
    );
  });

  it('lists open opportunities with a status filter', async () => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    Object.assign(builder, {
      select: chain,
      eq: chain,
      order: async () => ({
        data: [
          {
            id: 'opp-1',
            publisher_profile_id: 'org-1',
            title: 'Clinic workflow',
            summary: 'Document intake.',
            status: 'open',
            opportunity_kind: 'education_to_contribution',
            required_skills: ['Documentation'],
            optional_skills: [],
            is_remote: true,
            compensation_status: 'learning',
            created_at: '2026-08-13T00:00:00.000Z',
            updated_at: '2026-08-13T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    });
    from.mockReturnValue(builder);

    const rows = await listOpenOpportunities();
    expect(from).toHaveBeenCalledWith('contribution_opportunities');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('open');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('surfaces duplicate-application errors from the apply RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'already_applied' } });
    await expect(applyToContributionOpportunity('opp-1', 'Again.')).rejects.toThrow('already_applied');
  });

  it('loads skill evidence only for verified completed participations', async () => {
    const partsBuilder: Record<string, unknown> = {};
    const chain = () => partsBuilder;
    Object.assign(partsBuilder, {
      select: chain,
      eq: chain,
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    });
    from.mockReturnValue(partsBuilder);

    const rows = await listVerifiedSkillEvidenceForProfile('user-1');
    expect(from).toHaveBeenCalledWith('opportunity_participations');
    expect(rows).toEqual([]);
  });

  it('reads applicant identity through the organizer RPC', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          participation_id: 'part-1',
          profile_id: 'user-2',
          display_name: 'Ada Example',
          username: 'ada',
          avatar_url: null,
        },
      ],
      error: null,
    });
    const rows = await listOpportunityApplicantIdentities('opp-1');
    expect(rpc).toHaveBeenCalledWith('list_opportunity_applicant_identities', {
      p_opportunity_id: 'opp-1',
    });
    expect(rows[0]?.displayName).toBe('Ada Example');
    expect(from).not.toHaveBeenCalled();
  });

  it('passes optional quality and impact scores through evaluate', async () => {
    rpc.mockResolvedValue({ data: 'eval-1', error: null });
    await evaluateOpportunityWork({
      participationId: 'part-1',
      decision: 'verified',
      qualityScore: 80,
      impactScore: 70,
    });
    expect(rpc).toHaveBeenCalledWith(
      'evaluate_opportunity_work',
      expect.objectContaining({
        p_quality_score: 80,
        p_impact_score: 70,
      }),
    );
  });

  it('rejects evaluation scores outside 0–100 before calling the RPC', async () => {
    await expect(
      evaluateOpportunityWork({
        participationId: 'part-1',
        decision: 'verified',
        qualityScore: 140,
      }),
    ).rejects.toThrow('invalid_evaluation_score');
    expect(rpc).not.toHaveBeenCalled();
  });
});
