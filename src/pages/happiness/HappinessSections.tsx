import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DOMAIN_LABEL_KEYS, DOMAIN_SHORT_KEYS } from '@/lib/happiness/domains';
import { overallLevelPhraseKey, recentWellbeingPhraseKey } from '@/lib/happiness/levels';
import type { ActionOutcomeRating, HappinessDomainId, HappinessLevel, HappinessPublicView } from '@/lib/happiness/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function trendCopy(t: Translate, view: { trend: { direction: string; weeks?: number; domainNote?: HappinessDomainId } }) {
  if (view.trend.direction === 'improving' && view.trend.weeks) {
    return t('happiness.trendImprovingWeeks', { weeks: view.trend.weeks });
  }
  if (view.trend.domainNote === 'work_fulfillment' && view.trend.direction === 'declining') {
    return t('happiness.workDeclinedRecently');
  }
  return t(`happiness.trend.${view.trend.direction}`);
}

export function Overview({
  t,
  locale,
  view,
  checkinsEnabled,
  onCheckIn,
  onReview,
  onImprove,
  onFollowUp,
}: {
  t: Translate;
  locale: string;
  view?: HappinessPublicView;
  checkinsEnabled: boolean;
  onCheckIn: () => void;
  onReview: () => void;
  onImprove: () => void;
  onFollowUp: (actionId: string, helped: ActionOutcomeRating, comment?: string | null) => Promise<void>;
}) {
  const level = view?.overallLevel ?? null;
  const empty = !level && !view?.latestCheckIn;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70 p-5" data-build-key="happinessCurrentLevel" data-build-label="Current happiness level">
        {empty ? (
          <>
            <p className="text-lg font-semibold text-foreground">{t('happiness.emptyTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('happiness.emptyBody')}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold leading-snug text-foreground">
              {level ? t(overallLevelPhraseKey(level)) : t('happiness.notEnoughYet')}
            </p>
            {view?.trend.direction && view.trend.direction !== 'unknown' ? (
              <p className="mt-2 text-sm text-muted-foreground">{trendCopy(t, view)}</p>
            ) : null}
            {view?.trend.previousLevel && level ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t('happiness.levelMoved', {
                  from: t(`happiness.levels.${view.trend.previousLevel}`),
                  to: t(`happiness.levels.${level}`),
                })}
              </p>
            ) : null}
          </>
        )}
      </Card>

      {view?.attentionDomains.length || view?.strongestDomains.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="rounded-2xl border-border/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('happiness.goingWell')}</p>
            <p className="mt-2 text-sm text-foreground">
              {view.strongestDomains.length
                ? view.strongestDomains.map((domain) => t(DOMAIN_SHORT_KEYS[domain])).join(' · ')
                : t('happiness.noneYet')}
            </p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('happiness.needsAttention')}</p>
            <p className="mt-2 text-sm text-foreground">
              {view.attentionDomains.length
                ? view.attentionDomains.map((domain, index) => (
                    <span key={domain}>
                      {index > 0 ? ' · ' : null}
                      <Link
                        to={`/happiness/improve?domain=${domain}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {t(DOMAIN_SHORT_KEYS[domain])}
                      </Link>
                    </span>
                  ))
                : t('happiness.noneYet')}
            </p>
          </Card>
        </div>
      ) : null}

      {view?.latestCheckIn ? (
        <p className="text-sm text-muted-foreground">
          {t('happiness.latestCheckIn', {
            feeling: t(`happiness.feelings.${view.latestCheckIn.feeling}`),
            when: formatWhen(view.latestCheckIn.createdAt, locale),
          })}
        </p>
      ) : null}

      {view?.pendingFollowUp ? (
        <FollowUpCard t={t} title={view.pendingFollowUp.title} actionId={view.pendingFollowUp.id} onSave={onFollowUp} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={onCheckIn} disabled={!checkinsEnabled} className="w-full sm:w-auto">
          {t('happiness.checkIn')}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onReview}>
            {t('happiness.reviewWellbeing')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onImprove}>
            {t('happiness.improveArea')}
          </Button>
        </div>
        {!checkinsEnabled ? <p className="text-xs text-muted-foreground">{t('happiness.checkinsDisabledHint')}</p> : null}
      </div>
    </div>
  );
}

export function LifeAreas({
  t,
  domainLevels,
}: {
  t: Translate;
  domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>>;
}) {
  const domains = Object.keys(DOMAIN_LABEL_KEYS) as HappinessDomainId[];
  return (
    <Card className="divide-y divide-border/60 rounded-2xl border-border/70">
      {domains.map((domain) => {
        const level = domainLevels[domain];
        return (
          <div key={domain} className="flex items-baseline justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              {level === 'struggling' || level === 'unsettled' ? (
                <Link
                  to={domain === 'work_fulfillment' ? '/happiness/work' : `/happiness/improve?domain=${domain}`}
                  className="text-sm text-foreground underline-offset-4 hover:underline"
                >
                  {t(DOMAIN_LABEL_KEYS[domain])}
                </Link>
              ) : (
                <p className="text-sm text-foreground">{t(DOMAIN_LABEL_KEYS[domain])}</p>
              )}
              {domain === 'work_fulfillment' ? (
                <Link to="/happiness/work" className="mt-1 block text-xs text-muted-foreground underline-offset-4 hover:underline">
                  {t('happiness.openWorkFulfillment')}
                </Link>
              ) : level === 'struggling' || level === 'unsettled' ? (
                <Link
                  to={`/happiness/improve?domain=${domain}`}
                  className="mt-1 block text-xs text-primary underline-offset-4 hover:underline"
                >
                  {t('happiness.plans.improveThisArea')}
                </Link>
              ) : null}
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">
              {level ? t(`happiness.levels.${level}`) : t('happiness.notYet')}
            </p>
          </div>
        );
      })}
    </Card>
  );
}

export function CheckInHistory({
  t,
  locale,
  checkIns,
  enabled,
  onCheckIn,
}: {
  t: (key: string) => string;
  locale: string;
  checkIns: { id: string; feeling: string; affectingMost: string | null; createdAt: string }[];
  enabled: boolean;
  onCheckIn: () => void;
}) {
  return (
    <div className="space-y-3">
      {enabled ? (
        <Button type="button" size="sm" onClick={onCheckIn}>
          {t('happiness.checkIn')}
        </Button>
      ) : null}
      {checkIns.length === 0 ? (
        <Card className="rounded-2xl border-border/60 p-6 text-center text-sm text-muted-foreground">{t('happiness.noCheckIns')}</Card>
      ) : (
        <ul className="space-y-2">
          {checkIns.map((checkIn) => (
            <li key={checkIn.id}>
              <Card className="rounded-2xl border-border/70 px-4 py-3">
                <p className="text-sm text-foreground">{t(`happiness.feelings.${checkIn.feeling}`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatWhen(checkIn.createdAt, locale)}
                  {checkIn.affectingMost ? ` · ${t(`happiness.affecting.${checkIn.affectingMost}`)}` : ''}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Trends({
  t,
  view,
}: {
  t: Translate;
  view?: {
    overallLevel: HappinessLevel | null;
    trend: { direction: string; weeks?: number; previousLevel?: HappinessLevel };
    observationCount: number;
  };
}) {
  if (!view?.overallLevel) {
    return <Card className="rounded-2xl border-border/60 p-6 text-sm text-muted-foreground">{t('happiness.trendsEmpty')}</Card>;
  }
  return (
    <Card className="space-y-2 rounded-2xl border-border/70 p-5">
      <p className="text-sm text-foreground">{t(recentWellbeingPhraseKey(view.overallLevel))}</p>
      <p className="text-sm text-muted-foreground">{t(`happiness.trend.${view.trend.direction}`)}</p>
      {view.trend.previousLevel ? (
        <p className="text-sm text-muted-foreground">
          {t('happiness.levelMoved', {
            from: t(`happiness.levels.${view.trend.previousLevel}`),
            to: t(`happiness.levels.${view.overallLevel}`),
          })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t('happiness.modelWorkingNote')}</p>
    </Card>
  );
}

export function ImprovementHistory({
  t,
  locale,
  actions,
  outcomes,
  onImprove,
  onFollowUp,
}: {
  t: Translate;
  locale: string;
  actions: { id: string; title: string; why: string; createdAt: string; dismissed: boolean }[];
  outcomes: { actionId: string; helped: string }[];
  onImprove: () => void;
  onFollowUp: (actionId: string, helped: ActionOutcomeRating, comment?: string | null) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <Button type="button" size="sm" onClick={onImprove}>
        {t('happiness.improveArea')}
      </Button>
      {actions.length === 0 ? (
        <Card className="rounded-2xl border-border/60 p-6 text-center text-sm text-muted-foreground">{t('happiness.noActions')}</Card>
      ) : (
        <ul className="space-y-2">
          {actions.map((action) => {
            const outcome = outcomes.find((row) => row.actionId === action.id);
            return (
              <li key={action.id}>
                <Card className="rounded-2xl border-border/70 p-4">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatWhen(action.createdAt, locale)}</p>
                  {outcome ? (
                    <p className="mt-2 text-sm text-muted-foreground">{t(`happiness.helped.${outcome.helped}`)}</p>
                  ) : action.dismissed ? (
                    <p className="mt-2 text-sm text-muted-foreground">{t('happiness.dismissed')}</p>
                  ) : (
                    <div className="mt-3">
                      <FollowUpCard t={t} title={action.title} actionId={action.id} onSave={onFollowUp} embedded />
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FollowUpCard({
  t,
  title,
  actionId,
  onSave,
  embedded = false,
}: {
  t: (key: string) => string;
  title: string;
  actionId: string;
  onSave: (actionId: string, helped: ActionOutcomeRating, comment?: string | null) => Promise<void>;
  embedded?: boolean;
}) {
  const [helped, setHelped] = useState<ActionOutcomeRating | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const ratings: ActionOutcomeRating[] = ['not_at_all', 'a_little', 'somewhat', 'a_lot'];

  return (
    <Card className={embedded ? 'space-y-3 border-0 p-0 shadow-none' : 'space-y-3 rounded-2xl border-border/70 p-4'}>
      <p className="text-sm font-medium text-foreground">{t('happiness.didThisHelp')}</p>
      {embedded ? null : <p className="text-sm text-muted-foreground">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {ratings.map((rating) => (
          <Button
            key={rating}
            type="button"
            size="sm"
            variant={helped === rating ? 'default' : 'outline'}
            onClick={() => setHelped(rating)}
          >
            {t(`happiness.helped.${rating}`)}
          </Button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t('happiness.optionalComment')}
        rows={2}
      />
      <Button
        type="button"
        disabled={!helped || busy}
        onClick={async () => {
          if (!helped) return;
          setBusy(true);
          try {
            await onSave(actionId, helped, comment);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t('happiness.saveFollowUp')}
      </Button>
    </Card>
  );
}
