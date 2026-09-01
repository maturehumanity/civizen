/**
 * In-memory Phase 3 resolution engine. SQL RPCs implement the same transitions.
 */

import { AUTO_CLOSE_REASON } from '@/lib/matters';
import type { MatterActorRef } from '@/lib/matters';
import {
  type WorkEngineState,
  assignScoped,
  completeCollaborativeWork,
  completeAction,
  cloneWorkState,
} from '@/lib/matters-work-workflow';
import type { MatterEngineContext } from '@/lib/matters-workflow';
import { performFormalAction, processTimeouts } from '@/lib/matters-workflow';
import type {
  MatterOutcomeFollowup,
  MatterPatternCounts,
  MatterResolution,
  ResolutionKind,
} from '@/lib/matters-resolution';

export type ResolutionEngineState = WorkEngineState & {
  resolutions: MatterResolution[];
  outcomeFollowups: MatterOutcomeFollowup[];
  patternCounts: MatterPatternCounts;
  latestResolutionId: string | null;
};

function nextId(ctx: MatterEngineContext, prefix: string): string {
  ctx.idSeq += 1;
  return `${prefix}-${ctx.idSeq}`;
}

function iso(date: Date): string {
  return date.toISOString();
}

function clone(state: ResolutionEngineState): ResolutionEngineState {
  return {
    ...cloneWorkState(state),
    resolutions: state.resolutions.map((row) => ({ ...row, proposedBy: { ...row.proposedBy } })),
    outcomeFollowups: state.outcomeFollowups.map((row) => ({ ...row, reviewer: { ...row.reviewer } })),
    patternCounts: { ...state.patternCounts },
    latestResolutionId: state.latestResolutionId,
  };
}

function log(
  state: ResolutionEngineState,
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

function outstandingSummary(state: ResolutionEngineState): string | null {
  const titles = state.tasks
    .filter((task) => !['completed', 'cancelled'].includes(task.status))
    .map((task) => task.title);
  return titles.length > 0 ? titles.join('; ') : null;
}

export function createResolutionEngineState(base: WorkEngineState | ResolutionEngineState): ResolutionEngineState {
  if ('resolutions' in base && Array.isArray(base.resolutions)) {
    return base as ResolutionEngineState;
  }
  return {
    ...base,
    resolutions: [],
    outcomeFollowups: [],
    patternCounts: {
      redirectCount: 0,
      reopenCount: base.matter.reopenCount,
      resolutionRejectionCount: 0,
      resolutionAttemptCount: 0,
    },
    latestResolutionId: null,
  };
}

export function proposeResolution(
  state: ResolutionEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    resolutionKind: ResolutionKind;
    summary: string;
    actionsTaken?: string | null;
    limitations?: string | null;
    responsiblePartyPosition?: string;
  },
): ResolutionEngineState {
  const next = clone(state);
  const attempt = next.resolutions.length + 1;
  const outstanding = outstandingSummary(next);
  const id = nextId(ctx, 'res');
  const resolution: MatterResolution = {
    id,
    matterId: next.matter.id,
    attemptNumber: attempt,
    resolutionKind: input.resolutionKind,
    summary: input.summary,
    actionsTaken: input.actionsTaken ?? input.summary,
    outstandingItems: outstanding,
    limitations: input.limitations ?? null,
    resolutionStatus: 'proposed',
    responsiblePartyPosition: input.responsiblePartyPosition ?? input.summary,
    initiatorPosition: null,
    evaluatorPosition: null,
    proposedBy: {
      kind: input.actor.kind,
      profileId: input.actor.profileId || '',
      displayName: input.actor.displayName,
    },
    proposedAt: iso(ctx.now),
    closedAt: null,
    closureKind: null,
    createdAt: iso(ctx.now),
    updatedAt: iso(ctx.now),
  };
  next.resolutions.push(resolution);
  next.latestResolutionId = id;
  next.patternCounts.resolutionAttemptCount = attempt;
  next.matter = { ...next.matter, resolutionAttemptCount: attempt, latestResolutionId: id };

  for (const action of next.actions) {
    if (
      (action.status === 'pending' || action.status === 'overdue')
      && ['propose_resolution', 'address'].includes(action.actionType)
    ) {
      completeAction(next, ctx, action.id, input.actor, 'propose_resolution');
    }
  }

  log(next, ctx, 'resolution_proposed', `Resolution attempt ${attempt} proposed.`, input.actor, {
    resolutionId: id,
    attemptNumber: attempt,
    outstandingItems: outstanding,
  });

  const initiator = next.matter.initiator;
  assignScoped(next, ctx, 'review_resolution', initiator, 'resolution_review', 'resolution', id);
  const review = next.actions.find((row) => row.status === 'pending' && row.actionType === 'review_resolution');
  if (review) review.timeoutAction = 'auto_close';
  return next;
}

