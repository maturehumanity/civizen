/**
 * In-memory Matter workflow engine.
 * SQL RPCs implement the same transitions. Comments never complete actions.
 */

import {
  AUTO_CLOSE_REASON,
  actionExpectedCopy,
  actorsEqual,
  computeDueAt,
  formalActionsForContext,
  getMatterTypeDefault,
  getTimingPolicy,
  type ActionRequirementType,
  type CloseKind,
  type FormalActionType,
  type Matter,
  type MatterActionRequirement,
  type MatterActorRef,
  type MatterAttachment,
  type MatterComment,
  type MatterEvent,
  type MatterParty,
  type MatterTimingPolicy,
  type MatterType,
  type MatterVisibility,
  type ReopenReason,
  type TimeoutBehavior,
  DEFAULT_TIMING_POLICIES,
} from '@/lib/matters';

export type MatterEngineState = {
  matter: Matter;
  currentAction: MatterActionRequirement | null;
  actions: MatterActionRequirement[];
  parties: MatterParty[];
  comments: MatterComment[];
  events: MatterEvent[];
  attachments: MatterAttachment[];
  reminders: Array<{ actionId: string; kind: 'assigned' | 'approaching' | 'overdue' }>;
};

export type MatterEngineContext = {
  now: Date;
  policies: readonly MatterTimingPolicy[];
  idSeq: number;
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

function logEvent(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  eventType: string,
  summary: string,
  actor: MatterActorRef,
  isSystem: boolean,
  payload: Record<string, unknown> = {},
): void {
  state.events.push({
    id: nextId(ctx, 'evt'),
    matterId: state.matter.id,
    eventType,
    actor,
    isSystem,
    summary,
    payload,
    createdAt: iso(ctx.now),
  });
}

function addParty(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  role: MatterParty['role'],
  actor: MatterActorRef,
): void {
  const exists = state.parties.some(
    (party) => party.role === role && actorsEqual(party.actor, actor),
  );
  if (exists) return;
  state.parties.push({
    id: nextId(ctx, 'pty'),
    matterId: state.matter.id,
    role,
    actor,
    addedAt: iso(ctx.now),
  });
}

function supersedeCurrent(state: MatterEngineState, ctx: MatterEngineContext): void {
  if (!state.currentAction) return;
  if (state.currentAction.status === 'pending' || state.currentAction.status === 'overdue') {
    state.currentAction = { ...state.currentAction, status: 'superseded' };
    const index = state.actions.findIndex((row) => row.id === state.currentAction?.id);
    if (index >= 0) state.actions[index] = state.currentAction;
    logEvent(state, ctx, 'action_superseded', 'Previous action was replaced.', systemActor(), true);
  }
}

function completeCurrent(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
  completionAction: FormalActionType,
): void {
  if (!state.currentAction) return;
  const completed: MatterActionRequirement = {
    ...state.currentAction,
    status: 'completed',
    completedAt: iso(ctx.now),
    completedBy: actor,
    completionAction,
  };
  state.currentAction = completed;
  const index = state.actions.findIndex((row) => row.id === completed.id);
  if (index >= 0) state.actions[index] = completed;
  logEvent(
    state,
    ctx,
    'action_completed',
    `Formal action completed: ${completionAction.replaceAll('_', ' ')}.`,
    actor,
    actor.kind === 'system',
    { completionAction },
  );
}

function assignAction(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actionType: ActionRequirementType,
  assignedActor: MatterActorRef,
  timingPolicyId: string,
  timeoutAction: TimeoutBehavior,
): MatterActionRequirement {
  if (state.currentAction && (state.currentAction.status === 'pending' || state.currentAction.status === 'overdue')) {
    supersedeCurrent(state, ctx);
  }
  const policy = getTimingPolicy(timingPolicyId, ctx.policies);
  const { dueAt, reminderAt } = computeDueAt(ctx.now, policy);
  const action: MatterActionRequirement = {
    id: nextId(ctx, 'act'),
    matterId: state.matter.id,
    actionType,
    assignedActor,
    createdAt: iso(ctx.now),
    dueAt: iso(dueAt),
    reminderAt: iso(reminderAt),
    timingPolicyId: policy.id,
    status: 'pending',
    completedAt: null,
    completedBy: null,
    completionAction: null,
    timeoutAction,
    escalationPolicyId: null,
  };
  state.actions.push(action);
  state.currentAction = action;
  state.matter = {
    ...state.matter,
    currentActionId: action.id,
    waitingCondition: null,
    lifecycleStatus: state.matter.lifecycleStatus === 'draft' ? 'submitted' : state.matter.lifecycleStatus === 'closed' ? 'active' : 'active',
    updatedAt: iso(ctx.now),
  };
  logEvent(state, ctx, 'action_assigned', `${actionExpectedCopy(actionType)} Assigned to ${assignedActor.displayName || 'a party'}.`, systemActor(), true, {
    actionType,
    timingPolicyId: policy.id,
    dueAt: action.dueAt,
  });
  logEvent(state, ctx, 'timer_started', `Timer started using ${policy.displayName}.`, systemActor(), true, {
    timingPolicyId: policy.id,
    dueAt: action.dueAt,
  });
  state.reminders.push({ actionId: action.id, kind: 'assigned' });
  logEvent(state, ctx, 'reminder_sent', 'Initial assignment notification sent.', systemActor(), true, {
    reminderKind: 'assigned',
  });
  return action;
}

export function createMatterEngineContext(
  now: Date = new Date(),
  policies: readonly MatterTimingPolicy[] = DEFAULT_TIMING_POLICIES,
): MatterEngineContext {
  return { now, policies, idSeq: 0 };
}

export type CreateMatterInput = {
  title: string;
  description: string;
  matterType: MatterType;
  initiator: MatterActorRef;
  addressee: MatterActorRef;
  visibility?: MatterVisibility;
  areaNodeId?: string | null;
  createdByProfileId: string;
  evidenceUrl?: string | null;
  evidenceLabel?: string | null;
  submit?: boolean;
};

export function createMatter(input: CreateMatterInput, ctx: MatterEngineContext): MatterEngineState {
  const id = nextId(ctx, 'mat');
  const createdAt = iso(ctx.now);
  const submit = input.submit !== false;
  const matter: Matter = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    matterType: input.matterType,
    lifecycleStatus: submit ? 'submitted' : 'draft',
    visibility: input.visibility ?? 'participants',
    areaNodeId: input.areaNodeId ?? null,
    initiator: input.initiator,
    addressee: input.addressee,
    responsible: input.addressee,
    currentActionId: null,
    waitingCondition: null,
    closeKind: null,
    closeReason: null,
    createdByProfileId: input.createdByProfileId,
    createdAt,
    submittedAt: submit ? createdAt : null,
    closedAt: null,
    lastReopenedAt: null,
    reopenCount: 0,
    updatedAt: createdAt,
  };
  const state: MatterEngineState = {
    matter,
    currentAction: null,
    actions: [],
    parties: [],
    comments: [],
    events: [],
    attachments: [],
    reminders: [],
  };
  addParty(state, ctx, 'initiator', input.initiator);
  addParty(state, ctx, 'addressee', input.addressee);
  addParty(state, ctx, 'responsible', input.addressee);
  logEvent(state, ctx, 'matter_created', 'Matter created.', input.initiator, false);
  if (input.evidenceUrl?.trim()) {
    state.attachments.push({
      id: nextId(ctx, 'att'),
      matterId: id,
      commentId: null,
      kind: 'url',
      filePath: null,
      fileName: null,
      url: input.evidenceUrl.trim(),
      label: input.evidenceLabel?.trim() || null,
      visibility: null,
      uploadedByProfileId: input.createdByProfileId,
      createdAt,
    });
  }
  if (submit) {
    logEvent(state, ctx, 'matter_submitted', 'Matter submitted.', input.initiator, false);
    logEvent(state, ctx, 'recipient_assigned', `Addressed to ${input.addressee.displayName || 'the intended party'}.`, input.initiator, false);
    const defaults = getMatterTypeDefault(input.matterType);
    assignAction(state, ctx, defaults.initialActionType, input.addressee, defaults.timingPolicyId, defaults.timeoutBehavior);
  }
  return state;
}

