/**
 * In-memory Phase 2 work engine. SQL RPCs implement the same transitions.
 * Completing a Task never closes the Matter. Comments never complete actions.
 */

import {
  actorsEqual,
  computeDueAt,
  getTimingPolicy,
  type MatterActionRequirement,
  type MatterActorRef,
} from '@/lib/matters';
import {
  type CollaborationTask,
  type MatterDecision,
  type MatterResponsibility,
  type TaskAssignment,
  type TaskDependency,
  outstandingWorkTasks,
  taskDoesNotResolveMatter,
} from '@/lib/matters-work';
import {
  type MatterEngineContext,
  type MatterEngineState,
  addMatterComment,
} from '@/lib/matters-workflow';

export type WorkEngineState = MatterEngineState & {
  tasks: CollaborationTask[];
  responsibilities: MatterResponsibility[];
  decisions: MatterDecision[];
};

function nextId(ctx: MatterEngineContext, prefix: string): string {
  ctx.idSeq += 1;
  return `${prefix}-${ctx.idSeq}`;
}

function iso(date: Date): string {
  return date.toISOString();
}

function systemActor(): MatterActorRef {
  return { kind: 'system', profileId: null, displayName: 'Civizen' };
}

function clone(state: WorkEngineState): WorkEngineState {
  return {
    ...state,
    matter: { ...state.matter },
    actions: state.actions.map((row) => ({ ...row })),
    parties: [...state.parties],
    comments: [...state.comments],
    events: [...state.events],
    attachments: [...state.attachments],
    reminders: [...state.reminders],
    tasks: state.tasks.map((task) => ({
      ...task,
      assignments: task.assignments.map((row) => ({ ...row })),
      dependencies: [...task.dependencies],
    })),
    responsibilities: [...state.responsibilities],
    decisions: state.decisions.map((row) => ({ ...row, taskIds: [...row.taskIds] })),
  };
}

function log(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  type: string,
  summary: string,
  actor: MatterActorRef,
  payload: Record<string, unknown> = {},
) {
  state.events.push({
    id: nextId(ctx, 'evt'),
    matterId: state.matter.id,
    eventType: type,
    actor,
    isSystem: actor.kind === 'system',
    summary,
    payload,
    createdAt: iso(ctx.now),
  });
}

function assignScoped(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  actionType: MatterActionRequirement['actionType'],
  assigned: MatterActorRef,
  policyId: string,
  contextKind: 'matter' | 'task' | 'decision' | 'responsibility',
  contextId: string | null,
  taskTitle?: string,
): MatterActionRequirement {
  for (const action of state.actions) {
    if (
      (action.status === 'pending' || action.status === 'overdue')
      && action.contextKind === contextKind
      && action.contextId === contextId
    ) {
      action.status = 'superseded';
    }
  }
  const policy = getTimingPolicy(policyId, ctx.policies);
  const { dueAt, reminderAt } = computeDueAt(ctx.now, policy);
  const action: MatterActionRequirement = {
    id: nextId(ctx, 'act'),
    matterId: state.matter.id,
    actionType,
    assignedActor: assigned,
    createdAt: iso(ctx.now),
    dueAt: iso(dueAt),
    reminderAt: iso(reminderAt),
    timingPolicyId: policy.id,
    status: 'pending',
    completedAt: null,
    completedBy: null,
    completionAction: null,
    timeoutAction: 'remind',
    escalationPolicyId: null,
    contextKind,
    contextId,
    taskTitle: taskTitle ?? null,
  };
  state.actions.push(action);
  state.currentAction = action;
  state.matter.currentActionId = action.id;
  state.matter.waitingCondition = null;
  state.matter.lifecycleStatus = 'active';
  state.reminders.push({ actionId: action.id, kind: 'assigned' });
  log(state, ctx, 'action_assigned', `Action assigned to ${assigned.displayName || 'a party'}.`, systemActor(), {
    actionType,
    contextKind,
    contextId,
  });
  return action;
}

