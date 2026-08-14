import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ListFilter } from 'lucide-react';

import { AgreementCreateMenu } from '@/components/agreements/AgreementCreateMenu';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listAccessibleAgreements, type AgreementListItem } from '@/lib/agreements-api';
import { isMissingAgreementsBackend } from '@/lib/agreements-backend';
import {
  AGREEMENT_LIFECYCLE_FILTERS,
  AGREEMENT_PRIMARY_VIEWS,
  agreementMatchesLifecycleFilter,
  agreementWorkspaceCardAction,
  isAgreementLifecycleFilter,
  isAgreementPrimaryView,
  otherPartyNames,
  type AgreementLifecycleFilter,
  type AgreementPrimaryView,
  type AgreementWorkspaceCardAction,
} from '@/lib/agreements-model';

const VIEW_LABELS: Record<AgreementPrimaryView, string> = {
  needs_action: 'agreements.views.needsAction',
  active: 'agreements.views.active',
  all: 'agreements.views.all',
};

const LIFECYCLE_LABELS: Record<AgreementLifecycleFilter, string> = {
  draft: 'agreements.buckets.drafts',
  in_review: 'agreements.buckets.inReview',
  awaiting_signatures: 'agreements.buckets.awaitingSignatures',
  completed: 'agreements.status.completed',
  terminated: 'agreements.status.terminated',
  closed: 'agreements.filters.closed',
};

function parseView(value: string | null): AgreementPrimaryView {
  if (isAgreementPrimaryView(value)) return value;
  if (value === 'draft' || value === 'in_review' || value === 'awaiting_signatures' || value === 'completed') {
    return 'all';
  }
  return 'needs_action';
}

function parseLifecycle(searchParams: URLSearchParams): AgreementLifecycleFilter | null {
  const explicit = searchParams.get('lifecycle');
  if (isAgreementLifecycleFilter(explicit)) return explicit;
  const bucket = searchParams.get('bucket');
  if (isAgreementLifecycleFilter(bucket)) return bucket;
  if (bucket === 'draft' || bucket === 'in_review' || bucket === 'awaiting_signatures' || bucket === 'completed') {
    return bucket;
  }
  return null;
}

function statusLine(row: AgreementListItem, action: AgreementWorkspaceCardAction, t: (key: string) => string) {
  if (action !== 'open') return t(`agreements.cardStatus.${action}`);
  return t(`agreements.status.${row.status}`);
}

function AgreementRow({
  row,
  selfNames,
  t,
}: {
  row: AgreementListItem;
  selfNames: Array<string | null | undefined>;
  t: (key: string) => string;
}) {
  const action = agreementWorkspaceCardAction({ status: row.status, needsAction: row.needsAction });
  const parties = otherPartyNames(row.parties, selfNames).join(' · ');
  const actionLabel = t(`agreements.cardAction.${action}`);
  const showCta = action !== 'open';

  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-sm transition-colors hover:bg-muted/20">
      <Link to={`/agreements/${row.id}`} className="block min-w-0 space-y-1">
        <p className="font-medium text-foreground">{row.title}</p>
        {parties ? <p className="text-sm text-muted-foreground">{parties}</p> : null}
        {row.marketListingId ? (
          <p className="text-xs text-muted-foreground">{t('agreements.contextMarket')}</p>
        ) : null}
        <p className="text-sm text-foreground/80">{statusLine(row, action, t)}</p>
      </Link>
      {showCta ? (
        <Button type="button" size="sm" className="mt-3" asChild>
          <Link to={`/agreements/${row.id}`}>{actionLabel}</Link>
        </Button>
      ) : null}
    </Card>
  );
}

