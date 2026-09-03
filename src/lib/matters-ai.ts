/**
 * Matter Collaboration Phase 4A — Human–AI collaboration domain types.
 */

export const AI_AGENT_ROLE_TYPES = [
  'research',
  'analysis',
  'planning',
  'facilitation',
  'documentation',
  'coding',
] as const;
export type AiAgentRoleType = (typeof AI_AGENT_ROLE_TYPES)[number];

export const AI_AGENT_STATUSES = ['active', 'inactive', 'deprecated'] as const;
export type AiAgentStatus = (typeof AI_AGENT_STATUSES)[number];

export const MATTER_AGENT_ASSIGNMENT_STATUSES = [
  'active',
  'queued',
  'running',
  'submitted',
  'awaiting_review',
  'changes_requested',
  'completed',
  'failed',
  'cancelled',
] as const;
export type MatterAgentAssignmentStatus = (typeof MATTER_AGENT_ASSIGNMENT_STATUSES)[number];

export const AI_AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'waiting_for_human',
  'submitted',
  'failed',
  'cancelled',
] as const;
export type AiAgentRunStatus = (typeof AI_AGENT_RUN_STATUSES)[number];

export const AI_AGENT_CAPABILITIES = [
  'matter.read',
  'discussion.read',
  'discussion.comment',
  'task.read',
  'task.submit',
  'evidence.read',
  'evidence.add',
  'decision.propose',
  'task.propose',
  'resolution.read',
  'repository.read',
  'repository.write',
  'command.run',
  'test.run',
  'diff.read',
  'artifact.add',
] as const;
export type AiAgentCapability = (typeof AI_AGENT_CAPABILITIES)[number];

/** Capabilities AI agents must never receive in Phase 4A. */
export const AI_AGENT_FORBIDDEN_CAPABILITIES = [
  'matter.accept_responsibility',
  'matter.close',
  'resolution.confirm',
  'resolution.propose_as_lead',
  'decision.accept',
  'evaluation.submit',
  'permission.alter',
  'escalation.alter',
] as const;

export const AI_CONTEXT_SCOPES = [
  'matter_overview',
  'discussion',
  'tasks',
  'decisions',
  'evidence',
  'activity',
] as const;
export type AiContextScope = (typeof AI_CONTEXT_SCOPES)[number];

export const AGENT_ARTIFACT_TYPES = [
  'research_summary',
  'analysis',
  'proposed_plan',
  'facilitation_summary',
  'documentation',
  'submission',
  'implementation_plan',
  'code_change',
  'scope_expansion_request',
  'command_denial',
] as const;
export type AgentArtifactType = (typeof AGENT_ARTIFACT_TYPES)[number];

export const AGENT_ARTIFACT_REVIEW_STATUSES = [
  'pending',
  'accepted',
  'changes_requested',
  'rejected',
] as const;
export type AgentArtifactReviewStatus = (typeof AGENT_ARTIFACT_REVIEW_STATUSES)[number];

export type AiAgent = {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  roleType: AiAgentRoleType;
  status: AiAgentStatus;
  providerRef: string | null;
  modelRef: string | null;
  capabilityProfile: Record<string, unknown>;
};

