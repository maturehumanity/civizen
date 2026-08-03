import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  type ActivationDecisionRow,
  type ActivationEvidenceRow,
  type ActivationReviewDecision,
  type ActivationThresholdReviewRow,
} from '@/lib/governance-activation-review';
import { GovernanceProgramReadinessScopeCard } from '@/components/governance/GovernanceProgramReadinessScopeCard';

interface GovernanceProgramReadinessCardProps {
  reviews: ActivationThresholdReviewRow[];
  latestEvidenceByReviewId: Record<string, ActivationEvidenceRow>;
  latestDecisionByReviewId: Record<string, ActivationDecisionRow>;
  loading: boolean;
  backendUnavailable: boolean;
  recordingDecisionReviewId: string | null;
  formatTimestamp: (value: string | null) => string;
  onRecordDecision: (args: { reviewId: string; decision: ActivationReviewDecision; notes: string }) => void;
}

export function GovernanceProgramReadinessCard({
  reviews,
  latestEvidenceByReviewId,
  latestDecisionByReviewId,
  loading,
  backendUnavailable,
  recordingDecisionReviewId,
  formatTimestamp,
  onRecordDecision,
}: GovernanceProgramReadinessCardProps) {
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((left, right) => {
      if (left.scope_type !== right.scope_type) return left.scope_type === 'world' ? -1 : 1;
      if (left.country_code !== right.country_code) return left.country_code.localeCompare(right.country_code);
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [reviews]);

  return (
    <Card id="stewardship-program-readiness" className="scroll-mt-24 p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Program Readiness</h2>
        <p className="text-sm text-muted-foreground">
          Review operational capacity, participating members, integrity checks, and program availability.
        </p>
      </div>

      {backendUnavailable ? (
        <p className="mt-4 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Program readiness tables are not available in this environment yet.
        </p>
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading program readiness data...
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sortedReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No program readiness reviews found yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedReviews.map((review) => (
                <GovernanceProgramReadinessScopeCard
                  key={review.id}
                  review={review}
                  latestEvidence={latestEvidenceByReviewId[review.id]}
                  latestDecision={latestDecisionByReviewId[review.id]}
                  recordingDecision={recordingDecisionReviewId === review.id}
                  formatTimestamp={formatTimestamp}
                  onRecordDecision={onRecordDecision}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
