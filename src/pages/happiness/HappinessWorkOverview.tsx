import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { HappinessLevel, HappinessTrend } from '@/lib/happiness/types';
import { partitionAssessmentDimensions } from '@/lib/work-fulfillment/assessment';
import { diagnoseWorkSources, occupationMayFitWhileTasksNeedWork, suggestedLadderStep } from '@/lib/work-fulfillment/diagnosis';
import { WORK_INTERVENTION_LADDER } from '@/lib/work-fulfillment/ladder';
import { joyEntriesForContext, latestAssessmentForContext, primaryWorkContext } from '@/lib/work-fulfillment/scope';
import type { WorkFulfillmentLoadResult } from '@/lib/work-fulfillment/workspace';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function WorkOverviewSection({
  t,
  happiness,
  work,
  onGo,
}: {
  t: Translate;
  happiness: { workLevel: HappinessLevel | null; trendDirection: HappinessTrend | null } | null;
  work: WorkFulfillmentLoadResult | null;
  onGo: (section: string) => void;
}) {
  const level = happiness?.workLevel ?? null;
  const trendDirection = happiness?.trendDirection;
  const primary = primaryWorkContext(work?.contexts ?? []);
  const latest = latestAssessmentForContext(work?.assessments ?? [], primary?.id);
  const joy = joyEntriesForContext(work?.joyEntries ?? [], primary?.id);
  const { goingWell, needsAttention } = partitionAssessmentDimensions(latest);
  const hypotheses = diagnoseWorkSources({ assessment: latest, joyEntries: joy });
  const nextStep = suggestedLadderStep(hypotheses);
  const nextLabel = WORK_INTERVENTION_LADDER.find((step) => step.id === nextStep);
  const latestJoy = joy[0] ?? null;
  const latestFollowUp = work?.followUps[0] ?? null;

  return (
    <div className="space-y-4">
      <Card className="space-y-2 rounded-2xl border-border/70 p-5" data-build-key="workFulfillmentOverview">
        <p className="text-sm text-muted-foreground">{t('happiness.work.currentLevel')}</p>
        <p className="text-lg font-semibold text-foreground">
          {level ? t(`happiness.levels.${level}`) : t('happiness.notYet')}
        </p>
        {primary ? (
          <p className="text-sm text-muted-foreground">
            {primary.roleTitle}
            {` · ${t(`happiness.work.types.${primary.workType}`)}`}
            {primary.isPrimary ? ` · ${t('happiness.work.primaryShort')}` : ''}
          </p>
        ) : null}
        {trendDirection && trendDirection !== 'unknown' ? (
          <p className="text-sm text-muted-foreground">{t(`happiness.trend.${trendDirection}`)}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{t('happiness.work.noNumericScore')}</p>
      </Card>

      {goingWell.length || needsAttention.length ? (
        <div className="grid gap-3">
          {goingWell.length ? (
            <Card className="space-y-2 rounded-2xl border-border/70 p-4">
              <p className="text-sm font-medium text-foreground">{t('happiness.work.goingWell')}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {goingWell.map((dimension) => (
                  <li key={dimension}>{t(`happiness.work.dimensions.${dimension}`)}</li>
                ))}
              </ul>
            </Card>
          ) : null}
          {needsAttention.length ? (
            <Card className="space-y-2 rounded-2xl border-border/70 p-4">
              <p className="text-sm font-medium text-foreground">{t('happiness.work.needsAttention')}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {needsAttention.map((dimension) => (
                  <li key={dimension}>{t(`happiness.work.dimensions.${dimension}`)}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('happiness.workPreview')}</p>
      )}

      {occupationMayFitWhileTasksNeedWork(hypotheses) ? (
        <p className="text-sm leading-relaxed text-foreground">{t('happiness.work.occupationMayFit')}</p>
      ) : null}

      {latestJoy ? (
        <p className="text-sm text-muted-foreground">
          {t(`happiness.work.feelings.${latestJoy.feeling}`)}
          {latestJoy.activity ? ` · ${latestJoy.activity}` : ''}
        </p>
      ) : null}

      {latestFollowUp?.helped ? (
        <p className="text-sm text-muted-foreground">
          {t('happiness.work.outcomeRecorded', { rating: t(`happiness.helped.${latestFollowUp.helped}`) })}
        </p>
      ) : null}

      <Card className="space-y-3 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.nextLook')}</p>
        <p className="text-sm text-muted-foreground">{nextLabel ? t(nextLabel.labelKey) : t('happiness.work.ladder.understand')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => onGo('current')}>
            {t('happiness.work.sectionNames.current')}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onGo('joy')}>
            {t('happiness.work.sectionNames.joy')}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onGo('improve')}>
            {t('happiness.work.improveFirst')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
