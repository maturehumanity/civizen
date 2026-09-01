/**
 * Phase 2 collaborative work types. Completing a Task never resolves the Matter.
 */

import type { MatterActorRef } from '@/lib/matters';

export const TASK_STATUSES = [
  'proposed',
  'assigned',
  'awaiting_acceptance',
  'accepted',
  'in_progress',
  'blocked',
  'waiting',
  'submitted',
  'under_review',
  'completed',
  'declined',
  'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_ASSIGNMENT_ROLES = ['lead', 'contributor', 'reviewer'] as const;
export type TaskAssignmentRole = (typeof TASK_ASSIGNMENT_ROLES)[number];

export const TASK_ACCEPTANCE_STATUSES = ['pending', 'accepted', 'declined', 'suggested_reassignment'] as const;
export type TaskAcceptanceStatus = (typeof TASK_ACCEPTANCE_STATUSES)[number];

export const COLLAB_ROLES = [
  'responsible_lead',
  'responsible_collaborator',
  'contributor',
  'specialist',
  'contractor',
  'observer',
  'evaluator',
] as const;
export type CollabRole = (typeof COLLAB_ROLES)[number];

export const DECISION_STATUSES = ['proposed', 'accepted', 'rejected', 'superseded'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export type CollaborationTask = {
  id: string;
  matterId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'normal' | 'high';
  status: TaskStatus;
  createdBy: MatterActorRef;
  lead: MatterActorRef | null;
  expectedOutcome: string | null;
  completionCriteria: string | null;
  reviewRequired: boolean;
  currentActionId: string | null;
  waitingCondition: string | null;
  startAt: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  assignments: TaskAssignment[];
  dependencies: TaskDependency[];
};

export type TaskAssignment = {
  id: string;
  taskId: string;
  role: TaskAssignmentRole;
  actor: MatterActorRef;
  assignedBy: MatterActorRef;
  assignedAt: string;
  acceptanceStatus: TaskAcceptanceStatus;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  suggestionReason: string | null;
};

export type TaskDependency = {
  id: string;
  dependsOnTaskId: string;
  kind: 'blocked_by';
  dependsOnTitle: string;
  dependsOnStatus: TaskStatus;
};

export type MatterResponsibility = {
  id: string;
  matterId: string;
  kind: 'lead' | 'collaborator';
  actor: MatterActorRef;
  status: 'proposed' | 'accepted' | 'declined' | 'ended';
  assignedAt: string;
  assignedBy?: MatterActorRef | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  responseAction?: string | null;
  responseReason?: string | null;
  suggestedActor?: MatterActorRef | null;
};

export type MatterDecision = {
  id: string;
  matterId: string;
  title: string;
  statement: string;
  rationale: string | null;
  status: DecisionStatus;
  proposedBy: MatterActorRef;
  decidedBy: MatterActorRef | null;
  createdAt: string;
  decidedAt: string | null;
  taskIds: string[];
};

export type CollaborationAction = 'accept' | 'decline' | 'request_clarification' | 'suggest_reassignment' | 'submit' | 'complete' | 'accept_completion' | 'request_changes' | 'reassign' | 'respond' | 'cancel_task' | 'reject';

export const WORK_GROUPS = ['needs_attention', 'in_progress', 'waiting', 'completed'] as const;
export type WorkGroup = (typeof WORK_GROUPS)[number];

export function groupCollaborationTask(task: CollaborationTask): WorkGroup {
  if (task.status === 'completed' || task.status === 'cancelled') return 'completed';
  if (task.status === 'declined' || task.status === 'awaiting_acceptance' || task.status === 'assigned' || task.status === 'under_review' || task.status === 'submitted') {
    return 'needs_attention';
  }
  if (task.status === 'blocked' || task.status === 'waiting' || task.status === 'proposed') return 'waiting';
  if (task.status === 'in_progress' || task.status === 'accepted') return 'in_progress';
  return 'needs_attention';
}

export const TERMINAL_WORK_TASK_STATUSES = ['completed', 'cancelled'] as const;

export function isTaskTerminalForWorkCompletion(status: TaskStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function outstandingWorkTasks(tasks: readonly CollaborationTask[]): CollaborationTask[] {
  return tasks.filter((task) => !isTaskTerminalForWorkCompletion(task.status));
}

export function taskDoesNotResolveMatter(): true {
  return true;
}