function completeAction(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  actionId: string,
  actor: MatterActorRef,
  completion: string,
) {
  const action = state.actions.find((row) => row.id === actionId);
  if (!action || (action.status !== 'pending' && action.status !== 'overdue')) return;
  action.status = 'completed';
  action.completedAt = iso(ctx.now);
  action.completedBy = actor;
  action.completionAction = completion as MatterActionRequirement['completionAction'];
  if (state.currentAction?.id === actionId) state.currentAction = action;
  log(state, ctx, 'action_completed', `Formal action completed: ${completion.replaceAll('_', ' ')}.`, actor, {
    completionAction: completion,
  });
}

function isBlocked(state: WorkEngineState, task: CollaborationTask): boolean {
  return task.dependencies.some((dep) => {
    const other = state.tasks.find((row) => row.id === dep.dependsOnTaskId);
    return other ? other.status !== 'completed' : false;
  });
}

function leadAssignment(task: CollaborationTask): TaskAssignment | undefined {
  return [...task.assignments]
    .reverse()
    .find((row) => row.role === 'lead' && (row.acceptanceStatus === 'pending' || row.acceptanceStatus === 'accepted'));
}

function activateTask(state: WorkEngineState, ctx: MatterEngineContext, taskId: string) {
  const task = state.tasks.find((row) => row.id === taskId);
  if (!task || task.status === 'completed' || task.status === 'cancelled' || task.status === 'declined') return;
  if (isBlocked(state, task)) {
    task.status = 'blocked';
    task.waitingCondition = 'Waiting on a blocking Task.';
    task.isBlocked = true;
    log(state, ctx, 'task_blocked', `Task "${task.title}" is waiting on a dependency.`, systemActor(), { taskId });
    return;
  }
  task.isBlocked = false;
  const lead = leadAssignment(task);
  if (!lead) {
    task.status = 'proposed';
    return;
  }
  if (lead.acceptanceStatus === 'accepted') {
    task.status = 'in_progress';
    task.startAt = task.startAt ?? iso(ctx.now);
    task.waitingCondition = null;
    const action = assignScoped(state, ctx, 'complete_task', lead.actor, 'task_execution', 'task', task.id, task.title);
    task.currentActionId = action.id;
    log(state, ctx, 'task_started', `Task "${task.title}" is ready to complete.`, systemActor(), { taskId });
  } else {
    task.status = 'awaiting_acceptance';
    const action = assignScoped(state, ctx, 'accept_task', lead.actor, 'task_acceptance', 'task', task.id, task.title);
    task.currentActionId = action.id;
  }
}

function releaseDependents(state: WorkEngineState, ctx: MatterEngineContext, completedId: string) {
  for (const task of state.tasks) {
    if (!task.dependencies.some((dep) => dep.dependsOnTaskId === completedId)) continue;
    if (!isBlocked(state, task)) {
      log(state, ctx, 'dependency_cleared', 'A blocking Task completed. Downstream work can continue.', systemActor(), {
        completedTaskId: completedId,
        taskId: task.id,
      });
      activateTask(state, ctx, task.id);
    }
  }
}

export function asWorkState(state: MatterEngineState): WorkEngineState {
  if ('tasks' in state && Array.isArray((state as WorkEngineState).tasks)) {
    return state as WorkEngineState;
  }
  return { ...state, tasks: [], responsibilities: [], decisions: [] };
}

export function startCollaborativeWork(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
): WorkEngineState {
  const next = clone(asWorkState(state));
  if (next.matter.lifecycleStatus === 'closed') throw new Error('This Matter is closed.');
  if (next.matter.collaborativeWorkStartedAt) return next;
  next.matter.collaborativeWorkStartedAt = iso(ctx.now);
  next.matter.waitingCondition = 'Work in progress';
  next.matter.lifecycleStatus = 'active';
  next.responsibilities.push({
    id: nextId(ctx, 'res'),
    matterId: next.matter.id,
    kind: 'lead',
    actor,
    status: 'accepted',
    assignedAt: iso(ctx.now),
  });
  const current = next.currentAction;
  if (current && (current.status === 'pending' || current.status === 'overdue') && current.contextKind === 'matter') {
    completeAction(next, ctx, current.id, actor, 'start_collaborative_work');
  }
  log(
    next,
    ctx,
    'collaborative_work_started',
    'Collaborative work started. Tasks can be assigned without resolving the Matter.',
    actor,
  );
  return next;
}

