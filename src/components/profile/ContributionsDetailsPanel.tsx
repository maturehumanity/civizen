import { useMemo } from 'react';
import { CheckCircle2, Loader2, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CONTRIBUTION_EVENT_TYPE_LABELS,
  buildContributionLedgerItems,
  type ContributionEvent,
  type ContributionEventType,
} from '@/lib/civizen-contributions';
import { formatScoreValue, type CategoryScoreInput } from '@/lib/civizen-score';
import { cn } from '@/lib/utils';

type ContributionsDetailsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: ContributionEvent[];
  categoryInput: CategoryScoreInput | null;
  syncing?: boolean;
};

function FactorChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{Math.round(value)}</span>
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

export function ContributionsDetailsPanel({
  open,
  onOpenChange,
  events,
  categoryInput,
  syncing = false,
}: ContributionsDetailsPanelProps) {
  const { t } = useLanguage();

  const uniqueTypes = useMemo(
    () => new Set(events.map((e) => e.eventType)).size,
    [events],
  );
  const verifiedCount = categoryInput?.verifiedSourceCount ?? events.filter((e) => e.verified).length;
  const ledgerItems = useMemo(() => buildContributionLedgerItems(events), [events]);

  if (!open) return null;

  return (
    <Card
      id="contributions-ledger-panel"
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.contributionsDetails.title')}
        </span>
      </div>
      <div className="absolute right-3 top-0 z-10 flex -translate-y-1/2 items-center gap-1.5">
        {syncing ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft"
            title={t('profile.contributionsDetails.syncing')}
            aria-label={t('profile.contributionsDetails.syncing')}
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
        <p className="text-sm text-muted-foreground">{t('profile.contributionsDetails.intro')}</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.contributionsDetails.score')}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatScoreValue(categoryInput?.score)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.contributionsDetails.events')}
            </p>
            <p className="text-sm font-semibold text-foreground">{events.length}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.contributionsDetails.verified')}
            </p>
            <p className="text-sm font-semibold text-foreground">{verifiedCount}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('profile.contributionsDetails.typesCount')}
            </p>
            <p className="text-sm font-semibold text-foreground">{uniqueTypes}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{t('profile.contributionsDetails.empty')}</p>
          </div>
        ) : (
          <ul
            className="max-h-72 space-y-2 overflow-y-auto pr-1"
            aria-label={t('profile.contributionsDetails.ledger')}
          >
            {ledgerItems.map((item) => {
              if (item.kind === 'group') {
                return (
                  <li
                    key={`group:${item.eventType}`}
                    className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {t('profile.contributionsDetails.groupTitle', {
                            name: typeLabel(item.eventType, t),
                            count: item.count,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('profile.contributionsDetails.groupVerified', {
                            count: item.verifiedCount,
                          })}
                          {item.latestAt ? ` · ${formatEventDate(item.latestAt)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <FactorChip
                        label={t('profile.contributionsDetails.capacity')}
                        value={item.capacityEstimate}
                      />
                      <FactorChip
                        label={t('profile.contributionsDetails.impact')}
                        value={item.impactEstimate}
                      />
                      <FactorChip
                        label={t('profile.contributionsDetails.collaboration')}
                        value={item.collaborationEstimate}
                      />
                    </div>
                  </li>
                );
              }

              const event = item.event;
              return (
                <li
                  key={`${event.sourceTable}:${event.sourceId}`}
                  className={cn('rounded-lg border border-border/60 bg-card/60 px-3 py-2.5')}
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
                        title={t('profile.contributionsDetails.verifiedBadge')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {t('profile.contributionsDetails.verifiedBadge')}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <FactorChip
                      label={t('profile.contributionsDetails.capacity')}
                      value={event.capacityEstimate}
                    />
                    <FactorChip
                      label={t('profile.contributionsDetails.impact')}
                      value={event.impactEstimate}
                    />
                    <FactorChip
                      label={t('profile.contributionsDetails.collaboration')}
                      value={event.collaborationEstimate}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
