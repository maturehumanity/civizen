import { CheckCircle2, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { previewContributionRecords, summarizeContributionFunctions, summarizeContributionTypes } from '@/lib/civizen-contribution-ledger';
import { contributionTimeSpanDays, improvementGuidance } from '@/lib/civizen-contribution-observation';
import type { ContributionEvent } from '@/lib/civizen-contributions';
import { formatScoreValue, type CategoryScoreInput } from '@/lib/civizen-score';

type ContributionsDetailsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: ContributionEvent[];
  categoryInput: CategoryScoreInput | null;
  syncing?: boolean;
  ledgerHref: string;
};

function formatEventDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(t));
  } catch {
    return '';
  }
}

export function ContributionsDetailsPanel({
  open,
  onOpenChange,
  events,
  categoryInput,
  syncing = false,
  ledgerHref,
}: ContributionsDetailsPanelProps) {
  const { t } = useLanguage();
  const verifiedCount = categoryInput?.verifiedSourceCount ?? events.filter((item) => item.verified).length;
  const otherCount = Math.max(0, events.length - verifiedCount);
  const preview = useMemo(() => previewContributionRecords(events, 5), [events]);
  const types = useMemo(() => summarizeContributionTypes(events), [events]);
  const functions = useMemo(() => summarizeContributionFunctions(events), [events]);
  const tips = improvementGuidance({
    independentValidation: (categoryInput?.independentEvidenceCount ?? 0) > 0,
    realizedImpactKnown: preview.some((item) => item.observation.realizedImpact !== 'unknown'),
    timeSpanDays: contributionTimeSpanDays(events),
    verifiedCount,
  });

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
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
          </span>
        ) : null}
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft"
          aria-label={t('common.close')}
          onClick={() => onOpenChange(false)}
        >
          <span className="text-sm leading-none text-muted-foreground">×</span>
        </button>
      </div>
      <CardContent className="space-y-4 px-4 pb-4 pt-5">
        <p className="text-sm text-muted-foreground">{t('profile.contributionsDetails.reputationIntro')}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('profile.contributionsDetails.score')}</p>
            <p className="text-sm font-semibold">{formatScoreValue(categoryInput?.score)}<span className="ml-1 text-[10px] font-normal text-muted-foreground">/100</span></p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('profile.contributionsDetails.verified')}</p>
            <p className="text-sm font-semibold">{verifiedCount}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('profile.contributionsDetails.otherActivity')}</p>
            <p className="text-sm font-semibold">{otherCount}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('profile.contributionsDetails.confidence')}</p>
            <p className="text-sm font-semibold capitalize">{categoryInput?.confidence ?? t('profile.contributionsDetails.unknown')}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('profile.contributionsLedger.confidenceShort')}</p>
        <p className="text-xs text-muted-foreground">
          {t('profile.contributionsDetails.typesCount')}: {types.map((item) => `${t(`profile.contributionsDetails.types.${item.eventType}`)} ${item.count}`).join(' · ') || '0'}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('profile.contributionsLedger.functionsCount')}: {functions.map((item) => `${t(`profile.contributionsLedger.functions.${item.contributionFunction}`)} ${item.count}`).join(' · ') || '0'}
        </p>
        {events.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{t('profile.contributionsDetails.empty')}</p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label={t('profile.contributionsDetails.preview')}>
            {preview.map((item) => (
              <li key={`${item.event.sourceTable}:${item.event.sourceId}`} className="rounded-lg border border-border/60 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`profile.contributionsLedger.functions.${item.observation.contributionFunction}`)}
                      {item.event.occurredAt ? ` · ${formatEventDate(item.event.occurredAt)}` : ''}
                    </p>
                  </div>
                  {item.event.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {t('profile.contributionsDetails.verifiedBadge')}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {tips.length > 0 ? (
          <p className="text-xs text-muted-foreground">{t('profile.contributionsDetails.guidance', { tips: tips.slice(0, 2).join('; ') })}</p>
        ) : null}
        <Link
          to={ledgerHref}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('profile.contributionsDetails.viewLedger')}
        </Link>
      </CardContent>
    </Card>
  );
}
