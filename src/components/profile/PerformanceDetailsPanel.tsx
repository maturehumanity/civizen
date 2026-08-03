import { useMemo, useState } from 'react';
import { BadgeCheck, Loader2, Star } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CONTRIBUTION_EVENT_TYPE_LABELS,
  type ContributionEventType,
} from '@/lib/civizen-contributions';
import {
  canRatePerformance,
  upsertPerformanceRating,
  type PerformanceActivity,
} from '@/lib/civizen-performance';
import { formatScoreValue, type CategoryScoreInput } from '@/lib/civizen-score';
import { cn } from '@/lib/utils';

type PerformanceDetailsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: PerformanceActivity[];
  categoryInput: CategoryScoreInput | null;
  subjectProfileId: string;
  viewerProfileId?: string | null;
  /** When true, show peer rating controls (other people's profiles only). */
  allowRating?: boolean;
  syncing?: boolean;
  onRated?: () => void;
};

const DISPLAY_LIMIT = 60;

function RatingChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent?: 'system' | 'peer';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]',
        accent === 'system' && 'bg-primary/10 text-primary',
        accent === 'peer' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
        !accent && 'bg-muted/60 text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <span className="font-medium text-foreground">{formatScoreValue(value)}</span>
    </span>
  );
}

function formatEventDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(t));
  } catch {
    return '';
  }
}

function typeLabel(eventType: ContributionEventType, t: (key: string) => string): string {
  const key = `profile.contributionsDetails.types.${eventType}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return CONTRIBUTION_EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function PeerRateControl({
  activity,
  subjectProfileId,
  viewerProfileId,
  onRated,
  t,
}: {
  activity: PerformanceActivity;
  subjectProfileId: string;
  viewerProfileId: string;
  onRated?: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [draft, setDraft] = useState(
    activity.myRating != null ? String(Math.round(activity.myRating)) : '',
  );
  const [saving, setSaving] = useState(false);
  const eventId = activity.event.id;

  if (!eventId) return null;

  const save = async () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0 || n > 100) return;
    setSaving(true);
    try {
      const result = await upsertPerformanceRating({
        contributionEventId: eventId,
        subjectProfileId,
        raterProfileId: viewerProfileId,
        score: n,
      });
      if (result.ok) onRated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`perf-rate-${eventId}`}>
        {t('profile.performanceDetails.yourRating')}
      </label>
      <input
        id={`perf-rate-${eventId}`}
        type="number"
        min={0}
        max={100}
        step={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-7 w-16 rounded-md border border-border/80 bg-background px-1.5 text-xs tabular-nums"
        disabled={saving}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 px-2 text-xs"
        disabled={saving || draft === ''}
        onClick={() => void save()}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <Star className="h-3 w-3" aria-hidden />
        )}
        {activity.myRating != null
          ? t('profile.performanceDetails.updateRating')
          : t('profile.performanceDetails.rate')}
      </Button>
    </div>
  );
}

export function PerformanceDetailsPanel({
  open,
  onOpenChange,
  activities,
  categoryInput,
  subjectProfileId,
  viewerProfileId = null,
  allowRating = false,
  syncing = false,
  onRated,
}: PerformanceDetailsPanelProps) {
  const { t } = useLanguage();

  const canRate =
    allowRating &&
    canRatePerformance({ raterProfileId: viewerProfileId, subjectProfileId });

  const systemAvg =
    activities.length > 0
      ? activities.reduce((sum, a) => sum + a.systemRating, 0) / activities.length
      : null;
  const peerRated = activities.filter((a) => a.peerCount > 0);
  const peerAvg =
    peerRated.length > 0
      ? peerRated.reduce((sum, a) => sum + (a.peerAverage ?? 0), 0) / peerRated.length
      : null;
  const peerCount = activities.reduce((sum, a) => sum + a.peerCount, 0);

  const visible = useMemo(() => activities.slice(0, DISPLAY_LIMIT), [activities]);
  const hiddenCount = Math.max(0, activities.length - visible.length);

  if (!open) return null;

  return (
    <Card
      id="performance-ledger-panel"
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.performanceDetails.title')}
        </span>
      </div>
      <div className="absolute right-3 top-0 z-10 flex -translate-y-1/2 items-center gap-1.5">
        {syncing ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft"
            title={t('profile.performanceDetails.syncing')}
            aria-label={t('profile.performanceDetails.syncing')}
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
          </span>
        ) : null}
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('common.close')}
          onClick={() => onOpenChange(false)}
        >
          <span className="text-sm leading-none text-muted-foreground" aria-hidden>
            ×
          </span>
        </button>
      </div>

      <CardContent className="space-y-4 px-4 pb-4 pt-5">
        <p className="text-sm text-muted-foreground">{t('profile.performanceDetails.intro')}</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.performanceDetails.score')}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatScoreValue(categoryInput?.score)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.performanceDetails.activities')}
            </p>
            <p className="text-sm font-semibold text-foreground">{activities.length}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.performanceDetails.systemAvg')}
            </p>
            <p className="text-sm font-semibold text-foreground">{formatScoreValue(systemAvg)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.performanceDetails.peerAvg')}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatScoreValue(peerAvg)}
              {peerCount > 0 ? (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ({peerCount})
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{t('profile.performanceDetails.empty')}</p>
          </div>
        ) : (
          <ul
            className="max-h-72 space-y-2 overflow-y-auto pr-1"
            aria-label={t('profile.performanceDetails.ledger')}
          >
            {visible.map((activity) => {
              const event = activity.event;
              const key = event.id ?? `${event.sourceTable}:${event.sourceId}`;
              return (
                <li
                  key={key}
                  className="rounded-lg border border-border/60 bg-card/60 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel(event.eventType, t)}
                        {event.occurredAt ? ` · ${formatEventDate(event.occurredAt)}` : ''}
                      </p>
                    </div>
                    {event.verified ? (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-primary"
                        title={t('profile.performanceDetails.verifiedBadge')}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        {t('profile.performanceDetails.verifiedBadge')}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <RatingChip
                      label={t('profile.performanceDetails.system')}
                      value={activity.systemRating}
                      accent="system"
                    />
                    <RatingChip
                      label={t('profile.performanceDetails.peer')}
                      value={activity.peerAverage}
                      accent="peer"
                    />
                    {activity.peerCount > 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        {t('profile.performanceDetails.peerCount', { count: activity.peerCount })}
                      </span>
                    ) : null}
                  </div>
                  {canRate && viewerProfileId && event.id ? (
                    <PeerRateControl
                      activity={activity}
                      subjectProfileId={subjectProfileId}
                      viewerProfileId={viewerProfileId}
                      onRated={onRated}
                      t={t}
                    />
                  ) : null}
                </li>
              );
            })}
            {hiddenCount > 0 ? (
              <li className="px-1 py-2 text-center text-xs text-muted-foreground">
                {t('profile.performanceDetails.moreActivities', { count: hiddenCount })}
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
