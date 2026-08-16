import type { HappinessDomainId } from '@/lib/happiness/types';
import { OUTCOME_COPY } from './copy';
import type { HumanOutcomeComparison, HumanOutcomeReview, PublicOutcomeLesson } from './types';

const RELATED: Record<string, string[]> = {
  transportation: ['transit', 'transport', 'commute', 'shuttle'],
  commute: ['transportation', 'transit', 'shuttle'],
  transit: ['transportation', 'commute', 'shuttle'],
};

function tokensFrom(text: string): string[] {
  const base = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
  return [...new Set(base.flatMap((token) => [token, ...(RELATED[token] ?? [])]))];
}

export function matchSimilarLessons(input: {
  domain: HappinessDomainId;
  factor?: string | null;
  summary?: string;
  lessons: PublicOutcomeLesson[];
  excludeReviewId?: string;
}): PublicOutcomeLesson[] {
  const hay = tokensFrom([input.domain, input.factor ?? '', input.summary ?? ''].join(' '));
  return input.lessons
    .filter((lesson) => lesson.reviewId !== input.excludeReviewId)
    .filter((lesson) => {
      const titleTokens = tokensFrom([lesson.domain, lesson.factorCategory ?? '', lesson.title, lesson.problem, lesson.intervention].join(' '));
      return hay.some((token) => titleTokens.includes(token)) || lesson.domain === input.domain;
    })
    .slice(0, 5);
}

export function toPublicLessonDraft(review: HumanOutcomeReview, comparison: HumanOutcomeComparison): Omit<PublicOutcomeLesson, 'id' | 'reviewId'> {
  return {
    solutionRecordId: review.solutionRecordId,
    domain: review.targetDomain,
    factorCategory: review.targetFactor,
    interventionCategory: review.targetFactor,
    title: review.interventionTitle,
    problem: review.objective,
    intervention: review.interventionTitle,
    operationalOutcome: review.operationalOutcome?.trim() || 'Operational result was recorded separately from human-outcome evidence.',
    humanOutcome: `${OUTCOME_COPY.statuses[comparison.status]}. ${comparison.followupSummaries[comparison.followupSummaries.length - 1] ?? OUTCOME_COPY.direction[comparison.direction]}`,
    evidenceStrength: comparison.evidenceStrength,
    status: comparison.status,
    limitations: `${OUTCOME_COPY.noCausation} Evidence: ${OUTCOME_COPY.strength[comparison.evidenceStrength]}.`,
    replicationNotes: review.uncertaintyNote,
  };
}

export function publicLessonSearchText(lesson: PublicOutcomeLesson): string {
  return [
    lesson.title,
    lesson.problem,
    lesson.intervention,
    lesson.operationalOutcome,
    lesson.humanOutcome,
    OUTCOME_COPY.strength[lesson.evidenceStrength],
    OUTCOME_COPY.statuses[lesson.status],
    lesson.limitations,
  ].join('\n');
}
