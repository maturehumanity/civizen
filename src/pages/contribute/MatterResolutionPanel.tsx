import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  actorLabel,
  type FormalActionType,
  viewerRepresents,
} from '@/lib/matters';
import type { MatterDetailBundle } from '@/lib/matters-api';
import {
  performMatterFormalAction,
  performOutcomeFollowup,
  performResolutionReview,
  proposeMatterResolution,
  scheduleMatterOutcomeFollowup,
  submitMatterEvaluation,
} from '@/lib/matters-api';
import {
  EVALUATION_DIMENSIONS,
  EVALUATION_RATINGS,
  OUTCOME_RESULTS,
  patternWarning,
  resolutionKindsForMatterType,
  resolutionStatusLabel,
} from '@/lib/matters-resolution';
import { toast } from 'sonner';

type Props = {
  bundle: MatterDetailBundle;
  profileId: string;
  linkedIds: string[];
  busy: boolean;
  onBusy: (value: boolean) => void;
  onReload: () => Promise<void>;
  t: (key: string) => string;
};

export function MatterResolutionPanel({ bundle, profileId, linkedIds, busy, onBusy, onReload, t }: Props) {
  const matter = bundle.matter;
  const resolutions = bundle.resolutions ?? [];
  const pattern = bundle.patternCounts;
  const warning = pattern ? patternWarning(pattern) : null;

  const reviewAction = bundle.pendingActions.find(
    (item) => item.actionType === 'review_resolution' && viewerRepresents(profileId, item.assignedActor, linkedIds),
  );
  const proposeAction = bundle.pendingActions.find(
    (item) => item.actionType === 'propose_resolution' && viewerRepresents(profileId, item.assignedActor, linkedIds),
  );
  const outcomeAction = bundle.pendingActions.find(
    (item) => item.actionType === 'outcome_followup' && viewerRepresents(profileId, item.assignedActor, linkedIds),
  );

  const viewerIsInitiator = viewerRepresents(profileId, matter.initiator, linkedIds);
  const viewerIsLead = viewerRepresents(profileId, matter.responsible, linkedIds);

  const [resolutionKind, setResolutionKind] = useState(resolutionKindsForMatterType(matter.matterType)[0]);
  const [summary, setSummary] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [limitations, setLimitations] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [followUpChoice, setFollowUpChoice] = useState<'continue' | 'follow_up'>('continue');
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDescription, setFollowUpDescription] = useState('');
  const [evalDimension, setEvalDimension] = useState<(typeof EVALUATION_DIMENSIONS)[number]>('resolution_quality');
  const [evalRating, setEvalRating] = useState<(typeof EVALUATION_RATINGS)[number]>('adequate');
  const [evalComment, setEvalComment] = useState('');
  const [outcomeResult, setOutcomeResult] = useState<(typeof OUTCOME_RESULTS)[number]>('partly_improved');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const kinds = useMemo(() => resolutionKindsForMatterType(matter.matterType), [matter.matterType]);
  const latest = resolutions.at(-1) ?? null;

  const runReview = async (action: FormalActionType) => {
    if (!reviewAction) return;
    if (['confirm_not_resolved', 'confirm_partially_resolved', 'need_clarification', 'cannot_verify'].includes(action)
      && reviewMessage.trim().length < 3) {
      toast.error(t('contribute.matters.resolution.reasonRequired'));
      return;
    }
    onBusy(true);
    try {
      if (reviewAction.actionType === 'review_resolution') {
        await performResolutionReview(reviewAction.id, action, {
          message: reviewMessage.trim() || undefined,
          followUpChoice: action === 'confirm_partially_resolved' ? followUpChoice : undefined,
          followUpTitle: followUpChoice === 'follow_up' ? followUpTitle : undefined,
          followUpDescription: followUpChoice === 'follow_up' ? followUpDescription : undefined,
        });
      } else {
        await performMatterFormalAction(matter.id, action, { message: reviewMessage.trim() || undefined });
      }
      setReviewMessage('');
      toast.success(t('contribute.matters.resolution.reviewSaved'));
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
    } finally {
      onBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('contribute.matters.sections.resolution')}
      </h2>
      {warning ? <p className="text-sm text-amber-700 dark:text-amber-300">{warning}</p> : null}
      {latest?.outstandingItems ? (
        <Card className="border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {t('contribute.matters.resolution.outstandingWork')}: {latest.outstandingItems}
        </Card>
      ) : null}
      {resolutions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('contribute.matters.resolution.noneYet')}</p>
      ) : (
        <div className="space-y-2">
          {resolutions.map((resolution) => (
            <Card key={resolution.id} className="space-y-1 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {t('contribute.matters.resolution.attempt')} {resolution.attemptNumber}
                </p>
                <Badge variant="outline">{resolution.resolutionKind.replaceAll('_', ' ')}</Badge>
                <Badge variant="secondary">{resolution.resolutionStatus.replaceAll('_', ' ')}</Badge>
              </div>
              <p className="text-sm">{resolution.summary}</p>
              <p className="text-xs text-muted-foreground">{resolutionStatusLabel(resolution)}</p>
            </Card>
          ))}
        </div>
      )}

      {proposeAction ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.resolution.proposeTitle')}</p>
          <OutlinedField label={t('contribute.matters.resolution.kind')} htmlFor="resolution-kind">
            <Select value={resolutionKind} onValueChange={(value) => setResolutionKind(value as typeof resolutionKind)}>
              <SelectTrigger id="resolution-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                {kinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>{kind.replaceAll('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.resolution.summary')} htmlFor="resolution-summary">
            <Textarea id="resolution-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.resolution.actionsTaken')} htmlFor="resolution-actions">
            <Textarea id="resolution-actions" value={actionsTaken} onChange={(e) => setActionsTaken(e.target.value)} rows={2} />
          </OutlinedField>
          <OutlinedField label={t('contribute.matters.resolution.limitations')} htmlFor="resolution-limits">
            <Textarea id="resolution-limits" value={limitations} onChange={(e) => setLimitations(e.target.value)} rows={2} />
          </OutlinedField>
          <Button
            type="button"
            disabled={busy || summary.trim().length < 3}
            onClick={() => void (async () => {
              onBusy(true);
              try {
                await proposeMatterResolution({
                  matterId: matter.id,
                  resolutionKind,
                  summary: summary.trim(),
                  actionsTaken: actionsTaken.trim() || undefined,
                  limitations: limitations.trim() || undefined,
                });
                toast.success(t('contribute.matters.resolution.proposed'));
                await onReload();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
              } finally {
                onBusy(false);
              }
            })()}
          >
            {t('contribute.matters.resolution.proposeAction')}
          </Button>
        </Card>
      ) : null}

      {reviewAction && viewerIsInitiator ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.resolution.reviewTitle')}</p>
          <OutlinedField label={t('contribute.matters.resolution.reviewMessage')} htmlFor="resolution-review-msg">
            <Textarea id="resolution-review-msg" value={reviewMessage} onChange={(e) => setReviewMessage(e.target.value)} rows={3} />
          </OutlinedField>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void runReview('confirm_resolved')}>
              {t('contribute.matters.actions.confirm_resolved')}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runReview('confirm_partially_resolved')}>
              {t('contribute.matters.actions.confirm_partially_resolved')}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runReview('confirm_not_resolved')}>
              {t('contribute.matters.actions.confirm_not_resolved')}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void runReview('need_clarification')}>
              {t('contribute.matters.actions.need_clarification')}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void runReview('cannot_verify')}>
              {t('contribute.matters.resolution.cannotVerify')}
            </Button>
          </div>
          <Select value={followUpChoice} onValueChange={(value) => setFollowUpChoice(value as 'continue' | 'follow_up')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="continue">{t('contribute.matters.resolution.continueMatter')}</SelectItem>
              <SelectItem value="follow_up">{t('contribute.matters.resolution.createFollowUp')}</SelectItem>
            </SelectContent>
          </Select>
          {followUpChoice === 'follow_up' ? (
            <>
              <OutlinedField label={t('contribute.matters.resolution.followUpTitle')} htmlFor="follow-up-title">
                <Textarea id="follow-up-title" value={followUpTitle} onChange={(e) => setFollowUpTitle(e.target.value)} rows={1} />
              </OutlinedField>
              <OutlinedField label={t('contribute.matters.resolution.followUpDescription')} htmlFor="follow-up-desc">
                <Textarea id="follow-up-desc" value={followUpDescription} onChange={(e) => setFollowUpDescription(e.target.value)} rows={2} />
              </OutlinedField>
            </>
          ) : null}
        </Card>
      ) : null}

      {matter.lifecycleStatus === 'closed' && (viewerIsInitiator || viewerIsLead) ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.outcome.scheduleTitle')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void (async () => {
              onBusy(true);
              try {
                await scheduleMatterOutcomeFollowup({ matterId: matter.id, resolutionId: latest?.id ?? null });
                toast.success(t('contribute.matters.outcome.scheduled'));
                await onReload();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
              } finally {
                onBusy(false);
              }
            })()}
          >
            {t('contribute.matters.outcome.scheduleAction')}
          </Button>
        </Card>
      ) : null}

      {(bundle.outcomeFollowups ?? []).length > 0 ? (
        <div className="space-y-2">
          {(bundle.outcomeFollowups ?? []).map((row) => (
            <Card key={row.id} className="p-3 text-sm">
              <p className="font-medium">{row.outcomeQuestion}</p>
              <p className="text-xs text-muted-foreground">
                {row.status} · {actorLabel(row.reviewer)} · {new Date(row.reviewDueAt).toLocaleDateString()}
              </p>
              {row.result ? <p>{row.result.replaceAll('_', ' ')}{row.notes ? ` — ${row.notes}` : ''}</p> : null}
            </Card>
          ))}
        </div>
      ) : null}

      {outcomeAction ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.outcome.recordTitle')}</p>
          <Select value={outcomeResult} onValueChange={(value) => setOutcomeResult(value as typeof outcomeResult)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OUTCOME_RESULTS.map((result) => (
                <SelectItem key={result} value={result}>{result.replaceAll('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <OutlinedField label={t('contribute.matters.outcome.notes')} htmlFor="outcome-notes">
            <Textarea id="outcome-notes" value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} rows={2} />
          </OutlinedField>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void (async () => {
              onBusy(true);
              try {
                await performOutcomeFollowup(outcomeAction.id, outcomeResult, outcomeNotes.trim() || undefined);
                toast.success(t('contribute.matters.outcome.recorded'));
                await onReload();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
              } finally {
                onBusy(false);
              }
            })()}
          >
            {t('contribute.matters.outcome.recordAction')}
          </Button>
        </Card>
      ) : null}

      {matter.lifecycleStatus === 'closed' && viewerIsInitiator ? (
        <Card className="space-y-3 border-dashed p-4">
          <p className="text-sm font-medium">{t('contribute.matters.evaluation.title')}</p>
          <Select value={evalDimension} onValueChange={(value) => setEvalDimension(value as typeof evalDimension)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVALUATION_DIMENSIONS.map((dimension) => (
                <SelectItem key={dimension} value={dimension}>{dimension.replaceAll('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={evalRating} onValueChange={(value) => setEvalRating(value as typeof evalRating)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVALUATION_RATINGS.map((rating) => (
                <SelectItem key={rating} value={rating}>{rating}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <OutlinedField label={t('contribute.matters.evaluation.comment')} htmlFor="eval-comment">
            <Textarea id="eval-comment" value={evalComment} onChange={(e) => setEvalComment(e.target.value)} rows={2} />
          </OutlinedField>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void (async () => {
              onBusy(true);
              try {
                await submitMatterEvaluation({
                  matterId: matter.id,
                  resolutionId: latest?.id ?? null,
                  evaluatorRole: 'initiator',
                  dimension: evalDimension,
                  rating: evalRating,
                  comment: evalComment.trim() || undefined,
                });
                toast.success(t('contribute.matters.evaluation.saved'));
                await onReload();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t('contribute.matters.actionFailed'));
              } finally {
                onBusy(false);
              }
            })()}
          >
            {t('contribute.matters.evaluation.save')}
          </Button>
        </Card>
      ) : null}
    </section>
  );
}