export function addMatterComment(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  input: {
    author: MatterActorRef;
    body: string;
    parentId?: string | null;
    mentionedProfileIds?: string[];
  },
): MatterEngineState {
  const next: MatterEngineState = {
    ...state,
    comments: [...state.comments],
    events: [...state.events],
  };
  next.comments.push({
    id: nextId(ctx, 'cmt'),
    matterId: state.matter.id,
    parentId: input.parentId ?? null,
    author: input.author,
    body: input.body.trim(),
    mentionedProfileIds: input.mentionedProfileIds ?? [],
    visibility: null,
    createdAt: iso(ctx.now),
  });
  logEvent(next, ctx, 'comment_added', 'Comment posted. This did not complete the required action.', input.author, false);
  return next;
}

function requirePendingAction(state: MatterEngineState): MatterActionRequirement {
  const action = state.currentAction;
  if (!action || (action.status !== 'pending' && action.status !== 'overdue')) {
    throw new Error('No pending action on this Matter.');
  }
  return action;
}

function closeMatter(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
  closeKind: CloseKind,
  reason: string,
  isSystem: boolean,
): void {
  if (state.currentAction && (state.currentAction.status === 'pending' || state.currentAction.status === 'overdue')) {
    state.currentAction = {
      ...state.currentAction,
      status: isSystem ? 'expired' : 'cancelled',
      completedAt: iso(ctx.now),
      completedBy: actor,
    };
    const index = state.actions.findIndex((row) => row.id === state.currentAction?.id);
    if (index >= 0) state.actions[index] = state.currentAction;
  }
  state.matter = {
    ...state.matter,
    lifecycleStatus: 'closed',
    closeKind,
    closeReason: reason,
    closedAt: iso(ctx.now),
    currentActionId: state.currentAction?.id ?? null,
    waitingCondition: null,
    updatedAt: iso(ctx.now),
  };
  const eventType = isSystem ? 'matter_auto_closed' : 'matter_manually_closed';
  logEvent(state, ctx, eventType, reason, actor, isSystem, { closeKind });
}

