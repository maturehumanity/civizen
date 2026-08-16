import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { HappinessDomainId } from '@/lib/happiness/types';
import {
  OUTCOME_COPY,
  addReviewEvidence,
  addReviewEvent,
  addReviewFactor,
  compareHumanOutcomeEvidence,
  createHumanOutcomeReview,
  getHumanOutcomeReview,
  interpretationHasCausalClaim,
  listHumanOutcomeReviews,
  listPublicOutcomeLessons,
  listReviewEvidence,
  listReviewEvents,
  listReviewFactors,
  listScopeSnapshotRecords,
  matchSimilarLessons,
  publishPublicOutcomeLesson,
  toCiviOutcomeContext,
  toPublicLessonDraft,
  updateHumanOutcomeReview,
} from '@/lib/happiness/outcomes';
import type { HumanOutcomeComparison, HumanOutcomeEvent, HumanOutcomeFactor, HumanOutcomeReview, PublicOutcomeLesson, SnapshotRecord } from '@/lib/happiness/outcomes/types';

export default function HumanOutcomeReviewPage() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [review, setReview] = useState<HumanOutcomeReview | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [evidenceIds, setEvidenceIds] = useState<{ snapshotId: string; role: string; periodOrder: number }[]>([]);
  const [factors, setFactors] = useState<HumanOutcomeFactor[]>([]);
  const [events, setEvents] = useState<HumanOutcomeEvent[]>([]);
  const [lessons, setLessons] = useState<PublicOutcomeLesson[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [factorNote, setFactorNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reviewId = params.get('review') ?? '';
  const candidateId = params.get('candidate');
  const challengeId = params.get('challenge');
  const projectId = params.get('project');
  const governanceId = params.get('governance');

  useEffect(() => {
    void (async () => {
      try {
        setReady(false);
        const existing = reviewId
          ? await getHumanOutcomeReview(reviewId)
          : (await listHumanOutcomeReviews({
              candidateId: candidateId ?? undefined,
              challengeId: challengeId ?? undefined,
              projectId: projectId ?? undefined,
              governanceSolutionId: governanceId ?? undefined,
            }))[0] ?? null;
        setReview(existing);
        if (existing && !reviewId) {
          setParams((current) => {
            const copy = new URLSearchParams(current);
            copy.set('review', existing.id);
            return copy;
          }, { replace: true });
        }
        if (!existing) {
          setReady(true);
          return;
        }
        const [snaps, ev, fac, evts, pub] = await Promise.all([
          listScopeSnapshotRecords(existing.scopeId),
          listReviewEvidence(existing.id),
          listReviewFactors(existing.id),
          listReviewEvents(existing.id),
          listPublicOutcomeLessons(),
        ]);
        setSnapshots(snaps);
        setEvidenceIds(ev);
        setFactors(fac);
        setEvents(evts);
        setLessons(pub);
        setInterpretation(existing.interpretation ?? '');
        setReady(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not load this review.');
        setReady(true);
      }
    })();
  }, [reviewId, candidateId, challengeId, projectId, governanceId, setParams]);

  const byId = useMemo(() => new Map(snapshots.map((row) => [row.id, row])), [snapshots]);
  const baseline = snapshots.find((row) => evidenceIds.some((item) => item.snapshotId === row.id && item.role === 'baseline')) ?? null;
  const followups = evidenceIds.filter((item) => item.role === 'followup').map((item) => byId.get(item.snapshotId)).filter(Boolean) as SnapshotRecord[];
  const helpfulness = snapshots.find((row) => evidenceIds.some((item) => item.snapshotId === row.id && item.role === 'helpfulness')) ?? null;
  const comparison: HumanOutcomeComparison | null = review
    ? compareHumanOutcomeEvidence({
        baseline,
        followups,
        helpfulness,
        overlappingInterventions: review.overlappingInterventions || factors.some((row) => row.kind === 'overlapping_intervention'),
        compositionChanged: review.compositionCaveat,
        evaluationPlanned: review.evaluationPlanned,
        researchReference: review.researchReference,
      })
    : null;
  const similar = review ? matchSimilarLessons({ domain: review.targetDomain, factor: review.targetFactor, lessons, excludeReviewId: review.id }) : [];
  const civi = review && comparison ? toCiviOutcomeContext({ review, comparison, factors, similar }) : null;
  const availableFollowups = snapshots.filter(
    (row) =>
      row.topic === 'domain_state' &&
      row.result.kind === 'insight' &&
      'domain' in row.result &&
      row.result.domain === review.targetDomain &&
      !evidenceIds.some((item) => item.snapshotId === row.id),
  );

  const run = async (work: () => Promise<void>) => {
    if (!profile?.id || !review) return;
    setBusy(true);
    setError(null);
    try {
      await work();
      const next = await getHumanOutcomeReview(review.id);
      const [ev, fac, evts, pub] = await Promise.all([
        listReviewEvidence(review.id),
        listReviewFactors(review.id),
        listReviewEvents(review.id),
        listPublicOutcomeLessons(),
      ]);
      setReview(next);
      setEvidenceIds(ev);
      setFactors(fac);
      setEvents(evts);
      setLessons(pub);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-3 pb-24 pt-2 sm:px-4" data-human-outcome-review="">
        <AppPageHeader title={OUTCOME_COPY.title} fallbackPath="/wellbeing-insights" />
        <p className="text-sm text-muted-foreground">{OUTCOME_COPY.subtitle}</p>
        <p className="text-xs text-muted-foreground">{OUTCOME_COPY.privacyHint}</p>
        {!review && params.get('scope') && profile?.id ? (
          <StartCard
            scopeId={params.get('scope')!}
            profileId={profile.id}
            domain={(params.get('domain') as HappinessDomainId) || 'time_life_balance'}
            factor={params.get('factor')}
            candidateId={params.get('candidate')}
            challengeId={params.get('challenge')}
            projectId={params.get('project')}
            governanceId={params.get('governance')}
            onCreated={(id) => {
              const copy = new URLSearchParams(params);
              copy.set('review', id);
              setParams(copy);
            }}
          />
        ) : null}
        {review && comparison && ready ? (
          <>
            <Card className="space-y-2 rounded-2xl border-border/70 p-4">
              <h2 className="text-sm font-medium">{OUTCOME_COPY.operationalTitle}</h2>
              <p className="text-sm">{review.interventionTitle}</p>
              <p className="text-sm text-muted-foreground">{review.operationalOutcome || review.objective}</p>
              {review.challengeId ? <Link className="text-sm text-primary" to={`/contribute/challenges/${review.challengeId}`}>Open Challenge</Link> : null}
              {review.governanceSolutionId ? <Link className="text-sm text-primary" to={`/governance/solutions/${review.governanceSolutionId}`}>Open Governance Solution</Link> : null}
            </Card>
            <Card className="space-y-2 rounded-2xl border-border/70 p-4" data-human-outcome-evidence="">
              <h2 className="text-sm font-medium">{OUTCOME_COPY.humanTitle}</h2>
              <p className="text-sm font-medium">{OUTCOME_COPY.statuses[comparison.status]} · {OUTCOME_COPY.strength[comparison.evidenceStrength]}</p>
              <p className="text-sm">{baseline ? baseline.result.summary : OUTCOME_COPY.noBaseline}</p>
              {followups.map((row) => <p key={row.id} className="text-sm text-muted-foreground">{OUTCOME_COPY.timeline.followup}: {row.result.summary}</p>)}
              {comparison.warnings.includes('followup_suppressed') ? <p className="text-sm">{OUTCOME_COPY.insufficient}</p> : null}
              <p className="text-xs text-muted-foreground">{OUTCOME_COPY.noCausation}</p>
              {comparison.warnings.includes('overlapping_interventions') ? <p className="text-xs text-muted-foreground">{OUTCOME_COPY.overlapping}</p> : null}
              {comparison.helpfulnessSummary ? <p className="text-xs text-muted-foreground">{comparison.helpfulnessSummary} {OUTCOME_COPY.helpfulnessCategory}</p> : null}
            </Card>
            <ol className="space-y-1 text-sm text-muted-foreground" data-human-outcome-timeline="">
              <li>{OUTCOME_COPY.timeline.baseline}: {baseline ? 'Concern recorded in a qualifying period' : OUTCOME_COPY.noBaseline}</li>
              {events.filter((row) => row.eventType === 'launched').map((row) => <li key={row.id}>{OUTCOME_COPY.timeline.launched}</li>)}
              {followups.map((row, index) => <li key={row.id}>{OUTCOME_COPY.timeline.followup} {index + 1}: {OUTCOME_COPY.statuses[comparison.status]}</li>)}
            </ol>
            <Card className="space-y-2 rounded-2xl border-border/70 p-4">
              <h2 className="text-sm font-medium">{OUTCOME_COPY.interpretationTitle}</h2>
              <OutlinedField label="Interpretation" htmlFor="outcome-interpretation">
                <Textarea id="outcome-interpretation" value={interpretation} onChange={(event) => setInterpretation(event.target.value)} rows={4} />
              </OutlinedField>
              <p className="text-xs text-muted-foreground">{OUTCOME_COPY.interpretationHint}</p>
              <Button size="sm" disabled={busy} onClick={() => void run(async () => {
                if (interpretationHasCausalClaim(interpretation)) throw new Error(OUTCOME_COPY.causalBlocked);
                await updateHumanOutcomeReview(review.id, { interpretation, status: comparison.status, evidence_strength: comparison.evidenceStrength, uncertainty_note: OUTCOME_COPY.noCausation }, profile!.id);
              })}>Save interpretation</Button>
            </Card>
            <Card className="space-y-2 rounded-2xl border-border/70 p-4">
              <h2 className="text-sm font-medium">{OUTCOME_COPY.uncertaintyTitle}</h2>
              {factors.map((row) => <p key={row.id} className="text-sm text-muted-foreground">{OUTCOME_COPY.factors[row.kind]}: {row.note}</p>)}
              <OutlinedField label="Possible other explanation" htmlFor="outcome-factor">
                <Textarea id="outcome-factor" value={factorNote} onChange={(event) => setFactorNote(event.target.value)} rows={2} />
              </OutlinedField>
              <Button size="sm" variant="outline" disabled={busy || factorNote.trim().length < 3} onClick={() => void run(async () => {
                await addReviewFactor({ reviewId: review.id, kind: /overlap|another|two /i.test(factorNote) ? 'overlapping_intervention' : 'external_event', note: factorNote, actorId: profile!.id });
                if (/overlap|two /i.test(factorNote)) await updateHumanOutcomeReview(review.id, { overlapping_interventions: true }, profile!.id);
                setFactorNote('');
              })}>{OUTCOME_COPY.recordFactor}</Button>
            </Card>
            <Card className="space-y-2 rounded-2xl border-border/70 p-4" data-human-outcome-learn="">
              <h2 className="text-sm font-medium">{OUTCOME_COPY.learnTitle}</h2>
              <p className="text-xs text-muted-foreground">{OUTCOME_COPY.draftOnly}</p>
              {similar.length ? <p className="text-sm font-medium">{OUTCOME_COPY.similarTitle}</p> : null}
              {similar.map((row) => (
                <p key={row.id} className="text-sm text-muted-foreground">{row.title}: {OUTCOME_COPY.statuses[row.status]} · {OUTCOME_COPY.strength[row.evidenceStrength]}. {OUTCOME_COPY.similarCaveat}</p>
              ))}
              <div className="flex flex-wrap gap-2">
                {availableFollowups[0] ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => {
                    await addReviewEvidence({ reviewId: review.id, snapshotId: availableFollowups[0].id, role: 'followup', periodOrder: followups.length + 1, actorId: profile!.id });
                  })}>{OUTCOME_COPY.addFollowup}</Button>
                ) : null}
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => {
                  await addReviewEvent({ reviewId: review.id, eventType: 'checkpoint', actorId: profile!.id, note: review.nextReviewWindow ?? 'quarter' });
                })}>{OUTCOME_COPY.continueMonitoring}</Button>
                <Button size="sm" disabled={busy || review.publishedPublic} onClick={() => void run(async () => {
                  await publishPublicOutcomeLesson({ reviewId: review.id, actorId: profile!.id, lesson: toPublicLessonDraft(review, comparison) });
                })}>{OUTCOME_COPY.publishLesson}</Button>
                <Button size="sm" variant="outline" disabled={busy || Boolean(review.closedAt)} onClick={() => void run(async () => {
                  await updateHumanOutcomeReview(review.id, { closed_at: new Date().toISOString(), closed_reason: comparison.status === 'insufficient_evidence' ? 'insufficient_evidence' : 'sufficient_learning' }, profile!.id);
                  await addReviewEvent({ reviewId: review.id, eventType: 'closed', actorId: profile!.id });
                })}>{OUTCOME_COPY.closeReview}</Button>
              </div>
              {review.publishedPublic ? <p className="text-sm">{OUTCOME_COPY.published}</p> : null}
              <p className="text-xs text-muted-foreground">{OUTCOME_COPY.notPenalty}</p>
            </Card>
          </>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {civi ? <p className="sr-only" data-civi-outcome-context="">{civi.summary} {civi.operationalOutcome} {civi.evidenceStrength} {civi.uncertainties.join(' ')}</p> : null}
      </div>
    </AppLayout>
  );
}