export function createTask(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    title: string;
    description?: string;
    assignee?: MatterActorRef;
    reviewer?: MatterActorRef;
    reviewRequired?: boolean;
    parentTaskId?: string | null;
    dependsOn?: string[];
  },
): WorkEngineState {
  const next = !state.matter.collaborativeWorkStartedAt
    ? startCollaborativeWork(state, ctx, input.actor)
    : clone(asWorkState(state));
  if (next.matter.lifecycleStatus === 'closed') throw new Error('This Matter is closed.');
  const deps: TaskDependency[] = (input.dependsOn ?? []).map((id) => {
    const other = next.tasks.find((row) => row.id === id);
    return {
      id: nextId(ctx, 'dep'),
      dependsOnTaskId: id,
      kind: 'blocked_by' as const,
      dependsOnTitle: other?.title ?? 'Task',
      dependsOnStatus: other?.status ?? 'proposed',
    };
  });
  const assignments: TaskAssignment[] = [];
  if (input.assignee) {
    assignments.push({
      id: nextId(ctx, 'asg'),
      taskId: '',
      role: 'lead',
      actor: input.assignee,
      assignedBy: input.actor,
      assignedAt: iso(ctx.now),
      acceptanceStatus: 'pending',
      acceptedAt: null,
      declinedAt: null,
      declineReason: null,
      suggestionReason: null,
    });
  }
  if (input.reviewer) {
    assignments.push({
      id: nextId(ctx, 'asg'),
      taskId: '',
      role: 'reviewer',
      actor: input.reviewer,
      assignedBy: input.actor,
      assignedAt: iso(ctx.now),
      acceptanceStatus: 'accepted',
      acceptedAt: iso(ctx.now),
      declinedAt: null,
      declineReason: null,
      suggestionReason: null,
    });
  }
  const task: CollaborationTask = {
    id: nextId(ctx, 'tsk'),
    matterId: next.matter.id,
    parentTaskId: input.parentTaskId ?? null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: 'normal',
    status: input.assignee ? 'assigned' : 'proposed',
    createdBy: input.actor,
    lead: input.assignee ?? null,
    expectedOutcome: null,
    completionCriteria: null,
    reviewRequired: Boolean(input.reviewRequired || input.reviewer),
    currentActionId: null,
    waitingCondition: null,
    startAt: null,
    dueAt: null,
    submittedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: iso(ctx.now),
    updatedAt: iso(ctx.now),
    isBlocked: false,
    assignments,
    dependencies: deps,
  };
  for (const row of task.assignments) row.taskId = task.id;
  next.tasks.push(task);
  log(next, ctx, 'task_created', `Task created: ${task.title}.`, input.actor, { taskId: task.id });
  if (input.assignee) {
    log(next, ctx, 'task_assigned', `Task assigned to ${input.assignee.displayName || 'a party'}.`, input.actor, {
      taskId: task.id,
    });
  }
  activateTask(next, ctx, task.id);
  return next;
}

