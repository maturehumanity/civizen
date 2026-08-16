import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { recordActionOutcome, updateHappinessActionStatus } from '@/lib/happiness/api';
import { DOMAIN_LABEL_KEYS } from '@/lib/happiness/domains';
import {
  loadDomainLevelHistory,
  loadFulfillmentPlanBundle,
  savePlanOutcome,
  savePlanSupport,
  updateFulfillmentPlan,
  updateFulfillmentPlanStatus,
} from '@/lib/happiness/fulfillment/api';
import { buildFulfillmentCiviBrief } from '@/lib/happiness/fulfillment/civi-context';
import { factorLabel, isCommunitySystemPath, supportOptionsForDomain } from '@/lib/happiness/fulfillment/library';
import { domainImprovedSincePlan, nextStepAfterOutcome, qualitativeStateFromSignals, qualitativeStateLabelKey } from '@/lib/happiness/fulfillment/progress';
import type { FulfillmentPlanBundle, FulfillmentPlanStatus, PlanReminderPref } from '@/lib/happiness/fulfillment/types';
import { integrationTargetForRecommendationPath } from '@/lib/happiness/integrations';
import { ACTION_OUTCOME_RATINGS, type ActionOutcomeRating, type HappinessAction, type HappinessLevel } from '@/lib/happiness/types';

