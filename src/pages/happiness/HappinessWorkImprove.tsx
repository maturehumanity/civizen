import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ACTION_OUTCOME_RATINGS } from '@/lib/happiness/types';
import { marketJobsPrefillFromShareable } from '@/lib/happiness/fulfillment/jobs-bridge';
import { listOpenOpportunities } from '@/lib/opportunities-api';
import { diagnoseWorkSources, occupationMayFitWhileTasksNeedWork } from '@/lib/work-fulfillment/diagnosis';
import { suggestAdjacentRoles } from '@/lib/work-fulfillment/explorations';
import { deriveWorkJoyPatterns } from '@/lib/work-fulfillment/joy-patterns';
import { WORK_INTERVENTION_LADDER } from '@/lib/work-fulfillment/ladder';
import { fitOpportunity } from '@/lib/work-fulfillment/opportunity-fit';
import {
  recordWorkImprovementAction,
  saveRecommendationFeedback,
  saveWorkExploration,
  saveWorkTransitionPath,
  saveWorkTrialLink,
} from '@/lib/work-fulfillment/persist';
import { suggestWorkImprovements } from '@/lib/work-fulfillment/recommendations';
import { joyEntriesForContext, latestAssessmentForContext, primaryWorkContext } from '@/lib/work-fulfillment/scope';
import type { WorkJoyFeeling } from '@/lib/work-fulfillment/types';
import type { WorkFulfillmentLoadResult } from '@/lib/work-fulfillment/workspace';

