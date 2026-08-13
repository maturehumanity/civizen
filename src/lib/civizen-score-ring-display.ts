import type { CivizenScoreResponse } from '@/lib/civizen-score';
import { formatScoreValue } from '@/lib/civizen-score';

export type OwnProfileRingPresentation = 'established' | 'provisional' | 'empty';

export type OwnProfileRingDisplay = {
  presentation: OwnProfileRingPresentation;
  value: number | null;
  progress: number;
  centerLabel: string;
  caption: string | null;
};

export function ownProfileRingDisplay(score: CivizenScoreResponse): OwnProfileRingDisplay {
  if (score.overall.status === 'established' && score.overall.score != null) {
    return {
      presentation: 'established',
      value: score.overall.score,
      progress: score.overall.score / 100,
      centerLabel: `${Math.round(score.overall.score)}%`,
      caption: null,
    };
  }
  if (score.overall.provisionalEstimate != null) {
    return {
      presentation: 'provisional',
      value: score.overall.provisionalEstimate,
      progress: score.overall.provisionalEstimate / 100,
      centerLabel: formatScoreValue(score.overall.provisionalEstimate),
      caption: 'Estimate',
    };
  }
  return {
    presentation: 'empty',
    value: null,
    progress: 0,
    centerLabel: '—',
    caption: null,
  };
}