export function performResolutionReview(
  state: ResolutionEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    actionId: string;
    action: 'confirm_resolved' | 'confirm_partially_resolved' | 'confirm_not_resolved' | 'need_clarification' | 'cannot_verify';
    message?: string;
    continueMatter?: boolean;
  },
): ResolutionEngineState {
  const next = clone(state);
  const action = next.actions.find((row) => row.id === input.actionId);
  if (!action || !['review_resolution', 'confirm_resolution'].includes(action.actionType)) {
    throw new Error('No Resolution review is pending for you.');
  }
  const resolution = next.resolutions.find((row) => row.id === action.contextId) ?? next.resolutions.at(-1);
  if (!resolution) throw new Error('Resolution record not found.');

  completeAction(next, ctx, action.id, input.actor, input.action);
  resolution.updatedAt = iso(ctx.now);

  switch (input.action) {
    case 'confirm_resolved':
      resolution.resolutionStatus = 'confirmed';
      resolution.initiatorPosition = input.message || 'Resolved / satisfied';
      resolution.closedAt = iso(ctx.now);
      resolution.closureKind = 'confirmed_resolution';
      log(next, ctx, 'resolution_confirmed', resolution.initiatorPosition, input.actor, { resolutionId: resolution.id });
      next.matter.lifecycleStatus = 'closed';
      next.matter.closeKind = 'confirmed_resolution';
      next.matter.closeReason = 'Initiator confirmed resolution.';
      next.matter.closedAt = iso(ctx.now);
      break;
    case 'confirm_partially_resolved':
      resolution.resolutionStatus = 'partially_accepted';
      resolution.initiatorPosition = input.message || 'Partially resolved';
      resolution.closureKind = input.continueMatter === false ? 'partial_resolution_accepted' : null;
      log(next, ctx, 'resolution_partially_accepted', resolution.initiatorPosition, input.actor, { resolutionId: resolution.id });
      if (input.continueMatter === false) {
        next.matter.lifecycleStatus = 'closed';
        next.matter.closeKind = 'partially_resolved';
        next.matter.closeReason = resolution.initiatorPosition;
        next.matter.closedAt = iso(ctx.now);
      } else {
        assignScoped(next, ctx, 'address', next.matter.responsible, 'resolution_followup', 'resolution', resolution.id);
      }
      break;
    case 'confirm_not_resolved':
      resolution.resolutionStatus = 'rejected';
      resolution.initiatorPosition = input.message || 'Not resolved';
      next.patternCounts.resolutionRejectionCount += 1;
      log(next, ctx, 'resolution_rejected', resolution.initiatorPosition, input.actor, { resolutionId: resolution.id });
      assignScoped(next, ctx, 'address', next.matter.responsible, 'resolution_followup', 'resolution', resolution.id);
      break;
    case 'need_clarification':
      resolution.initiatorPosition = input.message || 'Need clarification';
      log(next, ctx, 'resolution_clarification_requested', resolution.initiatorPosition, input.actor, { resolutionId: resolution.id });
      assignScoped(next, ctx, 'clarify', next.matter.responsible, 'clarification_response', 'resolution', resolution.id);
      break;
    case 'cannot_verify':
      resolution.initiatorPosition = input.message || 'Cannot verify';
      log(next, ctx, 'resolution_cannot_verify', resolution.initiatorPosition, input.actor, { resolutionId: resolution.id });
      assignScoped(next, ctx, 'address', next.matter.responsible, 'resolution_followup', 'resolution', resolution.id);
      break;
    default:
      throw new Error('That review action is not available.');
  }
  return next;
}

export function processResolutionTimeouts(state: ResolutionEngineState, ctx: MatterEngineContext): ResolutionEngineState {
  const base = processTimeouts(state, ctx) as ResolutionEngineState;
  const next = { ...base, resolutions: [...state.resolutions], patternCounts: { ...state.patternCounts } };
  const review = next.actions.find(
    (row) =>
      row.actionType === 'review_resolution'
      && row.status === 'expired'
      && row.timeoutAction === 'auto_close',
  );
  if (review) {
    const resolution = next.resolutions.find((row) => row.id === review.contextId);
    if (resolution && resolution.resolutionStatus === 'proposed') {
      resolution.resolutionStatus = 'auto_closed';
      resolution.closureKind = 'auto_closed_no_response';
      resolution.closedAt = iso(ctx.now);
    }
    if (next.matter.closeKind === 'auto_no_initiator_response') {
      expectAutoCloseCopy(next);
    }
  }
  return next;
}

function expectAutoCloseCopy(state: ResolutionEngineState): void {
  if (state.matter.closeReason !== AUTO_CLOSE_REASON) {
    state.matter.closeReason = AUTO_CLOSE_REASON;
  }
}

export { completeCollaborativeWork, performFormalAction };
