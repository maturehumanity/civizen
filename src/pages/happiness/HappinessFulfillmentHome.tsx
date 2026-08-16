import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DOMAIN_LABEL_KEYS } from '@/lib/happiness/domains';
import { listFulfillmentPlans, listRecommendationFeedback } from '@/lib/happiness/fulfillment/api';
import { interventionByKey } from '@/lib/happiness/fulfillment/library';
import { qualitativeStateFromSignals, qualitativeStateLabelKey } from '@/lib/happiness/fulfillment/progress';
import type { FulfillmentPlan } from '@/lib/happiness/fulfillment/types';
import type { ActionOutcomeRating, HappinessAction, HappinessActionStatus, HappinessDomainId } from '@/lib/happiness/types';

type Translate = (key: string) => string;

export function HappinessFulfillmentHome({
  t,
  profileId,
  actions,
  outcomes,
  attentionDomains,
  onStart,
}: {
  t: Translate;
  profileId: string;
  actions: HappinessAction[];
  outcomes: { actionId: string; helped: ActionOutcomeRating }[];
  attentionDomains: HappinessDomainId[];
  onStart: () => void;
}) {
  const [plans, setPlans] = useState<FulfillmentPlan[]>([]);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  useEffect(() => {
    void listFulfillmentPlans(profileId).then(setPlans).catch(() => setPlans([]));
    void listRecommendationFeedback(profileId)
      .then((rows) => setSavedKeys(rows.filter((row) => row.feedback === 'saved_later').map((row) => row.interventionKey)))
      .catch(() => setSavedKeys([]));
  }, [profileId, actions.length]);
  const active = plans.filter((plan) => plan.status === 'exploring' || plan.status === 'active');
  const paused = plans.filter((plan) => plan.status === 'paused');
  const history = plans.filter((plan) => plan.status === 'completed' || plan.status === 'stopped').slice(0, 6);
  const plannedDomains = new Set([...active, ...paused].map((plan) => plan.domainKey));
  const suggested = attentionDomains.filter((domain) => domain !== 'work_fulfillment' && !plannedDomains.has(domain)).slice(0, 3);
  const saved = savedKeys.map((key) => interventionByKey(key)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const recentHelped = actions
    .map((action) => ({ action, outcome: outcomes.find((row) => row.actionId === action.id) }))
    .filter((row) => row.outcome)
    .slice(0, 4);

  const renderPlan = (plan: FulfillmentPlan) => {
    const linked = actions.filter((action) => action.planId === plan.id);
    const helped = linked
      .map((action) => outcomes.find((row) => row.actionId === action.id)?.helped)
      .filter((value): value is ActionOutcomeRating => Boolean(value));
    const state = qualitativeStateFromSignals({
      planStatus: plan.status,
      actionStatuses: linked.map((action) => action.status as HappinessActionStatus),
      helped,
    });
    return (
      <li key={plan.id}>
        <Link to={`/happiness/improve?plan=${plan.id}`}>
          <Card className="rounded-2xl border-border/70 p-4">
            <p className="text-sm font-medium text-foreground">{t(DOMAIN_LABEL_KEYS[plan.domainKey])}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(qualitativeStateLabelKey(state))}</p>
            {plan.desiredOutcome ? <p className="mt-2 text-sm text-foreground">“{plan.desiredOutcome}”</p> : null}
            {linked[0] ? <p className="mt-2 text-xs text-muted-foreground">{linked[0].title}</p> : null}
          </Card>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{t('happiness.plans.activeHeading')}</p>
        <Button type="button" size="sm" onClick={onStart}>
          {t('happiness.improveArea')}
        </Button>
      </div>
      {active.length >= 3 ? <p className="text-sm text-muted-foreground">{t('happiness.plans.tooManyActive')}</p> : null}
      {active.length === 0 ? (
        <Card className="rounded-2xl border-border/60 p-5 text-sm text-muted-foreground">{t('happiness.plans.noActive')}</Card>
      ) : (
        <ul className="space-y-2">{active.map(renderPlan)}</ul>
      )}

      {paused.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('happiness.plans.pausedHeading')}</p>
          <p className="text-xs text-muted-foreground">{t('happiness.plans.statusHint.paused')}</p>
          <ul className="space-y-2">{paused.map(renderPlan)}</ul>
        </div>
      ) : null}

      {saved.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('happiness.plans.savedLaterHeading')}</p>
          {saved.map((item) => (
            <Link key={item.key} to={`/happiness/improve?domain=${item.domains[0]}`} className="block">
              <Card className="rounded-2xl border-border/70 px-4 py-3 text-sm text-foreground">{t(item.titleKey)}</Card>
            </Link>
          ))}
        </div>
      ) : null}

      {suggested.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('happiness.plans.suggestedHeading')}</p>
          {suggested.map((domain) => (
            <Link key={domain} to={`/happiness/improve?domain=${domain}`} className="block">
              <Card className="rounded-2xl border-border/70 px-4 py-3 text-sm text-foreground">{t(DOMAIN_LABEL_KEYS[domain])}</Card>
            </Link>
          ))}
          {attentionDomains.includes('work_fulfillment') && !plannedDomains.has('work_fulfillment') ? (
            <Link to="/happiness/work" className="block">
              <Card className="rounded-2xl border-border/70 px-4 py-3 text-sm text-foreground">{t('happiness.openWorkFulfillment')}</Card>
            </Link>
          ) : null}
        </div>
      ) : null}

      {recentHelped.length || history.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('happiness.plans.recentHeading')}</p>
          {history.map(renderPlan)}
          {recentHelped.map(({ action, outcome }) => (
            <Card key={action.id} className="rounded-2xl border-border/70 p-4">
              <p className="text-sm text-foreground">{action.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('happiness.plans.helpedLabel')}: {t(`happiness.helped.${outcome!.helped}`)}
              </p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
