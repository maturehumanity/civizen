import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  getActivationDecisionLabel,
  getActivationStatusLabel,
  type ActivationDecisionRow,
  type ActivationEvidenceRow,
  type ActivationReviewDecision,
  type ActivationThresholdReviewRow,
} from '@/lib/governance-activation-review';

interface GovernanceProgramReadinessScopeCardProps {
  review: ActivationThresholdReviewRow;
  latestEvidence: ActivationEvidenceRow | undefined;
  latestDecision: ActivationDecisionRow | undefined;
  recordingDecision: boolean;
  formatTimestamp: (value: string | null) => string;
  onRecordDecision: (args: { reviewId: string; decision: ActivationReviewDecision; notes: string }) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function statusBadgeClass(status: ActivationThresholdReviewRow['status']) {
  switch (status) {
    case 'activated':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'approved_for_activation':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    case 'pending_review':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'rejected':
    case 'revoked':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'pre_activation':
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function decisionBadgeClass(decision: ActivationReviewDecision) {
  switch (decision) {
    case 'approve':
    case 'declare_activation':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'request_changes':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'reject':
    case 'revoke_activation':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

const READINESS_DECISIONS: ActivationReviewDecision[] = [
  'approve',
  'request_changes',
  'declare_activation',
  'reject',
  'revoke_activation',
];

export function GovernanceProgramReadinessScopeCard({
  review,
  latestEvidence,
  latestDecision,
  recordingDecision,
  formatTimestamp,
  onRecordDecision,
  onDirtyChange,
}: GovernanceProgramReadinessScopeCardProps) {
  const [decision, setDecision] = useState<ActivationReviewDecision>('approve');
  const [notes, setNotes] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDecision('approve');
    setNotes('');
    setHistoryOpen(false);
    setSavedFlash(false);
    onDirtyChange?.(false);
    // Reset local form when switching the selected review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.id]);

  const markDirty = (nextDecision: ActivationReviewDecision, nextNotes: string) => {
    const dirty = nextDecision !== 'approve' || nextNotes.trim().length > 0;
    onDirtyChange?.(dirty);
  };

  const saveDisabled = recordingDecision;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {review.jurisdiction_label || (review.scope_type === 'world' ? 'World' : review.country_code)}
          </p>
          <p className="text-xs text-muted-foreground">
            {review.scope_type === 'world' ? 'World scope' : `Country ${review.country_code}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={statusBadgeClass(review.status)}>
            {getActivationStatusLabel(review.status)}
          </Badge>
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            Participating verified: {review.eligible_verified_citizens_count}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-2 text-xs md:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Verified members</p>
          <p className="font-medium text-foreground">{review.verified_citizens_count}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Participating verified</p>
          <p className="font-medium text-foreground">{review.eligible_verified_citizens_count}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Updated</p>
          <p className="font-medium text-foreground">{formatTimestamp(review.updated_at)}</p>
        </div>
      </div>

      {latestDecision ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Prior decision:{' '}
            <span className="text-foreground">{getActivationDecisionLabel(latestDecision.decision)}</span>
            {' '}
            ({formatTimestamp(latestDecision.created_at)})
          </span>
          <Badge variant="outline" className={decisionBadgeClass(latestDecision.decision)}>
            {getActivationDecisionLabel(latestDecision.decision)}
          </Badge>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No prior decision recorded for this scope.</p>
      )}

      <div className="mt-2">
        <Button type="button" size="sm" variant="ghost" className="h-auto px-0 text-xs" onClick={() => setHistoryOpen((v) => !v)}>
          {historyOpen ? 'Hide decision history' : 'Show decision history'}
        </Button>
        {historyOpen ? (
          <div className="mt-1 space-y-1 rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
            {latestDecision ? (
              <p>
                Latest: {getActivationDecisionLabel(latestDecision.decision)} · {formatTimestamp(latestDecision.created_at)}
                {latestDecision.notes ? ` · ${latestDecision.notes}` : ''}
              </p>
            ) : (
              <p>No history entries loaded for this record.</p>
            )}
            {latestEvidence ? (
              <p>
                Latest evidence: {latestEvidence.evidence_type} · {formatTimestamp(latestEvidence.created_at)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
        <div>
          <Label>Record decision for this scope</Label>
          <p className="text-xs text-muted-foreground">
            Choose an outcome and optional notes, then save. Only this selected record is updated.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)]">
          <Select
            value={decision}
            onValueChange={(value) => {
              const next = value as ActivationReviewDecision;
              setDecision(next);
              markDirty(next, notes);
            }}
          >
            <SelectTrigger aria-label="Decision">
              <SelectValue placeholder="Decision" />
            </SelectTrigger>
            <SelectContent>
              {READINESS_DECISIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {getActivationDecisionLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={notes}
            onChange={(event) => {
              const next = event.target.value;
              setNotes(next);
              markDirty(decision, next);
            }}
            placeholder="Decision notes (optional)"
            rows={2}
            aria-label="Decision notes"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={saveDisabled}
            onClick={() => {
              onRecordDecision({
                reviewId: review.id,
                decision,
                notes,
              });
              setSavedFlash(true);
              window.setTimeout(() => setSavedFlash(false), 2500);
            }}
          >
            {recordingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
            Save decision
          </Button>
          {saveDisabled ? (
            <p className="text-xs text-muted-foreground">Save is unavailable while a decision is being recorded.</p>
          ) : null}
          {savedFlash && !recordingDecision ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
              Decision submitted. List status refreshes after the server updates.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