export function performTaskAction(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: { actor: MatterActorRef; actionId: string; action: string; message?: string; target?: MatterActorRef },
): WorkEngineState {
  const next = clone(state);
  const action = next.actions.find((row) => row.id === input.actionId);
  if (!action || (action.status !== 'pending' && action.status !== 'overdue')) {
    throw new Error('No pending action.');
  }
  if (!actorsEqual(action.assignedActor, input.actor)) {
    throw new Error('That action is not assigned to you.');
  }
  if (action.actionType === 'shared_responsibility_response' || (action.contextKind === 'responsibility' && action.actionType === 'clarify')) {
    return performSharedResponsibilityAction(next, ctx, action, input);
  }
  const task = next.tasks.find((row) => row.id === action.contextId);
  if (action.actionType === 'accept_task' && task) {
    if (input.action === 'accept') {
      const lead = leadAssignment(task);
      if (lead) {
        lead.acceptanceStatus = 'accepted';
        lead.acceptedAt = iso(ctx.now);
      }
      completeAction(next, ctx, action.id, input.actor, 'accept');
      task.status = 'in_progress';
      task.startAt = task.startAt ?? iso(ctx.now);
      log(next, ctx, 'task_accepted', `Task "${task.title}" was accepted.`, input.actor, { taskId: task.id });
      const nextAction = assignScoped(
        next,
        ctx,
        'complete_task',
        action.assignedActor,
        'task_execution',
        'task',
        task.id,
        task.title,
      );
      task.currentActionId = nextAction.id;
      return next;
    }
    if (input.action === 'decline') {
      const lead = leadAssignment(task);
      if (lead) {
        lead.acceptanceStatus = 'declined';
        lead.declinedAt = iso(ctx.now);
        lead.declineReason = input.message ?? null;
      }
      completeAction(next, ctx, action.id, input.actor, 'decline');
      task.status = 'declined';
      log(
        next,
        ctx,
        'task_declined',
        `Task "${task.title}" was declined${input.message ? `: ${input.message}` : '.'}`,
        input.actor,
        { taskId: task.id, assignmentRole: 'lead', reason: input.message ?? null },
      );
      const responsible = next.responsibilities.find((row) => row.kind === 'lead' && row.status === 'accepted');
      if (responsible) {
        assignScoped(next, ctx, 'reconsider_task', responsible.actor, 'task_acceptance', 'task', task.id, task.title);
      }
      return next;
    }
    if (input.action === 'request_clarification') {
      completeAction(next, ctx, action.id, input.actor, 'request_clarification');
      task.status = 'waiting';
      task.waitingCondition = 'Clarification requested before acceptance.';
      const responsible = next.responsibilities.find((row) => row.kind === 'lead' && row.status === 'accepted');
      if (responsible) {
        assignScoped(next, ctx, 'reconsider_task', responsible.actor, 'clarification_response', 'task', task.id, task.title);
      }
      return next;
    }
    if (input.action === 'suggest_reassignment') {
      const lead = leadAssignment(task);
      if (lead) {
        lead.acceptanceStatus = 'suggested_reassignment';
        lead.suggestionReason = input.message ?? null;
      }
      completeAction(next, ctx, action.id, input.actor, 'suggest_reassignment');
      log(next, ctx, 'task_reassignment_suggested', input.message?.trim() || 'Reassignment suggested.', input.actor, {
        taskId: task.id,
        assignmentRole: 'lead',
        reason: input.message ?? null,
      });
      const responsible = next.responsibilities.find((row) => row.kind === 'lead' && row.status === 'accepted');
      if (responsible) {
        assignScoped(next, ctx, 'reconsider_task', responsible.actor, 'task_acceptance', 'task', task.id, task.title);
      }
      return next;
    }
  }
  if (action.actionType === 'complete_task' && task) {
    if (input.action === 'submit' || input.action === 'complete') {
      completeAction(next, ctx, action.id, input.actor, input.action);
      if (task.reviewRequired) {
        task.status = 'under_review';
        task.submittedAt = iso(ctx.now);
        log(next, ctx, 'task_submitted', `Work submitted for review: ${task.title}.`, input.actor, { taskId: task.id });
        const reviewer =
          task.assignments.find((row) => row.role === 'reviewer')?.actor
          ?? next.responsibilities.find((row) => row.kind === 'lead')?.actor;
        if (reviewer) {
          const review = assignScoped(next, ctx, 'review_task', reviewer, 'task_review', 'task', task.id, task.title);
          task.currentActionId = review.id;
        }
      } else {
        task.status = 'completed';
        task.submittedAt = iso(ctx.now);
        task.completedAt = iso(ctx.now);
        log(
          next,
          ctx,
          'task_completed',
          `Task completed: ${task.title}. This does not resolve the Matter.`,
          input.actor,
          { taskId: task.id },
        );
        void taskDoesNotResolveMatter();
        releaseDependents(next, ctx, task.id);
      }
      return next;
    }
  }
  if (action.actionType === 'review_task' && task) {
    if (input.action === 'accept_completion') {
      completeAction(next, ctx, action.id, input.actor, 'accept_completion');
      task.status = 'completed';
      task.completedAt = iso(ctx.now);
      log(
        next,
        ctx,
        'task_completed',
        `Reviewed and completed: ${task.title}. This does not resolve the Matter.`,
        input.actor,
        { taskId: task.id },
      );
      releaseDependents(next, ctx, task.id);
      return next;
    }
    if (input.action === 'request_changes') {
      completeAction(next, ctx, action.id, input.actor, 'request_changes');
      task.status = 'in_progress';
      log(next, ctx, 'changes_requested', input.message?.trim() || 'Changes requested on submitted work.', input.actor, {
        taskId: task.id,
      });
      if (task.lead) {
        const redo = assignScoped(next, ctx, 'complete_task', task.lead, 'task_execution', 'task', task.id, task.title);
        task.currentActionId = redo.id;
      }
      return next;
    }
  }
  if (action.actionType === 'reconsider_task' && task) {
    if (input.action === 'reassign' && input.target) {
      completeAction(next, ctx, action.id, input.actor, 'reassign');
      task.assignments.push({
        id: nextId(ctx, 'asg'),
        taskId: task.id,
        role: 'lead',
        actor: input.target,
        assignedBy: input.actor,
        assignedAt: iso(ctx.now),
        acceptanceStatus: 'pending',
        acceptedAt: null,
        declinedAt: null,
        declineReason: null,
        suggestionReason: null,
      });
      task.lead = input.target;
      task.status = 'assigned';
      log(next, ctx, 'task_assigned', `Task reassigned to ${input.target.displayName || 'a party'}.`, input.actor, {
        taskId: task.id,
      });
      activateTask(next, ctx, task.id);
      return next;
    }
    if (input.action === 'respond') {
      completeAction(next, ctx, action.id, input.actor, 'respond');
      activateTask(next, ctx, task.id);
      return next;
    }
    if (input.action === 'cancel_task' || input.action === 'waive') {
      completeAction(next, ctx, action.id, input.actor, input.action);
      task.status = 'cancelled';
      task.cancelledAt = iso(ctx.now);
      log(next, ctx, input.action === 'waive' ? 'task_waived' : 'task_cancelled', `Task ${input.action === 'waive' ? 'waived' : 'cancelled'}: ${task.title}.`, input.actor, {
        taskId: task.id,
        reason: input.message ?? null,
        waived: input.action === 'waive',
      });
      return next;
    }
  }
  if (action.actionType === 'confirm_decision') {
    const decision = next.decisions.find((row) => row.id === action.contextId);
    if (decision && input.action === 'accept') {
      completeAction(next, ctx, action.id, input.actor, 'accept');
      decision.status = 'accepted';
      decision.decidedBy = input.actor;
      decision.decidedAt = iso(ctx.now);
      log(next, ctx, 'decision_accepted', `Decision accepted: ${decision.title}.`, input.actor);
      return next;
    }
  }
  throw new Error('That action is not available.');
}

