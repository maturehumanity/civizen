import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  AI_AGENT_FORBIDDEN_CAPABILITIES,
  DEFAULT_CAPABILITIES_BY_ROLE,
  agentRoleLabel,
  artifactProvisionalLabel,
  facilitationSections,
  isForbiddenAgentMutation,
  parsePlanProposal,
} from '@/lib/matters-ai';
import { actorLabel, actorsEqual } from '@/lib/matters';

const phase4a = readFileSync('supabase/migrations/20260902160000_matter_ai_collaboration_phase4a.sql', 'utf8');
const phase4aStab = readFileSync('supabase/migrations/20260902170000_matter_ai_phase4a_stabilization.sql', 'utf8');

describe('Matter AI actor identity', () => {
  it('labels AI actors distinctly from humans', () => {
    expect(actorLabel({ kind: 'ai_agent', profileId: null, agentId: 'b0000000-0000-4000-8000-000000000001', displayName: 'Research Agent' }))
      .toBe('Research Agent · AI');
    expect(agentRoleLabel('research')).toBe('AI Research');
  });

  it('compares AI actors by agent id', () => {
    const a = { kind: 'ai_agent' as const, profileId: null, agentId: 'agent-1', displayName: 'Research Agent' };
    const b = { kind: 'ai_agent' as const, profileId: null, agentId: 'agent-1', displayName: 'Research Agent' };
    const c = { kind: 'ai_agent' as const, profileId: null, agentId: 'agent-2', displayName: 'Planning Agent' };
    expect(actorsEqual(a, b)).toBe(true);
    expect(actorsEqual(a, c)).toBe(false);
  });
});

describe('Matter AI permission model', () => {
  it('does not grant forbidden capability strings in default role profiles', () => {
    const forbidden = new Set<string>(AI_AGENT_FORBIDDEN_CAPABILITIES as unknown as string[]);
    for (const caps of Object.values(DEFAULT_CAPABILITIES_BY_ROLE)) {
      for (const cap of caps) {
        expect(forbidden.has(cap)).toBe(false);
      }
    }
  });

  it('blocks accountable Matter mutations from agent shortcut helpers', () => {
    expect(isForbiddenAgentMutation('accept_responsibility')).toBe(true);
    expect(isForbiddenAgentMutation('confirm_resolved')).toBe(true);
    expect(isForbiddenAgentMutation('close')).toBe(true);
    expect(isForbiddenAgentMutation('respond')).toBe(false);
  });
});

describe('Facilitation structured output', () => {
  it('parses facilitation sections without erasing discussion', () => {
    const body = [
      'Current discussion centers on assessment clarity.',
      '### Open questions',
      '- What evidence do users need?',
      '### Points of agreement',
      '- Everyone wants clearer reasoning',
      '### Suggested next actions',
      '- Draft revised copy',
    ].join('\n');
    const parsed = facilitationSections(body);
    expect(parsed.openQuestions).toContain('What evidence do users need?');
    expect(parsed.agreement).toContain('Everyone wants clearer reasoning');
    expect(parsed.suggestedActions).toContain('Draft revised copy');
  });
});

describe('Planning proposal parsing', () => {
  it('parses structured plan JSON without auto-creating Tasks', () => {
    const plan = parsePlanProposal(JSON.stringify({
      title: 'Proposed resolution plan',
      tasks: [
        { title: 'Revise explanatory copy', dependsOn: [] },
        { title: 'Expose assessment reasoning', dependsOn: ['Revise explanatory copy'] },
      ],
    }));
    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks[1].dependsOn).toContain('Revise explanatory copy');
  });

  it('labels AI artifacts as provisional until human review', () => {
    expect(artifactProvisionalLabel('proposed_plan', 'pending')).toMatch(/Proposed/);
    expect(artifactProvisionalLabel('research_summary', 'pending')).toMatch(/Awaiting human review/);
  });
});

describe('Matter Phase 4A SQL security', () => {
  it('registers ai_agents without profile impersonation', () => {
    expect(phase4a).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_agents/);
    expect(phase4a).toMatch(/assigned_agent_id uuid REFERENCES public\.ai_agents/);
    expect(phase4a).toMatch(/actor_agent_id uuid REFERENCES public\.ai_agents/);
  });

  it('binds agent runs to assignments and revokes service completion from authenticated', () => {
    expect(phase4a).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_agent_runs/);
    expect(phase4a).toMatch(/matter_complete_agent_run_service/);
    expect(phase4a).toMatch(/REVOKE ALL ON FUNCTION public\.matter_complete_agent_run_service/);
  });

  it('blocks agent-context Matter closure and responsibility mutations', () => {
    expect(phase4a).toMatch(/matter_agent_run_blocked_mutations/);
    expect(phase4a).toMatch(/matter_is_ai_agent_forbidden_responsibility/);
  });

  it('requires human supervisor on assignment', () => {
    expect(phase4a).toMatch(/supervising_profile_id uuid NOT NULL/);
    expect(phase4a).toMatch(/Choose a supervising human reviewer/);
  });

  it('records AI comments with is_ai_agent flag', () => {
    expect(phase4a).toMatch(/is_ai_agent boolean/);
    expect(phase4a).toMatch(/add_matter_ai_comment/);
  });

  it('does not let prompt-injection text alter server authority via blocked mutations', () => {
    expect(phase4a).toMatch(/PERFORM public\.matter_agent_run_blocked_mutations/);
  });

  it('authorizes agent run triggers server-side before privileged execution', () => {
    expect(phase4aStab).toMatch(/authorize_matter_agent_run/);
    expect(phase4aStab).toMatch(/You are not authorized to trigger this agent run/);
    expect(phase4aStab).toMatch(/GRANT EXECUTE ON FUNCTION public\.authorize_matter_agent_run/);
    expect(phase4aStab).toMatch(/REVOKE ALL ON FUNCTION public\.fail_matter_agent_run_service/);
  });

  it('rejects unauthorized, cancelled, completed, and spoofed agent run triggers', () => {
    expect(phase4aStab).toMatch(/This agent run is not actionable/);
    expect(phase4aStab).toMatch(/This agent assignment is not active/);
    expect(phase4aStab).toMatch(/Agent run not found/);
    expect(phase4aStab).toMatch(/You cannot access this Matter/);
    expect(phase4aStab).toMatch(/matter_can_manage_work/);
  });

  it('supports selective plan task adoption without auto-assigning humans', () => {
    expect(phase4aStab).toMatch(/adopt_matter_agent_plan_task/);
    expect(phase4aStab).toMatch(/ai_plan_task_adopted/);
    expect(phase4aStab).toMatch(/Only planning proposals can be adopted as Tasks/);
  });

  it('restores Phase 3 resolutions in get_matter', () => {
    expect(phase4aStab).toMatch(/'resolutions', coalesce/);
    expect(phase4aStab).toMatch(/matter_resolutions r WHERE r\.matter_id = p_matter_id/);
  });
});