import { HappinessChoiceButton } from './HappinessShell';
import { WorkTrackedActions } from './HappinessWorkTrackedActions';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function WorkImproveSection({
  t,
  profileId,
  work,
  onSaved,
}: {
  t: Translate;
  profileId: string;
  work: WorkFulfillmentLoadResult | null;
  onSaved: () => void;
}) {
  const primary = primaryWorkContext(work?.contexts ?? []);
  const assessment = latestAssessmentForContext(work?.assessments ?? [], primary?.id);
  const joyEntries = joyEntriesForContext(work?.joyEntries ?? [], primary?.id);
  const hypotheses = diagnoseWorkSources({ assessment, joyEntries });
  const hiddenIds = (work?.feedback ?? []).filter((row) => row.feedback === 'not_relevant').map((row) => row.recommendationId);
  const suggestions = suggestWorkImprovements({ hypotheses, hiddenIds });
  const patterns = deriveWorkJoyPatterns(joyEntries);
  const roles = suggestAdjacentRoles({ patterns, profile: work?.profile ?? null });
  const [desiredChange, setDesiredChange] = useState('Spend more time mentoring and less time on repetitive reporting.');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [helped, setHelped] = useState<(typeof ACTION_OUTCOME_RATINGS)[number] | null>(null);
  const [nowFeeling, setNowFeeling] = useState<WorkJoyFeeling | null>(null);
  const [opps, setOpps] = useState<Awaited<ReturnType<typeof listOpenOpportunities>>>([]);

  useEffect(() => {
    void listOpenOpportunities()
      .then(setOpps)
      .catch(() => setOpps([]));
  }, []);

  const fits = useMemo(() => {
    const shareable = work?.shareable;
    if (!shareable) return [];
    return opps.slice(0, 4).map((opportunity) => ({
      opportunity,
      fit: fitOpportunity(opportunity, shareable),
    }));
  }, [opps, work?.shareable]);

  const take = async (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion || busy) return;
    setBusy(true);
    try {
      await recordWorkImprovementAction(profileId, {
        ladderStep: suggestion.ladderStep,
        area: suggestion.area,
        desiredChange,
        title: t(suggestion.titleKey),
        why: t(suggestion.whyKey),
        relatedPath: suggestion.relatedPath,
      });
      toast.success(t('happiness.actionSaved'));
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const hide = async (id: string) => {
    await saveRecommendationFeedback(profileId, id, 'not_relevant');
    toast.message(t('happiness.dismissedLocal'));
    onSaved();
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-2 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.hypothesesTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('happiness.work.hypothesesHint')}</p>
        {hypotheses.map((item) => (
          <p key={item.id} className="text-sm text-foreground">
            {t(`happiness.work.hypotheses.${item.id}`)}
          </p>
        ))}
        {occupationMayFitWhileTasksNeedWork(hypotheses) ? (
          <p className="text-sm leading-relaxed text-foreground">{t('happiness.work.occupationMayFit')}</p>
        ) : null}
      </Card>

      <p className="text-sm font-medium text-foreground">{t('happiness.work.improveFirst')}</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {WORK_INTERVENTION_LADDER.slice(0, 5).map((step) => (
          <li key={step.id}>{t(step.labelKey)}</li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{t('happiness.workNoAutoCareer')}</p>

      <label className="block space-y-1 text-sm">
        <span className="text-foreground">{t('happiness.work.wantToChange')}</span>
        <Textarea value={desiredChange} onChange={(event) => setDesiredChange(event.target.value)} rows={2} />
      </label>

      {suggestions.map((suggestion, index) => (
        <Card key={suggestion.id} className="space-y-3 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{t(suggestion.titleKey)}</p>
          <p className="text-sm text-muted-foreground">{t(suggestion.whyKey)}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void take(index)}>
              {t('happiness.work.recordImprove')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void hide(suggestion.id)}>
              {t('happiness.notRelevant')}
            </Button>
          </div>
        </Card>
      ))}

      <WorkTrackedActions
        t={t}
        profileId={profileId}
        work={work}
        busy={busy}
        setBusy={setBusy}
        helped={helped}
        setHelped={setHelped}
        nowFeeling={nowFeeling}
        setNowFeeling={setNowFeeling}
        onSaved={onSaved}
      />

      <p className="text-sm font-medium text-foreground">{t('happiness.work.exploreTitle')}</p>
      {roles.map((role) => (
        <Card key={role.id} className="space-y-2 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{role.title}</p>
          <p className="text-xs text-muted-foreground">{t(`happiness.work.alignment.${role.alignment}`)}</p>
          <p className="text-xs font-medium text-foreground">{t('happiness.work.whyMayFit')}</p>
          {role.why.map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
          {role.explore.length ? (
            <>
              <p className="text-xs font-medium text-foreground">{t('happiness.work.thingsToExplore')}</p>
              {role.explore.map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
            </>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              to={role.contributePath}
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => {
                void saveWorkExploration(profileId, {
                  title: role.title,
                  templateId: role.id,
                  whyMayFit: role.why,
                  thingsToExplore: role.explore,
                  alignment: role.alignment,
                  occupationNote: null,
                }).then((saved) => saveWorkTrialLink(profileId, { explorationId: saved.id, contributePath: role.contributePath }));
              }}
            >
              {t('happiness.work.tryThisWork')}
            </Link>
            <Link to={role.studyPath} className="text-muted-foreground underline-offset-4 hover:underline">
              {t('happiness.work.openStudy')}
            </Link>
            <Link to={marketJobsPrefillFromShareable(work?.shareable).path} className="text-muted-foreground underline-offset-4 hover:underline">
              {t('happiness.plans.openJobs')}
            </Link>
          </div>
        </Card>
      ))}

      <p className="text-sm font-medium text-foreground">{t('happiness.work.openOpportunities')}</p>
      <p className="text-xs text-muted-foreground">{t('happiness.plans.jobVsContributionFit')}</p>
      {fits.map(({ opportunity, fit }) => (
        <Card key={opportunity.id} className="space-y-2 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{opportunity.title}</p>
          <p className="text-xs text-muted-foreground">{t(`happiness.work.alignment.${fit.alignment}`)}</p>
          {fit.why.map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
          <Link to={`/contribute/professional/${opportunity.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
            {t('happiness.work.tryThisWork')}
          </Link>
        </Card>
      ))}

      <Card className="space-y-2 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.plans.openJobs')}</p>
        <p className="text-sm text-muted-foreground">{t('happiness.plans.workJobsHint')}</p>
        <Link to={marketJobsPrefillFromShareable(work?.shareable).path} className="text-sm text-primary underline-offset-4 hover:underline">
          {t('happiness.plans.openJobs')}
        </Link>
      </Card>

      <Card className="space-y-3 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.transitionTitle')}</p>
        <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder={t('happiness.work.transitionTarget')} />
        <Button
          type="button"
          variant="outline"
          disabled={!target.trim() || busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                await saveWorkTransitionPath(profileId, {
                  target,
                  why: t('happiness.work.transitionWhy'),
                  alreadyHave: null,
                  need: null,
                  testPath: '/contribute',
                  studyPath: '/study',
                  opportunityPath: '/contribute/professional',
                  nextStep: t('happiness.work.tryThisWork'),
                  status: 'exploring',
                });
                toast.success(t('happiness.actionSaved'));
                onSaved();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {t('happiness.work.saveTransition')}
        </Button>
        {(work?.transitions ?? []).map((path) => (
          <p key={path.id} className="text-sm text-muted-foreground">
            {path.target}
          </p>
        ))}
      </Card>
    </div>
  );
}
