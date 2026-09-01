import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import {
  actorLabel,
  formatDueDate,
  viewerRepresents,
  type MatterActionRequirement,
  type MatterActorKind,
} from '@/lib/matters';
import {
  addMatterComment,
  addTaskEvidence,
  createCollaborationTask,
  inviteMatterParticipant,
  performCollaborationAction,
  proposeMatterDecision,
  searchMatterActors,
  type MatterActorSuggestion,
  type MatterDetailBundle,
} from '@/lib/matters-api';
import { groupCollaborationTask, type CollaborationTask } from '@/lib/matters-work';

function dueLine(action: MatterActionRequirement | null | undefined): string {
  if (!action?.dueAt) return '';
  return `Due ${formatDueDate(action.dueAt)}.`;
}

function taskActionFor(task: CollaborationTask, pending: MatterActionRequirement[]): MatterActionRequirement | null {
  return pending.find((row) => row.contextKind === 'task' && row.contextId === task.id) ?? null;
}

export function MatterWorkPanel({
  bundle,
  profileId,
  linkedIds,
  canManageWork,
  busy,
  onBusy,
  onReload,
  t,
}: {
  bundle: MatterDetailBundle;
  profileId: string;
  linkedIds: string[];
  canManageWork: boolean;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onReload: () => Promise<void>;
  t: (key: string) => string;
}) {
  const [title, setTitle] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assignee, setAssignee] = useState<MatterActorSuggestion | null>(null);
  const [hits, setHits] = useState<MatterActorSuggestion[]>([]);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [parentTaskId, setParentTaskId] = useState<string>('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionStatement, setDecisionStatement] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [taskComment, setTaskComment] = useState<Record<string, string>>({});
  const [evidenceNote, setEvidenceNote] = useState<Record<string, string>>({});
  const [actionNote, setActionNote] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteHit, setInviteHit] = useState<MatterActorSuggestion | null>(null);
  const [inviteHits, setInviteHits] = useState<MatterActorSuggestion[]>([]);
  const [inviteRole, setInviteRole] = useState('contributor');
  const [shareQuery, setShareQuery] = useState('');
  const [shareHit, setShareHit] = useState<MatterActorSuggestion | null>(null);
  const [shareHits, setShareHits] = useState<MatterActorSuggestion[]>([]);
  const [reassignQuery, setReassignQuery] = useState<Record<string, string>>({});
  const [reassignHits, setReassignHits] = useState<Record<string, MatterActorSuggestion[]>>({});
  const [reassignTarget, setReassignTarget] = useState<Record<string, MatterActorSuggestion | null>>({});

  const pending = bundle.pendingActions;
  const groups = useMemo(() => {
    const buckets: Record<string, CollaborationTask[]> = {
      needs_attention: [],
      in_progress: [],
      waiting: [],
      completed: [],
    };
    for (const task of bundle.tasks) {
      buckets[groupCollaborationTask(task)].push(task);
    }
    return buckets;
  }, [bundle.tasks]);

  const searchPeople = (value: string, setter: (hits: MatterActorSuggestion[]) => void) => {
    if (value.trim().length < 2) {
      setter([]);
      return;
    }
    void searchMatterActors(value, profileId).then(setter);
  };

  const run = async (work: () => Promise<void>) => {
    onBusy(true);
    try {
      await work();
      await onReload();
    } finally {
      onBusy(false);
    }
  };

  const actOn = (action: MatterActionRequirement, verb: string, message?: string, target?: MatterActorSuggestion | null) =>
    run(() =>
      performCollaborationAction(action.id, verb, {
        message,
        targetKind: target?.kind as MatterActorKind | undefined,
        targetProfileId: target?.profileId,
      }),
    );

  return (
    <div className="space-y-5">
      {(['needs_attention', 'in_progress', 'waiting', 'completed'] as const).map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        return (
          <section key={group} className="space-y-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t(`contribute.matters.work.groups.${group}`)}
            </h3>
            {items.map((task) => {
              const action = taskActionFor(task, pending);
              const mine = Boolean(
                action && viewerRepresents(profileId, action.assignedActor, linkedIds),
              );
              const comments = bundle.comments.filter((item) => item.taskId === task.id);
              const evidence = bundle.attachments.filter((item) => item.taskId === task.id);
              const indent = task.parentTaskId ? 'ml-4 border-l border-border/70 pl-3' : '';
              return (
                <Card key={task.id} className={`space-y-2 border-border/70 p-4 ${indent}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(`contribute.matters.work.status.${task.status}`)}
                        {task.lead ? ` · ${actorLabel(task.lead)}` : ''}
                      </p>
                    </div>
                    {action ? (
                      <p className="text-xs text-muted-foreground">{dueLine(action)}</p>
                    ) : null}
                  </div>
                  {task.waitingCondition ? (
                    <p className="text-sm text-muted-foreground">{task.waitingCondition}</p>
                  ) : null}
                  {task.dependencies.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('contribute.matters.work.blockedBy')}{' '}
                      {task.dependencies.map((dep) => dep.dependsOnTitle).join(', ')}
                    </p>
                  ) : null}
                  {evidence.length > 0 ? (
                    <ul className="text-xs text-muted-foreground">
                      {evidence.map((item) => (
                        <li key={item.id}>{item.label || item.bodyText || item.url || item.fileName}</li>
                      ))}
                    </ul>
                  ) : null}
                  {task.assignments.some((row) => row.declineReason || row.suggestionReason) ? (
                    <ul className="text-xs text-muted-foreground">
                      {task.assignments.filter((row) => row.declineReason || row.suggestionReason).map((row) => (
                        <li key={row.id}>
                          {row.declineReason
                            ? `${t('contribute.matters.work.decline')}: ${row.declineReason}`
                            : `${t('contribute.matters.work.suggestReassign')}: ${row.suggestionReason}`}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {mine && (action?.actionType === 'accept_task' || action?.actionType === 'complete_task' || action?.actionType === 'review_task' || action?.actionType === 'reconsider_task') ? (
                    <OutlinedField label={t('contribute.matters.actionNoteLabel')}>
                      <Textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} rows={2} />
                    </OutlinedField>
                  ) : null}
                  {mine && action?.actionType === 'accept_task' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void actOn(action, 'accept')}>
                        {t('contribute.matters.work.accept')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'request_clarification', actionNote || undefined)}>
                        {t('contribute.matters.work.askClarification')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'decline', actionNote || undefined)}>
                        {t('contribute.matters.work.decline')}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void actOn(action, 'suggest_reassignment', actionNote || undefined)}>
                        {t('contribute.matters.work.suggestReassign')}
                      </Button>
                    </div>
                  ) : null}
                  {mine && action?.actionType === 'complete_task' ? (
                    <div className="space-y-2">
                      <OutlinedField label={t('contribute.matters.work.evidenceNote')}>
                        <Textarea
                          value={evidenceNote[task.id] ?? ''}
                          onChange={(event) => setEvidenceNote((current) => ({ ...current, [task.id]: event.target.value }))}
                          rows={2}
                        />
                      </OutlinedField>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const note = evidenceNote[task.id]?.trim();
                            if (note) await addTaskEvidence(bundle.matter.id, task.id, { kind: 'text', bodyText: note, label: 'Work note' });
                            await performCollaborationAction(action.id, task.reviewRequired ? 'submit' : 'complete');
                          })
                        }
                      >
                        {task.reviewRequired ? t('contribute.matters.work.submit') : t('contribute.matters.work.complete')}
                      </Button>
                    </div>
                  ) : null}
                  {mine && action?.actionType === 'review_task' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void actOn(action, 'accept_completion')}>
                        {t('contribute.matters.work.acceptCompletion')}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'request_changes', actionNote || undefined)}>
                        {t('contribute.matters.work.requestChanges')}
                      </Button>
                    </div>
                  ) : null}
                  {mine && action?.actionType === 'reconsider_task' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t('contribute.matters.work.reconsiderHint')}</p>
                      <OutlinedField label={t('contribute.matters.work.reassignTo')}>
                        {reassignTarget[task.id] ? (
                          <p className="py-1 text-sm">{reassignTarget[task.id]?.displayName}</p>
                        ) : (
                          <Input
                            value={reassignQuery[task.id] ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              setReassignQuery((current) => ({ ...current, [task.id]: value }));
                              searchPeople(value, (next) => setReassignHits((current) => ({ ...current, [task.id]: next })));
                            }}
                          />
                        )}
                      </OutlinedField>
                      {(reassignHits[task.id] ?? []).map((hit) => (
                        <button
                          key={hit.profileId}
                          type="button"
                          className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setReassignTarget((current) => ({ ...current, [task.id]: hit }));
                            setReassignHits((current) => ({ ...current, [task.id]: [] }));
                          }}
                        >
                          {hit.displayName}
                        </button>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || !reassignTarget[task.id]}
                          onClick={() => void actOn(action, 'reassign', actionNote || undefined, reassignTarget[task.id])}
                        >
                          {t('contribute.matters.work.reassign')}
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'respond', actionNote || undefined)}>
                          {t('contribute.matters.work.respondClarification')}
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void actOn(action, 'waive', actionNote || undefined)}>
                          {t('contribute.matters.work.waive')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void actOn(action, 'cancel_task', actionNote || undefined)}>
                          {t('contribute.matters.work.cancelTask')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {comments.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {comments.map((item) => (
                        <li key={item.id}>
                          {actorLabel(item.author)}: {item.body}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <OutlinedField label={t('contribute.matters.work.taskComment')}>
                    <Textarea
                      value={taskComment[task.id] ?? ''}
                      onChange={(event) => setTaskComment((current) => ({ ...current, [task.id]: event.target.value }))}
                      rows={2}
                    />
                  </OutlinedField>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy || !(taskComment[task.id] || '').trim()}
                    onClick={() =>
                      void run(async () => {
                        await addMatterComment(bundle.matter.id, taskComment[task.id].trim(), { taskId: task.id });
                        setTaskComment((current) => ({ ...current, [task.id]: '' }));
                      })
                    }
                  >
                    {t('contribute.matters.postComment')}
                  </Button>
                </Card>
              );
            })}
          </section>
        );
      })}

      {canManageWork ? (
        <>
        {(bundle.parties.filter((row) => ['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].includes(row.role)).length > 0
          || bundle.responsibilities.some((row) => row.kind === 'collaborator')) ? (
          <div className="space-y-2">
            {bundle.parties.filter((row) => ['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].includes(row.role)).length > 0 ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('contribute.matters.work.invitedToCollaborate')}
                </p>
                <ul className="mt-1 space-y-1 text-sm text-foreground">
                  {bundle.parties
                    .filter((row) => ['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].includes(row.role))
                    .map((row) => (
                      <li key={row.id}>
                        {actorLabel(row.actor)} · {t(`contribute.matters.work.roles.${row.role}`)}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
            {bundle.responsibilities.filter((row) => row.kind === 'collaborator').length > 0 ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('contribute.matters.work.sharedResponsibility')}
                </p>
                <ul className="mt-1 space-y-1 text-sm text-foreground">
                  {bundle.responsibilities
                    .filter((row) => row.kind === 'collaborator')
                    .map((row) => (
                      <li key={row.id}>
                        {actorLabel(row.actor)} ·{' '}
                        {row.status === 'accepted'
                          ? t('contribute.matters.work.responsibleCollaborator')
                          : row.status === 'declined'
                            ? t('contribute.matters.work.declinedResponsibility')
                            : t('contribute.matters.work.sharedRequested')}
                        {row.responseReason ? ` — ${row.responseReason}` : ''}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <Card className="space-y-3 border-dashed p-4">
          <h3 className="text-sm font-medium">{t('contribute.matters.work.inviteParticipate')}</h3>
          <p className="text-xs text-muted-foreground">{t('contribute.matters.work.inviteParticipateHint')}</p>
          <OutlinedField label={t('contribute.matters.work.invitePerson')}>
            {inviteHit ? (
              <p className="py-1 text-sm">{inviteHit.displayName}</p>
            ) : (
              <Input
                value={inviteQuery}
                onChange={(event) => {
                  setInviteQuery(event.target.value);
                  searchPeople(event.target.value, setInviteHits);
                }}
              />
            )}
          </OutlinedField>
          {inviteHits.map((hit) => (
            <button
              key={hit.profileId}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                setInviteHit(hit);
                setInviteHits([]);
                setInviteQuery('');
              }}
            >
              {hit.displayName}
            </button>
          ))}
          <div className="flex flex-wrap gap-2">
            {['contributor', 'specialist', 'contractor', 'observer', 'evaluator'].map((role) => (
              <Button key={role} type="button" size="sm" variant={inviteRole === role ? 'default' : 'outline'} onClick={() => setInviteRole(role)}>
                {t(`contribute.matters.work.roles.${role}`)}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={busy || !inviteHit}
            onClick={() =>
              void run(async () => {
                if (!inviteHit) return;
                await inviteMatterParticipant(bundle.matter.id, {
                  role: inviteRole,
                  kind: inviteHit.kind as MatterActorKind,
                  profileId: inviteHit.profileId,
                });
                setInviteHit(null);
              })
            }
          >
            {t('contribute.matters.work.sendInvite')}
          </Button>
        </Card>
        <Card className="space-y-3 border-dashed p-4">
          <h3 className="text-sm font-medium">{t('contribute.matters.work.requestSharedResponsibility')}</h3>
          <p className="text-xs text-muted-foreground">{t('contribute.matters.work.requestSharedResponsibilityHint')}</p>
          <OutlinedField label={t('contribute.matters.work.invitePerson')}>
            {shareHit ? (
              <p className="py-1 text-sm">{shareHit.displayName}</p>
            ) : (
              <Input
                value={shareQuery}
                onChange={(event) => {
                  setShareQuery(event.target.value);
                  searchPeople(event.target.value, setShareHits);
                }}
              />
            )}
          </OutlinedField>
          {shareHits.map((hit) => (
            <button
              key={hit.profileId}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                setShareHit(hit);
                setShareHits([]);
                setShareQuery('');
              }}
            >
              {hit.displayName}
            </button>
          ))}
          <Button
            type="button"
            size="sm"
            disabled={busy || !shareHit}
            onClick={() =>
              void run(async () => {
                if (!shareHit) return;
                await inviteMatterParticipant(bundle.matter.id, {
                  role: 'responsible_collaborator',
                  kind: shareHit.kind as MatterActorKind,
                  profileId: shareHit.profileId,
                });
                setShareHit(null);
              })
            }
          >
            {t('contribute.matters.work.sendRequest')}
          </Button>
        </Card>
        </>
      ) : null}

      {canManageWork ? (
      <Card className="space-y-3 border-dashed p-4">
        <h3 className="text-sm font-medium">{t('contribute.matters.work.addTask')}</h3>
        <OutlinedField label={t('contribute.matters.work.taskTitle')}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </OutlinedField>
        <OutlinedField label={t('contribute.matters.work.assignee')}>
          {assignee ? (
            <div className="flex items-center justify-between gap-2 py-1">
              <p className="text-sm">{assignee.displayName}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAssignee(null)}>
                {t('common.edit')}
              </Button>
            </div>
          ) : (
            <Input
              value={assigneeQuery}
              onChange={(event) => {
                setAssigneeQuery(event.target.value);
                searchPeople(event.target.value, setHits);
              }}
            />
          )}
        </OutlinedField>
        {hits.map((hit) => (
          <button
            key={hit.profileId}
            type="button"
            className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setAssignee(hit);
              setHits([]);
              setAssigneeQuery('');
            }}
          >
            {hit.displayName}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reviewRequired} onChange={(event) => setReviewRequired(event.target.checked)} />
          {t('contribute.matters.work.reviewRequired')}
        </label>
        {bundle.tasks.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('contribute.matters.work.parentTask')}</p>
            {bundle.tasks.filter((task) => task.status !== 'cancelled').map((task) => (
              <label key={task.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="parent-task"
                  checked={parentTaskId === task.id}
                  onChange={() => setParentTaskId(task.id)}
                />
                {task.title}
              </label>
            ))}
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setParentTaskId('')}>
              {t('contribute.matters.work.noParent')}
            </button>
            <p className="text-xs text-muted-foreground">{t('contribute.matters.work.dependsOn')}</p>
            {bundle.tasks.filter((task) => task.status !== 'cancelled').map((task) => (
              <label key={`dep-${task.id}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dependsOn.includes(task.id)}
                  onChange={(event) =>
                    setDependsOn((current) =>
                      event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id),
                    )
                  }
                />
                {task.title}
              </label>
            ))}
          </div>
        ) : null}
        <Button
          type="button"
          disabled={busy || title.trim().length < 3}
          onClick={() =>
            void run(async () => {
              await createCollaborationTask({
                matterId: bundle.matter.id,
                title: title.trim(),
                assigneeKind: (assignee?.kind ?? 'person') as MatterActorKind,
                assigneeProfileId: assignee?.profileId,
                reviewRequired,
                parentTaskId: parentTaskId || null,
                dependsOn,
              });
              setTitle('');
              setAssignee(null);
              setDependsOn([]);
              setParentTaskId('');
              setReviewRequired(false);
            })
          }
        >
          {t('contribute.matters.work.createTask')}
        </Button>
      </Card>
      ) : null}

      <Card className="space-y-3 border-dashed p-4">
        <h3 className="text-sm font-medium">{t('contribute.matters.work.addDecision')}</h3>
        <OutlinedField label={t('contribute.matters.work.decisionTitle')}>
          <Input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} />
        </OutlinedField>
        <OutlinedField label={t('contribute.matters.work.decisionStatement')}>
          <Textarea value={decisionStatement} onChange={(event) => setDecisionStatement(event.target.value)} rows={3} />
        </OutlinedField>
        <OutlinedField label={t('contribute.matters.work.decisionRationale')}>
          <Textarea value={decisionRationale} onChange={(event) => setDecisionRationale(event.target.value)} rows={2} />
        </OutlinedField>
        <Button
          type="button"
          disabled={busy || decisionTitle.trim().length < 3 || decisionStatement.trim().length < 3}
          onClick={() =>
            void run(async () => {
              await proposeMatterDecision({
                matterId: bundle.matter.id,
                title: decisionTitle.trim(),
                statement: decisionStatement.trim(),
                rationale: decisionRationale.trim() || undefined,
              });
              setDecisionTitle('');
              setDecisionStatement('');
              setDecisionRationale('');
            })
          }
        >
          {t('contribute.matters.work.recordDecision')}
        </Button>
      </Card>
    </div>
  );
}
