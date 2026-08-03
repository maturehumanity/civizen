import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  isMissingActivationReviewBackend,
  type ActivationDecisionRow,
  type ActivationEvidenceRow,
  type ActivationReviewDecision,
  type ActivationThresholdReviewRow,
} from '@/lib/governance-activation-review';

function buildLatestByReviewId<T extends { review_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T>>((accumulator, row) => {
    if (!accumulator[row.review_id]) {
      accumulator[row.review_id] = row;
    }
    return accumulator;
  }, {});
}

export function useGovernanceActivationReview(args: { profileId: string | null | undefined }) {
  const [loadingActivationReview, setLoadingActivationReview] = useState(true);
  const [activationReviewBackendUnavailable, setActivationReviewBackendUnavailable] = useState(false);
  const [recordingActivationDecisionReviewId, setRecordingActivationDecisionReviewId] = useState<string | null>(null);

  const [activationReviews, setActivationReviews] = useState<ActivationThresholdReviewRow[]>([]);
  const [latestActivationEvidenceByReviewId, setLatestActivationEvidenceByReviewId] = useState<Record<string, ActivationEvidenceRow>>({});
  const [latestActivationDecisionByReviewId, setLatestActivationDecisionByReviewId] = useState<Record<string, ActivationDecisionRow>>({});

  const loadActivationReviewData = useCallback(async () => {
    setLoadingActivationReview(true);

    const [reviewResponse, evidenceResponse, decisionsResponse] = await Promise.all([
      supabase
        .from('activation_threshold_reviews')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(120),
      supabase
        .from('activation_evidence')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(400),
      supabase
        .from('activation_decisions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(400),
    ]);

    const sharedError = reviewResponse.error || evidenceResponse.error || decisionsResponse.error;
    if (isMissingActivationReviewBackend(sharedError)) {
      setActivationReviewBackendUnavailable(true);
      setLoadingActivationReview(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load program readiness stewardship data:', {
        reviewError: reviewResponse.error,
        evidenceError: evidenceResponse.error,
        decisionsError: decisionsResponse.error,
      });
      toast.error('Could not load program readiness data.');
      setLoadingActivationReview(false);
      return;
    }

    const reviews = reviewResponse.data ?? [];
    const evidenceRows = evidenceResponse.data ?? [];
    const decisionRows = decisionsResponse.data ?? [];

    setActivationReviews(reviews);
    setLatestActivationEvidenceByReviewId(buildLatestByReviewId(evidenceRows));
    setLatestActivationDecisionByReviewId(buildLatestByReviewId(decisionRows));
    setActivationReviewBackendUnavailable(false);
    setLoadingActivationReview(false);
  }, []);

  useEffect(() => {
    void loadActivationReviewData();
  }, [loadActivationReviewData]);

  const handleRecordActivationDecision = useCallback(async (argsForDecision: {
    reviewId: string;
    decision: ActivationReviewDecision;
    notes: string;
  }) => {
    if (!args.profileId || activationReviewBackendUnavailable) return;

    setRecordingActivationDecisionReviewId(argsForDecision.reviewId);

    const { error } = await supabase
      .from('activation_decisions')
      .insert({
        review_id: argsForDecision.reviewId,
        reviewer_id: args.profileId,
        // Legacy database enum retained temporarily. Never display activation terminology.
        decision: argsForDecision.decision,
        notes: argsForDecision.notes || null,
        metadata: {
          source: 'governance_admin_program_readiness_card',
        },
      });

    if (error) {
      console.error('Failed to record program readiness decision:', error);
      toast.error('Could not record the readiness decision.');
      setRecordingActivationDecisionReviewId(null);
      return;
    }

    toast.success('Readiness decision recorded.');
    setRecordingActivationDecisionReviewId(null);
    await loadActivationReviewData();
  }, [activationReviewBackendUnavailable, args.profileId, loadActivationReviewData]);

  return {
    loadingActivationReview,
    activationReviewBackendUnavailable,
    recordingActivationDecisionReviewId,
    activationReviews,
    latestActivationEvidenceByReviewId,
    latestActivationDecisionByReviewId,
    handleRecordActivationDecision,
  };
}