import { HappinessPlanStatus } from './HappinessPlanStatus';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function HappinessFulfillmentPlan({
  t,
  profileId,
  planId,
  actions,
  outcomes,
  onReload,
}: {
  t: Translate;
  profileId: string;
  planId: string;
  actions: HappinessAction[];
  outcomes: { actionId: string; helped: ActionOutcomeRating; comment: string | null }[];
  onReload: () => Promise<void>;
}) {
  const [bundle, setBundle] = useState<FulfillmentPlanBundle | null>(null);
  const [helped, setHelped] = useState<ActionOutcomeRating | null>(null);
  const [comment, setComment] = useState('');
  const [desired, setDesired] = useState('');
  const [busy, setBusy] = useState(false);
  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<{ computedAt: string; domainLevels: Partial<Record<string, HappinessLevel>> }[]>([]);

  const refresh = async () => {
    const next = await loadFulfillmentPlanBundle(profileId, planId);
    setBundle(next);
    setDesired(next?.plan.desiredOutcome ?? '');
  };

  useEffect(() => {
    void loadFulfillmentPlanBundle(profileId, planId)
      .then((next) => {
        setBundle(next);
        setDesired(next?.plan.desiredOutcome ?? '');
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : t('happiness.saveFailed')));
    void loadDomainLevelHistory(profileId).then(setSnapshots).catch(() => setSnapshots([]));
  }, [planId, profileId, t]);

  const planActions = actions.filter((action) => action.planId === planId);
  const state = useMemo(() => {
    if (!bundle) return 'exploring' as const;
    return qualitativeStateFromSignals({
      planStatus: bundle.plan.status,
      actionStatuses: planActions.map((action) => action.status),
      helped: planActions
        .map((action) => outcomes.find((row) => row.actionId === action.id)?.helped)
        .filter((value): value is ActionOutcomeRating => Boolean(value)),
    });
  }, [bundle, outcomes, planActions]);

  if (!bundle) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  const { plan, factors } = bundle;
  const confirmed = factors.filter((row) => row.certaintyType === 'member_confirmed');
  const observed = factors.filter((row) => row.certaintyType === 'observed_pattern');
  const hypotheses = factors.filter((row) => row.certaintyType === 'hypothesis');
  const awaiting = planActions.find((action) => action.status === 'completed' && !outcomes.some((row) => row.actionId === action.id));
  const brief = buildFulfillmentCiviBrief({
    plan,
    factors,
    actions: planActions,
    helpedNotes: outcomes.filter((row) => row.helped === 'a_lot' || row.helped === 'somewhat').map((row) => row.comment ?? row.helped),
    domainLabel: t(DOMAIN_LABEL_KEYS[plan.domainKey]),
  });
  const improved = domainImprovedSincePlan({
    domain: plan.domainKey,
    startedAt: plan.createdAt,
    snapshots: snapshots.map((row) => ({ computedAt: row.computedAt, domainLevels: row.domainLevels })),
  });

  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      await onReload();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold text-foreground">{t(DOMAIN_LABEL_KEYS[plan.domainKey])}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(qualitativeStateLabelKey(state))}</p>
        {improved ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('happiness.plans.domainImprovedSince', { area: t(DOMAIN_LABEL_KEYS[plan.domainKey]) })}
          </p>
        ) : null}
      </div>

      <section className="space-y-2">
        <OutlinedField label={t('happiness.plans.wantToImprove')}>
          <Textarea value={desired} onChange={(event) => setDesired(event.target.value)} placeholder={t('happiness.plans.betterPlaceholder')} rows={2} />
        </OutlinedField>
        {desired !== (plan.desiredOutcome ?? '') ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => updateFulfillmentPlan(profileId, plan.id, { desiredOutcome: desired }))}>
            {t('happiness.plans.saveOutcome')}
          </Button>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('happiness.plans.whatMayAffect')}</p>
        {confirmed.map((row) => (
          <p key={row.id} className="text-sm text-foreground">
            {t('happiness.plans.certainty.member_confirmed')} {factorLabel(row.factorKey, t)}
          </p>
        ))}
        {observed.map((row) => (
          <p key={row.id} className="text-sm text-muted-foreground">
            {t('happiness.plans.certainty.observed_pattern')} {factorLabel(row.factorKey, t)}
          </p>
        ))}
        {hypotheses.map((row) => (
          <p key={row.id} className="text-sm text-muted-foreground">
            {t('happiness.plans.certainty.hypothesis')} {factorLabel(row.factorKey, t)}
          </p>
        ))}
        {!factors.length ? <p className="text-sm text-muted-foreground">{t('happiness.plans.noFactorsYet')}</p> : null}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('happiness.plans.whatImTrying')}</p>
        {planActions.map((action) => {
          const target = integrationTargetForRecommendationPath(action.relatedPath);
          return (
            <Card key={action.id} className="space-y-2 rounded-2xl border-border/70 p-4">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <p className="text-xs text-muted-foreground">{t(`happiness.work.actionStatus.${action.status}`)}</p>
              {action.status === 'planned' ? (
                <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => updateHappinessActionStatus(profileId, action.id, 'in_progress'))}>
                  {t('happiness.work.startAction')}
                </Button>
              ) : null}
              {action.status === 'in_progress' ? (
                <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => updateHappinessActionStatus(profileId, action.id, 'completed'))}>
                  {t('happiness.work.completeAction')}
                </Button>
              ) : null}
              {target ? (
                <Link to={target.path} className="block text-sm text-primary underline-offset-4 hover:underline">
                  {t(`happiness.integration.${target.kind}`)}
                </Link>
              ) : null}
              {isCommunitySystemPath(action.relatedPath) ? <p className="text-xs text-muted-foreground">{t('happiness.plans.communityCaution')}</p> : null}
              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setWhyOpen(whyOpen === action.id ? null : action.id)}>
                {t('happiness.plans.whySeeingThis')}
              </button>
              {whyOpen === action.id ? <p className="text-sm text-muted-foreground">{action.why}</p> : null}
            </Card>
          );
        })}
      </section>

      {awaiting ? (
        <Card className="space-y-3 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{t('happiness.didThisHelp')}</p>
          <div className="flex flex-wrap gap-2">
            {ACTION_OUTCOME_RATINGS.map((rating) => (
              <Button key={rating} type="button" size="sm" variant={helped === rating ? 'default' : 'outline'} onClick={() => setHelped(rating)}>
                {t(`happiness.helped.${rating}`)}
              </Button>
            ))}
          </div>
          <OutlinedField label={t('happiness.plans.whatChanged')}>
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('happiness.plans.whatChanged')} rows={2} />
          </OutlinedField>
          <Button
            type="button"
            disabled={!helped || busy}
            onClick={() =>
              void run(async () => {
                if (!helped) return;
                await recordActionOutcome(profileId, awaiting.id, helped, comment);
                await savePlanOutcome(profileId, plan.id, {
                  qualitativeState: helped === 'not_at_all' ? 'needs_another_approach' : helped === 'a_lot' || helped === 'somewhat' ? 'seeing_improvement' : 'trying',
                  summaryNote: comment,
                  helped,
                });
                if (helped !== 'not_at_all' && bundle.plan.status === 'exploring') {
                  await updateFulfillmentPlanStatus(profileId, plan.id, 'active');
                }
                toast.success(t('happiness.followUpSaved'));
                setHelped(null);
                setComment('');
              })
            }
          >
            {t('happiness.saveFollowUp')}
          </Button>
        </Card>
      ) : null}

      <section className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('happiness.plans.supportHeading')}</p>
        <p className="text-xs text-muted-foreground">{t('happiness.plans.supportHint')}</p>
        {supportOptionsForDomain(plan.domainKey).map((option) => (
          <Card key={option.key} className="space-y-2 rounded-2xl border-border/70 p-4">
            <p className="text-sm font-medium text-foreground">{t(option.titleKey)}</p>
            <p className="text-sm text-muted-foreground">{t(option.descriptionKey)}</p>
            {isCommunitySystemPath(option.path) ? <p className="text-xs text-muted-foreground">{t('happiness.plans.communityCaution')}</p> : null}
            {option.path ? (
              <Link
                to={option.path}
                className="text-sm text-primary underline-offset-4 hover:underline"
                onClick={() => void savePlanSupport(profileId, plan.id, { supportKey: option.key, supportType: option.type, path: option.path })}
              >
                {t('happiness.plans.openSupport')}
              </Link>
            ) : null}
          </Card>
        ))}
      </section>

      <Card className="space-y-2 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.plans.askCivi')}</p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground" data-civi-plan-member="">
          {brief.memberText}
        </p>
        <span className="hidden" data-civi-plan-brief="">
          {brief.text}
        </span>
        <Link to="/messaging" className="text-sm text-primary underline-offset-4 hover:underline">
          {t('happiness.plans.openCivi')}
        </Link>
      </Card>

      <HappinessPlanStatus
        t={t}
        status={plan.status}
        reminderPref={plan.reminderPref}
        followUpAt={plan.followUpAt}
        busy={busy}
        onStatus={(next: FulfillmentPlanStatus) => void run(() => updateFulfillmentPlanStatus(profileId, plan.id, next))}
        onReminder={(pref: PlanReminderPref, at) => void run(() => updateFulfillmentPlan(profileId, plan.id, { reminderPref: pref, followUpAt: at }))}
      />
    </div>
  );
}
