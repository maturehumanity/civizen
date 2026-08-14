/** Plain-language explanations for contribution and reputation changes. */

import type { ContributionLifecycleView } from '@/lib/civizen-contribution-lifecycle';

export type AssessmentChangeExplanation = {
  title: string;
  detail: string;
};

export function explainContributionChange(args: {
  previous?: Pick<ContributionLifecycleView, 'realizedImpact' | 'evidenceConfidence' | 'verificationKind' | 'stage'> | null;
  current: Pick<ContributionLifecycleView, 'realizedImpact' | 'evidenceConfidence' | 'verificationKind' | 'stage' | 'adverseOutcome'>;
  cause?: string | null;
}): AssessmentChangeExplanation | null {
  const previous = args.previous;
  const current = args.current;
  const cause = args.cause ?? '';
  if (cause.includes('collusion') || cause.includes('conflict') || cause === 'evaluator_reweight') {
    return {
      title: 'Evaluator weight decreased',
      detail: 'Confirmed conflict or collusive behavior affected reliability. Previous ratings remain on record; current weight was recomputed.',
    };
  }
  if (current.adverseOutcome && previous && previous.realizedImpact !== 'unknown') {
    return {
      title: 'Realized impact decreased',
      detail: 'Later outcome data showed limited problem resolution or harm. The original evaluation is preserved.',
    };
  }
  if (previous && previous.realizedImpact !== 'unknown' && current.realizedImpact !== 'unknown'
    && current.realizedImpact < previous.realizedImpact) {
    return {
      title: 'Realized impact decreased',
      detail: 'Later outcome data showed limited problem resolution. The original evaluation is preserved.',
    };
  }
  if ((previous == null || previous.realizedImpact === 'unknown') && current.realizedImpact !== 'unknown') {
    return {
      title: 'Realized impact increased',
      detail: 'Verified beneficiaries or measured outcomes reported sustained benefit.',
    };
  }
  if (previous && previous.realizedImpact !== 'unknown' && current.realizedImpact !== 'unknown'
    && current.realizedImpact > previous.realizedImpact) {
    return {
      title: 'Realized impact increased',
      detail: 'More verified beneficiaries reported sustained benefit, or later measured outcomes improved.',
    };
  }
  if (current.verificationKind === 'independently_validated' && previous?.verificationKind !== 'independently_validated') {
    return {
      title: 'Evidence confidence increased',
      detail: 'Independent validation was added to the same contribution.',
    };
  }
  if (previous && previous.evidenceConfidence !== current.evidenceConfidence && current.evidenceConfidence === 'high') {
    return {
      title: 'Evidence confidence increased',
      detail: 'Independent institutional validation or stronger outcome evidence was added.',
    };
  }
  return null;
}

export function explainScoreChange(args: {
  previousScore: number | null;
  newScore: number | null;
  previousConfidence?: string | null;
  newConfidence?: string | null;
  cause?: string | null;
}): AssessmentChangeExplanation {
  const cause = args.cause ?? '';
  if (cause.includes('collusion') || cause === 'evaluator_reweight') {
    return {
      title: 'Evaluator weight decreased',
      detail: 'Confirmed conflict or collusive behavior affected reliability. Dependent Contributions reputation was recomputed.',
    };
  }
  if (cause === 'independent_validation') {
    return {
      title: 'Evidence confidence increased',
      detail: 'Independent validation was added to an existing contribution.',
    };
  }
  if (cause === 'beneficiary_feedback' || cause === 'impact_outcome' || cause === 'durability') {
    return {
      title: 'Realized impact increased',
      detail: 'Later verified outcome or beneficiary evidence changed the contribution assessment.',
    };
  }
  if (cause === 'reversal' || cause === 'adverse_outcome') {
    return {
      title: 'Realized impact decreased',
      detail: 'Later outcome data showed limited problem resolution or an adverse consequence.',
    };
  }
  return {
    title: 'Reputation recomputed',
    detail: 'New evidence changed a contribution assessment. Score V2 recomputed automatically from the current evidence.',
  };
}
