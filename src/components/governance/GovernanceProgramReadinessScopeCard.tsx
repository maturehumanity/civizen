import { useState } from 'react';
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
}: GovernanceProgramReadinessScopeCardProps) {
  const [decision, setDecision] = useState<ActivationReviewDecision>('approve');
  const [notes, setNotes] = useState('');

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{review.jurisdiction_label || (review.scope_type === 'world' ? 'World' : review.country_code)}</p>
          <p className="text-xs text-muted-foreground">{review.scope_type === 'world' ? 'World scope' : `Country ${review.country_code}`}</p>
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

      {(latestEvidence || latestDecision) ? (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {latestDecision ? (
            <p>
              Latest decision:
              {' '}
              <span className="text-foreground">{getActivationDecisionLabel(latestDecision.decision)}</span>
              {' '}
              ({formatTimestamp(latestDecision.created_at)})
            </p>
          ) : null}
          {latestEvidence ? (
            <p>
              Latest evidence:
              {' '}
              <span className="text-foreground">{latestEvidence.evidence_type}</span>
              {' '}
              ({formatTimestamp(latestEvidence.created_at)})
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Label>Record decision</Label>
          <div className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)]">
            <Select value={decision} onValueChange={(value) => setDecision(value as ActivationReviewDecision)}>
              <SelectTrigger>
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
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Decision notes"
              rows={2}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={recordingDecision}
            onClick={() =>
              onRecordDecision({
                reviewId: review.id,
                decision,
                notes,
              })
            }
          >
            {recordingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
            Save decision
          </Button>
        </div>
      </div>

      {latestDecision ? (
        <div className="mt-2 flex justify-end">
          <Badge variant="outline" className={decisionBadgeClass(latestDecision.decision)}>
            {getActivationDecisionLabel(latestDecision.decision)}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