export default function Agreements() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<AgreementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendMissing, setBackendMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const view = parseView(searchParams.get('bucket'));
  const lifecycle = view === 'all' ? parseLifecycle(searchParams) : null;
  const hasRecords = rows.length > 0;
  const selfNames = [profile?.full_name, profile?.username];

  const load = useCallback(async () => {
    if (!profile?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await listAccessibleAgreements());
      setBackendMissing(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      if (isMissingAgreementsBackend({ message })) {
        setBackendMissing(true);
      } else {
        setError(message || tRef.current('agreements.loadError'));
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {
      needs_action: 0,
      active: 0,
      all: rows.length,
    };
    for (const filter of AGREEMENT_LIFECYCLE_FILTERS) next[filter] = 0;
    for (const row of rows) {
      if (row.bucket === 'needs_action' || row.needsAction) next.needs_action += 1;
      if (row.bucket === 'active' && !row.needsAction) next.active += 1;
      for (const filter of AGREEMENT_LIFECYCLE_FILTERS) {
        if (agreementMatchesLifecycleFilter(row.status, filter)) next[filter] += 1;
      }
    }
    return next;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (view === 'needs_action' && !(row.bucket === 'needs_action' || row.needsAction)) return false;
      if (view === 'active' && (row.bucket !== 'active' || row.needsAction)) return false;
      if (view === 'all' && lifecycle && !agreementMatchesLifecycleFilter(row.status, lifecycle)) return false;
      if (!needle) return true;
      const haystack = [
        row.title,
        row.referenceCode,
        row.summary,
        row.agreementType,
        ...row.parties.map((party) => party.displayName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, view, lifecycle, query]);

  const availableLifecycleFilters = useMemo(
    () => AGREEMENT_LIFECYCLE_FILTERS.filter((filter) => (counts[filter] ?? 0) > 0),
    [counts],
  );

  const setView = (nextView: AgreementPrimaryView) => {
    const next = new URLSearchParams(searchParams);
    if (nextView === 'needs_action') next.delete('bucket');
    else next.set('bucket', nextView);
    next.delete('lifecycle');
    setQuery('');
    setSearchParams(next, { replace: true });
  };

  const setLifecycle = (nextFilter: AgreementLifecycleFilter | null) => {
    const next = new URLSearchParams(searchParams);
    next.set('bucket', 'all');
    if (nextFilter) next.set('lifecycle', nextFilter);
    else next.delete('lifecycle');
    setSearchParams(next, { replace: true });
  };

  const emptyFirstUse = !loading && !backendMissing && !error && !hasRecords;

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('agreements.listTitle')}
          fallbackPath="/"
          titleAccessory={<AgreementCreateMenu />}
        />

        {hasRecords ? (
          <div className="flex flex-wrap items-center gap-2">
            {AGREEMENT_PRIMARY_VIEWS.map((id) => {
              const selected = view === id;
              const count = counts[id] ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70 bg-background text-muted-foreground'
                  }`}
                >
                  {t(VIEW_LABELS[id])}
                  {count ? <span className="ml-1.5 tabular-nums opacity-80">{count}</span> : null}
                </button>
              );
            })}
            {view === 'all' && availableLifecycleFilters.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="ml-auto h-8 gap-1.5">
                    <ListFilter className="h-3.5 w-3.5" aria-hidden />
                    {lifecycle ? t(LIFECYCLE_LABELS[lifecycle]) : t('agreements.filter')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setLifecycle(null)}>
                    {t('agreements.filterAllStatuses')}
                  </DropdownMenuItem>
                  {availableLifecycleFilters.map((filter) => (
                    <DropdownMenuItem key={filter} onSelect={() => setLifecycle(filter)}>
                      {t(LIFECYCLE_LABELS[filter])}
                      <span className="ml-auto tabular-nums text-muted-foreground">{counts[filter]}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}

        {hasRecords && view === 'all' ? (
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('agreements.searchPlaceholder')}
            aria-label={t('agreements.searchPlaceholder')}
          />
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : backendMissing ? (
          <Card className="rounded-2xl border-border/60 p-5 text-sm text-muted-foreground">
            {t('agreements.backendUnavailable')}
          </Card>
        ) : error ? (
          <Card className="rounded-2xl border-destructive/40 p-5 text-sm text-destructive">{error}</Card>
        ) : emptyFirstUse ? (
          <div className="space-y-3 pt-2" data-testid="agreements-empty">
            <h2 className="text-base font-medium text-foreground">{t('agreements.emptyTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('agreements.listSubtitleShort')}</p>
            <p className="text-sm text-muted-foreground">{t('agreements.emptyBody')}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              {view === 'needs_action'
                ? t('agreements.emptyFilterNeedsAction')
                : view === 'active'
                  ? t('agreements.emptyFilterActive')
                  : t('agreements.emptyFilterAll')}
            </p>
            {view === 'needs_action' && (counts.active ?? 0) > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setView('active')}>
                {t('agreements.viewActive')}
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((row) => (
              <li key={row.id}>
                <AgreementRow row={row} selfNames={selfNames} t={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