function assignConfirmation(state: MatterEngineState, ctx: MatterEngineContext): void {
  assignAction(
    state,
    ctx,
    'confirm_resolution',
    state.matter.initiator,
    'resolution_confirmation',
    'auto_close',
  );
}

function assertFormalActionAllowed(
  state: MatterEngineState,
  actor: MatterActorRef,
  action: FormalActionType,
): void {
  const options = formalActionsForContext({
    lifecycleStatus: state.matter.lifecycleStatus,
    currentAction: state.currentAction,
    viewerProfileId: actor.profileId || '',
    viewerIsInitiator: actorsEqual(state.matter.initiator, actor),
    matterType: state.matter.matterType,
  });
  if (!options.some((option) => option.action === action)) {
    throw new Error('That action is not available.');
  }
}

export function performFormalAction(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    action: FormalActionType;
    message?: string;
    target?: MatterActorRef;
    reopenReason?: ReopenReason;
  },
): MatterEngineState {
  const next: MatterEngineState = {
    ...state,
    matter: { ...state.matter },
    currentAction: state.currentAction ? { ...state.currentAction } : null,
    actions: [...state.actions],
    parties: [...state.parties],
    comments: [...state.comments],
    events: [...state.events],
    attachments: [...state.attachments],
    reminders: [...state.reminders],
  };

  assertFormalActionAllowed(next, input.actor, input.action);

  if (input.action === 'reopen') {
    if (next.matter.lifecycleStatus !== 'closed') throw new Error('Only a closed Matter can be reopened.');
    const reason = input.message?.trim() || input.reopenReason || 'other';
    next.matter = {
      ...next.matter,
      lifecycleStatus: 'active',
      lastReopenedAt: iso(ctx.now),
      reopenCount: next.matter.reopenCount + 1,
      updatedAt: iso(ctx.now),
      closeKind: next.matter.closeKind,
      closeReason: next.matter.closeReason,
      closedAt: next.matter.closedAt,
    };
    logEvent(
      next,
      ctx,
      'matter_reopened',
      `Matter reopened. Previous closure remains on the record. Reason: ${String(reason).replaceAll('_', ' ')}.`,
      input.actor,
      false,
      { reopenReason: reason, previousCloseKind: next.matter.closeKind, previousCloseReason: next.matter.closeReason },
    );
    const defaults = getMatterTypeDefault(next.matter.matterType);
    assignAction(
      next,
      ctx,
      defaults.initialActionType,
      next.matter.responsible.profileId ? next.matter.responsible : next.matter.addressee,
      defaults.timingPolicyId,
      defaults.timeoutBehavior,
    );
    return next;
  }

  if (input.action === 'revealed_issue') {
    logEvent(
      next,
      ctx,
      'question_revealed_issue',
      input.message?.trim()
        || 'The initiator recorded that this Question revealed an Issue. The Matter stays a Question; type conversion is not applied.',
      input.actor,
      false,
    );
    if (next.currentAction?.actionType === 'confirm_resolution') {
      completeCurrent(next, ctx, input.actor, 'revealed_issue');
      assignAction(next, ctx, 'respond', next.matter.responsible, 'question_response', 'remind');
    }
    return next;
  }

  if (
    input.action === 'confirm_resolved'
    && actorsEqual(next.matter.initiator, input.actor)
    && next.matter.matterType === 'question'
  ) {
    completeCurrent(next, ctx, input.actor, 'confirm_resolved');
    closeMatter(next, ctx, input.actor, 'confirmed_resolution', 'Initiator confirmed resolution.', false);
    return next;
  }

  if (next.matter.lifecycleStatus === 'closed') {
    throw new Error('This Matter is closed.');
  }

  if (input.action === 'close') {
    completeCurrent(next, ctx, input.actor, 'close');
    closeMatter(next, ctx, input.actor, 'manual', input.message?.trim() || 'Closed by the initiator.', false);
    return next;
  }

  const current = requirePendingAction(next);

  switch (input.action) {
    case 'respond': {
      completeCurrent(next, ctx, input.actor, 'respond');
      logEvent(next, ctx, 'final_answer_provided', input.message?.trim() || 'A final answer was provided.', input.actor, false);
      if (current.actionType === 'clarify') {
        assignAction(next, ctx, 'respond', next.matter.responsible, 'question_response', 'remind');
      } else {
        assignConfirmation(next, ctx);
      }
      break;
    }
    case 'request_clarification': {
      completeCurrent(next, ctx, input.actor, 'request_clarification');
      logEvent(next, ctx, 'clarification_requested', input.message?.trim() || 'Clarification requested.', input.actor, false);
      assignAction(next, ctx, 'clarify', next.matter.initiator, 'clarification_response', 'remind');
      break;
    }
    case 'forward':
    case 'redirect': {
      if (!input.target?.profileId) throw new Error('Choose who should receive this Matter.');
      completeCurrent(next, ctx, input.actor, input.action);
      addParty(next, ctx, input.action === 'forward' ? 'invitee' : 'responsible', input.target);
      if (input.action === 'redirect') {
        next.matter = { ...next.matter, responsible: input.target, updatedAt: iso(ctx.now) };
        addParty(next, ctx, 'responsible', input.target);
      }
      logEvent(
        next,
        ctx,
        input.action === 'forward' ? 'forwarded' : 'redirected',
        input.action === 'redirect'
          ? `Responsibility redirected to ${input.target.displayName || 'another party'}. The Matter remains active.`
          : `Forwarded to ${input.target.displayName || 'another party'}. The Matter remains active.`,
        input.actor,
        false,
        { targetProfileId: input.target.profileId },
      );
      const nextType: ActionRequirementType =
        current.actionType === 'responsibility_response' ? 'responsibility_response' : current.actionType === 'address' ? 'address' : 'respond';
      const policyId =
        nextType === 'responsibility_response' ? 'responsibility_response' : nextType === 'address' ? 'address_work' : 'question_response';
      assignAction(next, ctx, nextType, input.target, policyId, 'remind');
      break;
    }
    case 'invite_party': {
      if (!input.target?.profileId) throw new Error('Choose who to invite.');
      addParty(next, ctx, 'invitee', input.target);
      addParty(next, ctx, 'participant', input.target);
      logEvent(next, ctx, 'party_invited', `Invited ${input.target.displayName || 'another party'}.`, input.actor, false);
      break;
    }
    case 'accept_responsibility':
    case 'accept_jointly':
    case 'partially_accept': {
      completeCurrent(next, ctx, input.actor, input.action);
      next.matter = { ...next.matter, responsible: input.actor, updatedAt: iso(ctx.now) };
      addParty(next, ctx, 'responsible', input.actor);
      logEvent(
        next,
        ctx,
        'responsibility_accepted',
        input.action === 'partially_accept'
          ? input.message?.trim() || 'Responsibility partially accepted.'
          : input.action === 'accept_jointly'
            ? 'Responsibility accepted jointly.'
            : 'Responsibility accepted.',
        input.actor,
        false,
        { action: input.action },
      );
      assignAction(next, ctx, 'address', input.actor, 'address_work', 'remind');
      break;
    }
    case 'dispute_responsibility': {
      completeCurrent(next, ctx, input.actor, 'dispute_responsibility');
      logEvent(
        next,
        ctx,
        'responsibility_disputed',
        input.message?.trim() || 'Responsibility disputed. The Matter stays active.',
        input.actor,
        false,
      );
      assignAction(next, ctx, 'choose_next_party', next.matter.initiator, 'responsibility_response', 'remind');
      break;
    }
    case 'mark_no_action_required': {
      completeCurrent(next, ctx, input.actor, 'mark_no_action_required');
      logEvent(next, ctx, 'no_action_required_marked', input.message?.trim() || 'Marked as no action required.', input.actor, false);
      assignConfirmation(next, ctx);
      break;
    }
    case 'mark_addressed': {
      completeCurrent(next, ctx, input.actor, 'mark_addressed');
      logEvent(next, ctx, 'marked_addressed', input.message?.trim() || 'Marked as addressed with a final response.', input.actor, false);
      assignConfirmation(next, ctx);
      break;
    }
    case 'confirm_resolved': {
      completeCurrent(next, ctx, input.actor, 'confirm_resolved');
      closeMatter(next, ctx, input.actor, 'confirmed_resolution', 'Initiator confirmed resolution.', false);
      break;
    }
    case 'confirm_partially_resolved': {
      completeCurrent(next, ctx, input.actor, 'confirm_partially_resolved');
      closeMatter(next, ctx, input.actor, 'partially_resolved', input.message?.trim() || 'Initiator marked this as partially resolved.', false);
      break;
    }
    case 'confirm_not_resolved': {
      completeCurrent(next, ctx, input.actor, 'confirm_not_resolved');
      logEvent(next, ctx, 'resolution_rejected', input.message?.trim() || 'Initiator reported that this is not resolved.', input.actor, false);
      assignAction(next, ctx, 'address', next.matter.responsible, 'address_work', 'remind');
      break;
    }
    case 'need_clarification': {
      completeCurrent(next, ctx, input.actor, 'need_clarification');
      logEvent(next, ctx, 'clarification_requested', input.message?.trim() || 'Need more information — discussion continues.', input.actor, false);
      assignAction(next, ctx, 'respond', next.matter.responsible, 'clarification_response', 'remind');
      break;
    }
    default:
      throw new Error('That action is not available.');
  }
  return next;
}

