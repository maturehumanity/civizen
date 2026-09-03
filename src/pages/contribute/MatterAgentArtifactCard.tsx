import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import {
  artifactProvisionalLabel,
  facilitationSections,
  parsePlanProposal,
  type MatterAgentArtifact,
} from '@/lib/matters-ai';
import {
  parseCodeChangeArtifact,
  parseImplementationPlan,
  parseScopeExpansionRequest,
} from '@/lib/matters-coding-policy';
import {
  adoptMatterAgentPlanTask,
  approveMatterCodingPlan,
  approveMatterCodingScopeExpansion,
  promoteAgentDecisionSuggestion,
} from '@/lib/matters-api';
import type { MatterEvent } from '@/lib/matters';
import { toast } from 'sonner';

type Props = {
  artifact: MatterAgentArtifact;
  events: MatterEvent[];
  canManage: boolean;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onReload: () => Promise<void>;
  t: (key: string) => string;
};

export function MatterAgentArtifactCard({
  artifact,
  events,
  canManage,
  busy,
  onBusy,
  onReload,
  t,
}: Props) {
  const adoptedTitles = useMemo(
    () => new Set(
      events
        .filter((event) => event.eventType === 'ai_plan_task_adopted' && event.payload?.artifactId === artifact.id)
        .map((event) => String(event.payload?.proposedTitle ?? '')),
    ),
    [events, artifact.id],
  );

  const plan = artifact.artifactType === 'proposed_plan' ? parsePlanProposal(artifact.body) : null;
  const facilitation = artifact.artifactType === 'facilitation_summary' ? facilitationSections(artifact.body) : null;
  const implementationPlan = artifact.artifactType === 'implementation_plan' ? parseImplementationPlan(artifact.body) : null;
  const codeChange = artifact.artifactType === 'code_change' ? parseCodeChangeArtifact(artifact.body) : null;
  const scopeRequest = artifact.artifactType === 'scope_expansion_request' ? parseScopeExpansionRequest(artifact.body) : null;
  const commandDenial = artifact.artifactType === 'command_denial' ? (() => {
    try {
      return JSON.parse(artifact.body) as Record<string, unknown>;
    } catch {
      return { reason: artifact.body };
    }
  })() : null;

  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionStatement, setDecisionStatement] = useState('');

  const provisional = artifactProvisionalLabel(artifact.artifactType, artifact.reviewStatus);

  const startAdoptTask = (index: number) => {
    const task = plan?.tasks[index];
    if (!task) return;
    setEditingTaskIndex(index);
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? '');
    setSelectedDeps(task.dependsOn ?? []);
  };

  const adoptTask = async () => {
    if (editingTaskIndex === null || taskTitle.trim().length < 3) return;
    onBusy(true);
    try {
      await adoptMatterAgentPlanTask(
        artifact.id,
        taskTitle.trim(),
        taskDescription.trim() || undefined,
        selectedDeps,
      );
      toast.success(t('contribute.matters.ai.taskAdopted'));
      setEditingTaskIndex(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
    } finally {
      onBusy(false);
    }
  };

  const promoteDecision = async () => {
    if (decisionTitle.trim().length < 3 || decisionStatement.trim().length < 3) {
      toast.error(t('contribute.matters.work.decisionTitle'));
      return;
    }
    onBusy(true);
    try {
      await promoteAgentDecisionSuggestion(artifact.id, decisionTitle.trim(), decisionStatement.trim());
      toast.success(t('contribute.matters.ai.decisionPromoted'));
      setDecisionOpen(false);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
    } finally {
      onBusy(false);
    }
  };

  return (
    <Card className="min-w-0 space-y-2 overflow-x-hidden border-dashed p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{artifact.title}</p>
        <Badge variant="outline">{t('contribute.matters.ai.aiGenerated')}</Badge>
        <Badge variant="outline">{artifact.artifactType.replaceAll('_', ' ')}</Badge>
        <Badge variant="secondary">{provisional}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {artifact.agentDisplayName ?? 'AI Agent'} · AI · {new Date(artifact.createdAt).toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{t('contribute.matters.ai.provisionalHint')}</p>

      {plan ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{plan.title}</p>
          {plan.tasks.map((task, index) => {
            const adopted = adoptedTitles.has(task.title);
            return (
              <Card key={`${task.title}-${index}`} className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description ? <p className="text-xs text-muted-foreground">{task.description}</p> : null}
                    {task.dependsOn && task.dependsOn.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t('contribute.matters.work.dependsOn')}: {task.dependsOn.join(', ')}
                      </p>
                    ) : null}
                  </div>
                  {adopted ? (
                    <Badge variant="secondary">{t('contribute.matters.ai.taskCreated')}</Badge>
                  ) : canManage ? (
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => startAdoptTask(index)}>
                      {t('contribute.matters.ai.createTaskFromProposal')}
                    </Button>
                  ) : null}
                </div>
                {editingTaskIndex === index ? (
                  <div className="space-y-2 border-t pt-2">
                    <OutlinedField label={t('contribute.matters.work.taskTitle')} htmlFor={`plan-task-title-${index}`}>
                      <Input
                        id={`plan-task-title-${index}`}
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                      />
                    </OutlinedField>
                    <OutlinedField label={t('contribute.matters.descriptionHeading')} htmlFor={`plan-task-desc-${index}`}>
                      <Textarea
                        id={`plan-task-desc-${index}`}
                        value={taskDescription}
                        onChange={(event) => setTaskDescription(event.target.value)}
                        rows={2}
                      />
                    </OutlinedField>
                    {plan.tasks.filter((_, i) => i < index).length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{t('contribute.matters.work.dependsOn')}</p>
                        {plan.tasks.slice(0, index).map((dep) => (
                          <label key={dep.title} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedDeps.includes(dep.title)}
                              onCheckedChange={(checked) => {
                                setSelectedDeps((current) => (
                                  checked
                                    ? [...current, dep.title]
                                    : current.filter((title) => title !== dep.title)
                                ));
                              }}
                            />
                            {dep.title}
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void adoptTask()}>
                        {t('contribute.matters.work.createTask')}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTaskIndex(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : implementationPlan ? (
        <div className="min-w-0 space-y-2 overflow-x-hidden text-sm">
          <p className="font-medium">{implementationPlan.title}</p>
          <p className="text-xs text-muted-foreground">{t('contribute.matters.ai.planWaiting')}</p>
          <ol className="list-decimal space-y-1 pl-5">
            {implementationPlan.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {implementationPlan.files.length > 0 ? (
            <p className="break-all text-xs text-muted-foreground">
              {t('contribute.matters.ai.allowedPaths')}: {implementationPlan.files.join(', ')}
            </p>
          ) : null}
          {canManage && artifact.reviewStatus === 'pending' ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void (async () => {
                onBusy(true);
                try {
                  await approveMatterCodingPlan(artifact.id);
                  toast.success(t('contribute.matters.ai.planApprove'));
                  await onReload();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
                } finally {
                  onBusy(false);
                }
              })()}
            >
              {t('contribute.matters.ai.planApprove')}
            </Button>
          ) : null}
        </div>
      ) : codeChange ? (
        <div className="min-w-0 space-y-2 overflow-x-hidden text-sm">
          <p className="text-xs text-muted-foreground">
            {t('contribute.matters.ai.baseCommit')}: {codeChange.baseCommitSha.slice(0, 12)}
          </p>
          <p>{t('contribute.matters.ai.filesChanged')}: {codeChange.changedFiles.join(', ') || 'none'}</p>
          <div>
            <p className="font-medium">{t('contribute.matters.ai.testResults')}</p>
            <ul className="list-disc pl-5 text-xs">
              {codeChange.tests.map((row) => (
                <li key={row.name}>{row.name}: {row.result}</li>
              ))}
            </ul>
          </div>
          {codeChange.diff ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-xs">
              {t('contribute.matters.ai.diff')}
              {'\n'}
              {codeChange.diff}
            </pre>
          ) : null}
          {codeChange.readyForHumanCommit ? (
            <Badge variant="secondary">{t('contribute.matters.ai.readyForCommit')}</Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">{t('contribute.matters.ai.notPushed')}</p>
          {codeChange.remainingConcerns.map((item) => (
            <p key={item} className="text-xs text-muted-foreground">{item}</p>
          ))}
        </div>
      ) : scopeRequest ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{t('contribute.matters.ai.scopeExpand')}</p>
          <p className="break-all">{scopeRequest.path}</p>
          <p className="text-xs text-muted-foreground">{scopeRequest.reason}</p>
          {scopeRequest.intended ? <p className="text-xs text-muted-foreground">{scopeRequest.intended}</p> : null}
          {canManage && artifact.reviewStatus === 'pending' ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void (async () => {
                onBusy(true);
                try {
                  await approveMatterCodingScopeExpansion(artifact.id, scopeRequest.path);
                  toast.success(t('contribute.matters.ai.scopeExpand'));
                  await onReload();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
                } finally {
                  onBusy(false);
                }
              })()}
            >
              {t('contribute.matters.ai.scopeExpand')}
            </Button>
          ) : null}
        </div>
      ) : commandDenial ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">{t('contribute.matters.ai.deniedCommand')}</p>
          <p className="break-all text-xs">{String(commandDenial.command ?? commandDenial.path ?? '')}</p>
          <p className="text-xs text-muted-foreground">{String(commandDenial.reason ?? artifact.body)}</p>
        </div>
      ) : facilitation ? (
        <div className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap">{facilitation.summary}</p>
          {facilitation.possibleDecisions.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium">{t('contribute.matters.ai.suggestedDecisions')}</p>
              {facilitation.possibleDecisions.map((suggestion) => (
                <Card key={suggestion} className="space-y-2 p-3">
                  <p>{suggestion}</p>
                  {canManage && !decisionOpen ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setDecisionOpen(true);
                        setDecisionTitle(suggestion.slice(0, 120));
                        setDecisionStatement(suggestion);
                      }}
                    >
                      {t('contribute.matters.ai.createDecision')}
                    </Button>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : null}
          {decisionOpen ? (
            <Card className="space-y-2 p-3">
              <OutlinedField label={t('contribute.matters.work.decisionTitle')} htmlFor="facilitation-decision-title">
                <Input
                  id="facilitation-decision-title"
                  value={decisionTitle}
                  onChange={(event) => setDecisionTitle(event.target.value)}
                />
              </OutlinedField>
              <OutlinedField label={t('contribute.matters.work.decisionStatement')} htmlFor="facilitation-decision-statement">
                <Textarea
                  id="facilitation-decision-statement"
                  value={decisionStatement}
                  onChange={(event) => setDecisionStatement(event.target.value)}
                  rows={3}
                />
              </OutlinedField>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void promoteDecision()}>
                  {t('contribute.matters.ai.promoteDecision')}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDecisionOpen(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{artifact.body}</p>
      )}

      {artifact.sourceReferences.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {artifact.sourceReferences.map((ref) => (
            <li key={`${ref.kind}-${ref.label}`}>{ref.label}{ref.ref ? ` — ${ref.ref}` : ''}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
