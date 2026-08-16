import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { OUTCOME_COPY, listHumanOutcomeReviews, listPublicOutcomeLessons } from '@/lib/happiness/outcomes';
import type { HumanOutcomeReview, PublicOutcomeLesson } from '@/lib/happiness/outcomes/types';

export function HumanOutcomeLinks(props: {
  challengeId?: string | null;
  projectId?: string | null;
  candidateId?: string | null;
  governanceSolutionId?: string | null;
  scopeId?: string | null;
  domain?: string | null;
  factor?: string | null;
}) {
  const [reviews, setReviews] = useState<HumanOutcomeReview[]>([]);
  const [lessons, setLessons] = useState<PublicOutcomeLesson[]>([]);

  useEffect(() => {
    setReviews([]);
    void listHumanOutcomeReviews({
      candidateId: props.candidateId ?? undefined,
      challengeId: props.challengeId ?? undefined,
      projectId: props.projectId ?? undefined,
      governanceSolutionId: props.governanceSolutionId ?? undefined,
    }).then(setReviews).catch(() => setReviews([]));
    void listPublicOutcomeLessons().then(setLessons).catch(() => setLessons([]));
  }, [props.candidateId, props.challengeId, props.projectId, props.governanceSolutionId]);

  const review = reviews[0];
  const lesson = review ? lessons.find((row) => row.reviewId === review.id) : null;
  const startQuery = new URLSearchParams();
  if (props.scopeId) startQuery.set('scope', props.scopeId);
  if (props.candidateId) startQuery.set('candidate', props.candidateId);
  if (props.challengeId) startQuery.set('challenge', props.challengeId);
  if (props.projectId) startQuery.set('project', props.projectId);
  if (props.governanceSolutionId) startQuery.set('governance', props.governanceSolutionId);
  if (props.domain) startQuery.set('domain', props.domain);
  if (props.factor) startQuery.set('factor', props.factor);

  return (
    <div className="space-y-1" data-human-outcome-links="">
      {review ? (
        <>
          <p className="text-sm">{OUTCOME_COPY.monitoring}: {OUTCOME_COPY.statuses[review.status]}</p>
          <Link className="text-sm text-primary" to={`/wellbeing-insights/outcome?review=${review.id}`}>{OUTCOME_COPY.reviewOutcome}</Link>
        </>
      ) : props.scopeId ? (
        <Link className="text-sm text-primary" to={`/wellbeing-insights/outcome?${startQuery.toString()}`}>{OUTCOME_COPY.startReview}</Link>
      ) : null}
      {lesson ? (
        <div className="space-y-1" data-human-outcome-public="">
          <p className="text-sm font-medium">{OUTCOME_COPY.learnTitle}</p>
          <p className="text-sm text-muted-foreground">{OUTCOME_COPY.whatHappened}: {lesson.operationalOutcome}</p>
          <p className="text-sm text-muted-foreground">{OUTCOME_COPY.humanEvidence}: {lesson.humanOutcome}</p>
          <p className="text-xs text-muted-foreground">{lesson.limitations}</p>
        </div>
      ) : null}
    </div>
  );
}