function StartCard(props: {
  scopeId: string;
  profileId: string;
  domain: HappinessDomainId;
  factor: string | null;
  candidateId: string | null;
  challengeId: string | null;
  projectId: string | null;
  governanceId: string | null;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Card className="space-y-3 rounded-2xl border-border/70 p-4">
      <p className="text-sm">{OUTCOME_COPY.startReview}</p>
      <OutlinedField label="Intervention" htmlFor="outcome-title">
        <Textarea id="outcome-title" value={title} onChange={(event) => setTitle(event.target.value)} rows={2} />
      </OutlinedField>
      <OutlinedField label="Human-outcome objective" htmlFor="outcome-objective">
        <Textarea id="outcome-objective" value={objective} onChange={(event) => setObjective(event.target.value)} rows={3} />
      </OutlinedField>
      <Button disabled={busy || !title.trim() || !objective.trim()} onClick={() => {
        setBusy(true);
        void createHumanOutcomeReview({
          scopeId: props.scopeId,
          createdBy: props.profileId,
          targetDomain: props.domain,
          targetFactor: props.factor,
          objective,
          interventionTitle: title,
          candidateId: props.candidateId,
          challengeId: props.challengeId,
          projectId: props.projectId,
          governanceSolutionId: props.governanceId,
        }).then(async (id) => {
          await addReviewEvent({ reviewId: id, eventType: 'launched', actorId: props.profileId });
          props.onCreated(id);
        }).finally(() => setBusy(false));
      }}>{OUTCOME_COPY.startReview}</Button>
    </Card>
  );
}