export function proposeDecision(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    title: string;
    statement: string;
    rationale?: string;
    taskIds?: string[];
    actorIsLead?: boolean;
  },
): WorkEngineState {
  const next = clone(state);
  const decision: MatterDecision = {
    id: nextId(ctx, 'dec'),
    matterId: next.matter.id,
    title: input.title.trim(),
    statement: input.statement.trim(),
    rationale: input.rationale?.trim() || null,
    status: input.actorIsLead ? 'accepted' : 'proposed',
    proposedBy: input.actor,
    decidedBy: input.actorIsLead ? input.actor : null,
    createdAt: iso(ctx.now),
    decidedAt: input.actorIsLead ? iso(ctx.now) : null,
    taskIds: input.taskIds ?? [],
  };
  next.decisions.push(decision);
  log(next, ctx, 'decision_proposed', `Decision proposed: ${decision.title}.`, input.actor, { decisionId: decision.id });
  if (input.actorIsLead) {
    log(next, ctx, 'decision_accepted', `Decision accepted: ${decision.title}.`, input.actor, { decisionId: decision.id });
  } else {
    const lead = next.responsibilities.find((row) => row.kind === 'lead');
    if (lead) {
      assignScoped(next, ctx, 'confirm_decision', lead.actor, 'decision_confirmation', 'decision', decision.id);
    }
  }
  return next;
}