function reminderExists(
  state: MatterEngineState,
  actionId: string,
  kind: 'assigned' | 'approaching' | 'overdue',
): boolean {
  return state.reminders.some((row) => row.actionId === actionId && row.kind === kind);
}

export function processTimeouts(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  claims: Set<string> = new Set(),
): MatterEngineState {
  const next: MatterEngineState = {
    ...state,
    matter: { ...state.matter },
    currentAction: state.currentAction ? { ...state.currentAction } : null,
    actions: state.actions.map((row) => ({ ...row })),
    parties: [...state.parties],
    comments: [...state.comments],
    events: [...state.events],
    attachments: [...state.attachments],
    reminders: [...state.reminders],
  };
  const action = next.currentAction;
  if (!action || next.matter.lifecycleStatus === 'closed') return next;
  if (action.status !== 'pending' && action.status !== 'overdue') return next;

  const now = ctx.now.getTime();
  const reminderAt = new Date(action.reminderAt).getTime();
  const dueAt = new Date(action.dueAt).getTime();

  const claim = (key: string): boolean => {
    if (claims.has(key)) return false;
    claims.add(key);
    return true;
  };

  if (now >= reminderAt && now < dueAt && !reminderExists(next, action.id, 'approaching')) {
    if (claim(`${action.id}:approaching`)) {
      next.reminders.push({ actionId: action.id, kind: 'approaching' });
      logEvent(next, ctx, 'reminder_sent', 'Approaching-deadline reminder sent.', systemActor(), true, {
        reminderKind: 'approaching',
      });
    }
  }

  if (now >= dueAt && action.status === 'pending') {
    if (claim(`${action.id}:overdue`)) {
      const overdue = { ...action, status: 'overdue' as const };
      next.currentAction = overdue;
      const index = next.actions.findIndex((row) => row.id === overdue.id);
      if (index >= 0) next.actions[index] = overdue;
      logEvent(next, ctx, 'action_overdue', 'The required action is overdue.', systemActor(), true);
      if (!reminderExists(next, action.id, 'overdue')) {
        next.reminders.push({ actionId: action.id, kind: 'overdue' });
        logEvent(next, ctx, 'reminder_sent', 'Overdue notification sent.', systemActor(), true, {
          reminderKind: 'overdue',
        });
      }
    }
  }

  const current = next.currentAction;
  if (current && now >= dueAt && current.timeoutAction === 'auto_close') {
    if (claim(`${current.id}:auto_close`) && next.matter.lifecycleStatus !== 'closed') {
      closeMatter(next, ctx, systemActor(), 'auto_no_initiator_response', AUTO_CLOSE_REASON, true);
    }
  }

  return next;
}

export function eventSummaries(state: MatterEngineState): string[] {
  return state.events.map((event) => event.summary);
}