export type MatterAgentAssignment = {
  id: string;
  matterId: string;
  taskId: string | null;
  agentId: string;
  agentDisplayName?: string;
  agentRoleType?: AiAgentRoleType;
  assignedBy: { kind: 'person' | 'organization'; profileId: string };
  supervisor: { kind: 'person' | 'organization'; profileId: string };
  rolePurpose: string;
  instructions: string;
  allowedContext: AiContextScope[];
  allowedCapabilities: AiAgentCapability[];
  status: MatterAgentAssignmentStatus;
  maxRunAttempts: number;
  codingPolicy?: Record<string, unknown>;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type AiAgentRun = {
  id: string;
  assignmentId: string;
  taskId: string | null;
  triggeredBy: string;
  status: AiAgentRunStatus;
  revisionNumber: number;
  startedAt: string | null;
  finishedAt: string | null;
  inputContext: Record<string, unknown> | null;
  outputSummary: string | null;
  failureReason: string | null;
  usageMetadata: Record<string, unknown> | null;
  createdAt: string;
};

export type MatterAgentArtifact = {
  id: string;
  runId: string;
  assignmentId: string;
  matterId: string;
  artifactType: AgentArtifactType;
  title: string;
  body: string;
  sourceReferences: Array<{ kind: string; label: string; ref?: string }>;
  reviewStatus: AgentArtifactReviewStatus;
  generatedByAgentId: string;
  agentDisplayName?: string;
  verificationState: string;
  createdAt: string;
};

export const AI_AGENT_IDS = {
  research: 'b0000000-0000-4000-8000-000000000001',
  analysis: 'b0000000-0000-4000-8000-000000000002',
  planning: 'b0000000-0000-4000-8000-000000000003',
  facilitation: 'b0000000-0000-4000-8000-000000000004',
  documentation: 'b0000000-0000-4000-8000-000000000005',
  coding: 'b0000000-0000-4000-8000-000000000006',
} as const;

export const DEFAULT_CAPABILITIES_BY_ROLE: Record<AiAgentRoleType, AiAgentCapability[]> = {
  research: ['matter.read', 'discussion.read', 'discussion.comment', 'task.read', 'task.submit', 'evidence.read', 'evidence.add', 'resolution.read'],
  analysis: ['matter.read', 'discussion.read', 'discussion.comment', 'task.read', 'task.submit', 'evidence.read', 'evidence.add', 'decision.propose', 'resolution.read'],
  planning: ['matter.read', 'discussion.read', 'task.read', 'task.propose', 'evidence.read', 'resolution.read'],
  facilitation: ['matter.read', 'discussion.read', 'discussion.comment', 'task.read', 'evidence.read', 'decision.propose', 'resolution.read'],
  documentation: ['matter.read', 'discussion.read', 'task.read', 'task.submit', 'evidence.read', 'evidence.add', 'resolution.read'],
  coding: [
    'matter.read', 'discussion.read', 'discussion.comment', 'task.read', 'task.submit',
    'evidence.read', 'evidence.add', 'repository.read', 'repository.write',
    'command.run', 'test.run', 'diff.read', 'artifact.add',
  ],
};

export const DEFAULT_CONTEXT_BY_ROLE: Record<AiAgentRoleType, AiContextScope[]> = {
  research: ['matter_overview', 'discussion', 'tasks', 'evidence', 'activity'],
  analysis: ['matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'],
  planning: ['matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'],
  facilitation: ['matter_overview', 'discussion', 'tasks', 'decisions', 'activity'],
  documentation: ['matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'],
  coding: ['matter_overview', 'discussion', 'tasks', 'evidence', 'activity'],
};

export function agentRoleLabel(roleType: AiAgentRoleType): string {
  switch (roleType) {
    case 'research':
      return 'AI Research';
    case 'analysis':
      return 'AI Analysis';
    case 'planning':
      return 'AI Planning';
    case 'facilitation':
      return 'AI Facilitation';
    case 'documentation':
      return 'AI Documentation';
    case 'coding':
      return 'Code';
    default:
      return 'AI Agent';
  }
}

export function isForbiddenAgentMutation(action: string): boolean {
  const blocked = new Set([
    'accept_responsibility',
    'accept_jointly',
    'partially_accept',
    'close',
    'confirm_resolved',
    'confirm_partially_resolved',
    'confirm_not_resolved',
    'mark_addressed',
    'reopen',
  ]);
  return blocked.has(action);
}

export type ProposedPlanTask = {
  title: string;
  description?: string;
  dependsOn?: string[];
};

export function parsePlanProposal(body: string): {
  title: string;
  tasks: ProposedPlanTask[];
  risks?: string[];
} {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const tasks = Array.isArray(data.tasks)
      ? data.tasks
        .map((item) => {
          const row = (typeof item === 'string' ? { title: item } : item) as Record<string, unknown>;
          return {
            title: String(row.title ?? '').trim(),
            description: row.description ? String(row.description) : undefined,
            dependsOn: Array.isArray(row.dependsOn)
              ? row.dependsOn.map((dep) => String(dep)).filter(Boolean)
              : undefined,
          };
        })
        .filter((task) => task.title.length > 0)
      : [];
    return {
      title: String(data.title ?? 'Proposed resolution plan'),
      tasks,
      risks: Array.isArray(data.risks) ? data.risks.map((risk) => String(risk)) : undefined,
    };
  } catch {
    const tasks: ProposedPlanTask[] = [];
    for (const line of body.split('\n')) {
      const match = line.match(/^-\s+(.+)$/);
      if (match) tasks.push({ title: match[1].trim() });
    }
    return { title: 'Proposed resolution plan', tasks };
  }
}

export function artifactProvisionalLabel(
  artifactType: AgentArtifactType,
  reviewStatus: AgentArtifactReviewStatus,
): string {
  if (reviewStatus === 'accepted') return 'Accepted by human review';
  if (reviewStatus === 'changes_requested') return 'Changes requested';
  if (reviewStatus === 'rejected') return 'Rejected';
  if (artifactType === 'proposed_plan') return 'Proposed — not created as Tasks yet';
  if (artifactType === 'facilitation_summary') return 'Suggested — not a formal Decision';
  if (artifactType === 'implementation_plan') return 'Proposed implementation — awaiting human approval';
  if (artifactType === 'code_change') return 'AI code change — not committed or deployed';
  if (artifactType === 'scope_expansion_request') return 'Scope expansion required';
  return 'Awaiting human review';
}

export function facilitationSections(body: string): {
  summary: string;
  openQuestions: string[];
  agreement: string[];
  disagreement: string[];
  possibleDecisions: string[];
  suggestedActions: string[];
} {
  const lines = body.split('\n');
  const section = (header: string) => {
    const idx = lines.findIndex((l) => l.toLowerCase().includes(header.toLowerCase()));
    if (idx < 0) return [] as string[];
    const out: string[] = [];
    for (let i = idx + 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (line.startsWith('###')) break;
      if (line.startsWith('- ')) out.push(line.slice(2).trim());
    }
    return out;
  };
  return {
    summary: body.split('###')[0]?.trim() ?? body,
    openQuestions: section('open questions'),
    agreement: section('points of agreement'),
    disagreement: section('points of disagreement'),
    possibleDecisions: section('possible decisions'),
    suggestedActions: section('suggested next actions'),
  };
}