export function requestSharedResponsibility(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: { actor: MatterActorRef; target: MatterActorRef },
): WorkEngineState {
  const next = clone(state);
  const existing = next.responsibilities.find(
    (row) => row.kind === 'collaborator' && actorsEqual(row.actor, input.target),
  );
  const row: MatterResponsibility = existing ?? {
    id: nextId(ctx, 'res'),
    matterId: next.matter.id,
    kind: 'collaborator',
    actor: input.target,
    status: 'proposed',
    assignedAt: iso(ctx.now),
    assignedBy: input.actor,
    acceptedAt: null,
    declinedAt: null,
    responseAction: null,
    responseReason: null,
    suggestedActor: null,
  };
  row.status = 'proposed';
  row.assignedBy = input.actor;
  row.assignedAt = iso(ctx.now);
  row.acceptedAt = null;
  row.declinedAt = null;
  if (!existing) next.responsibilities.push(row);
  log(next, ctx, 'shared_responsibility_requested', `Shared responsibility requested from ${input.target.displayName || 'a party'}.`, input.actor, {
    responsibilityId: row.id,
  });
  assignScoped(next, ctx, 'shared_responsibility_response', input.target, 'responsibility_response', 'responsibility', row.id);
  return next;
}

function performSharedResponsibilityAction(
  next: WorkEngineState,
  ctx: MatterEngineContext,
  action: MatterActionRequirement,
  input: { actor: MatterActorRef; action: string; message?: string; target?: MatterActorRef },
): WorkEngineState {
  const resp = next.responsibilities.find((row) => row.id === action.contextId);
  if (action.actionType === 'clarify') {
    completeAction(next, ctx, action.id, input.actor, 'respond');
    if (resp && resp.status === 'proposed') {
      assignScoped(next, ctx, 'shared_responsibility_response', resp.actor, 'responsibility_response', 'responsibility', resp.id);
      log(next, ctx, 'shared_responsibility_clarified', input.message?.trim() || 'Clarification provided on the shared-responsibility request.', input.actor, {
        responsibilityId: resp.id,
        reason: input.message ?? null,
      });
    }
    return next;
  }
  if (!resp) throw new Error('Shared responsibility request not found.');
  if (input.action === 'accept' || input.action === 'accept_partially') {
    resp.status = 'accepted';
    resp.acceptedAt = iso(ctx.now);
    resp.responseAction = input.action === 'accept_partially' ? 'accept_partially' : 'accept';
    resp.responseReason = input.message ?? null;
    completeAction(next, ctx, action.id, input.actor, input.action);
    log(next, ctx, 'shared_responsibility_accepted', `${resp.actor.displayName || 'A party'} accepted shared responsibility.`, input.actor, {
      responsibilityId: resp.id,
      response: input.action,
      reason: input.message ?? null,
    });
    return next;
  }
  if (input.action === 'decline' || input.action === 'dispute') {
    resp.status = 'declined';
    resp.declinedAt = iso(ctx.now);
    resp.responseAction = 'decline';
    resp.responseReason = input.message ?? null;
    completeAction(next, ctx, action.id, input.actor, 'decline');
    log(next, ctx, 'shared_responsibility_declined', `${resp.actor.displayName || 'A party'} declined shared responsibility${input.message ? `: ${input.message}` : '.'}`, input.actor, {
      responsibilityId: resp.id,
      response: 'decline',
      reason: input.message ?? null,
    });
    return next;
  }
  if (input.action === 'request_clarification') {
    completeAction(next, ctx, action.id, input.actor, 'request_clarification');
    log(next, ctx, 'shared_responsibility_clarification_requested', input.message?.trim() || 'Clarification requested before accepting shared responsibility.', input.actor, {
      responsibilityId: resp.id,
      reason: input.message ?? null,
    });
    if (resp.assignedBy) {
      assignScoped(next, ctx, 'clarify', resp.assignedBy, 'clarification_response', 'responsibility', resp.id);
    }
    return next;
  }
  if (input.action === 'suggest_actor' || input.action === 'suggest_another') {
    if (!input.target) throw new Error('Choose who should share responsibility instead.');
    resp.status = 'declined';
    resp.declinedAt = iso(ctx.now);
    resp.responseAction = 'suggest_actor';
    resp.responseReason = input.message ?? null;
    resp.suggestedActor = input.target;
    completeAction(next, ctx, action.id, input.actor, 'suggest_actor');
    log(next, ctx, 'shared_responsibility_declined', `${resp.actor.displayName || 'A party'} suggested ${input.target.displayName || 'another actor'} instead${input.message ? `: ${input.message}` : '.'}`, input.actor, {
      responsibilityId: resp.id,
      response: 'suggest_actor',
      reason: input.message ?? null,
      suggestedProfileId: input.target.profileId,
    });
    return requestSharedResponsibility(next, ctx, { actor: input.actor, target: input.target });
  }
  throw new Error('That action is not available.');
}

export function completeCollaborativeWork(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
  options?: { allowOutstanding?: boolean; reason?: string },
): WorkEngineState {
  const next = clone(state);
  const outstanding = outstandingWorkTasks(next.tasks);
  if (outstanding.length > 0 && !options?.allowOutstanding) {
    throw new Error('Collaborative work still has outstanding Tasks. Cancel, reassign, replace, or waive them, or complete with outstanding work.');
  }
  if (outstanding.length > 0 && (options?.reason || '').trim().length < 3) {
    throw new Error('Explain why collaborative work is ending with outstanding Tasks.');
  }
  const snapshot = outstanding.map((task) => ({ id: task.id, title: task.title, status: task.status }));
  next.matter.collaborativeWorkCompletedAt = iso(ctx.now);
  next.matter.collaborativeWorkCompletionKind = outstanding.length > 0 ? 'with_outstanding_work' : 'normal';
  next.matter.collaborativeWorkCompletionReason = outstanding.length > 0 ? (options?.reason ?? null) : null;
  next.matter.waitingCondition = outstanding.length > 0
    ? 'Work complete with outstanding Tasks. The final response should explain what remained.'
    : 'Work complete — awaiting final response';
  if (outstanding.length > 0) {
    log(
      next,
      ctx,
      'collaborative_work_completed_with_outstanding',
      `Collaborative work completed with outstanding Tasks. Those Tasks were not marked completed. ${options?.reason}`,
      actor,
      { reason: options?.reason, outstandingTasks: snapshot, outstandingCount: outstanding.length },
    );
  } else {
    log(
      next,
      ctx,
      'collaborative_work_completed',
      'Collaborative work completed. A final Matter response is still required.',
      actor,
    );
  }
  assignScoped(next, ctx, 'address', actor, 'final_work_response', 'matter', null);
  return next;
}

export function addTaskComment(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: { author: MatterActorRef; body: string; taskId: string },
): WorkEngineState {
  const next = asWorkState(addMatterComment(state, ctx, { author: input.author, body: input.body }));
  const comment = next.comments[next.comments.length - 1];
  if (comment) comment.taskId = input.taskId;
  return next;
}

export function pendingFor(state: WorkEngineState, actor: MatterActorRef): MatterActionRequirement[] {
  return state.actions.filter(
    (row) => (row.status === 'pending' || row.status === 'overdue') && actorsEqual(row.assignedActor, actor),
  );
}
