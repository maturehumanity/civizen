import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { FundPageShell } from '@/components/funding/FundPageShell';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getPublicFundingTransparency,
  type PublicFundingTransparency,
} from '@/lib/funding/transparency';

const LIVE_ROWS = [
  'investor',
  'donation',
  'grants',
  'commercial',
  'sponsorship',
] as const;

type LiveRowKey = (typeof LIVE_ROWS)[number];

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function laneAmount(data: PublicFundingTransparency | null, key: LiveRowKey): number | null {
  if (!data?.published) return null;
  const lanes = data.lanes;
  switch (key) {
    case 'investor':
      return Number(lanes.investor ?? 0);
    case 'donation':
      return Number(lanes.donation ?? 0);
    case 'grants':
      return Number(lanes.grants ?? 0);
    case 'commercial':
      return Number(lanes.commercial ?? 0);
    case 'sponsorship':
      return Number(lanes.sponsorship ?? 0);
    default:
      return null;
  }
}

export default function FundTransparency() {
  const { t } = useLanguage();
  const [data, setData] = useState<PublicFundingTransparency | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await getPublicFundingTransparency();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setData(null);
      } else {
        setError(null);
        setData(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const published = Boolean(data?.published);

  return (
    <FundPageShell
      title={t('fund.transparency.title')}
      description={t('fund.transparency.description')}
      pageTitle={t('fund.transparency.pageTitle')}
      pageDescription={t('fund.transparency.pageDescription')}
    >
      <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
        {published ? t('fund.transparency.liveNote') : t('fund.transparency.noAuthoritativeNote')}
      </p>

      <p className="text-sm text-muted-foreground">
        <Link to="/about/legal-status" className="text-primary underline-offset-4 hover:underline">
          {t('fund.transparency.legalStatusLink')}
        </Link>
        {' · '}
        <Link to="/documents" className="text-primary underline-offset-4 hover:underline">
          {t('onboarding.footerDocuments')}
        </Link>
      </p>

      {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {published && data?.published_at ? (
        <p className="text-xs text-muted-foreground">
          {t('fund.transparency.publishedAt')}: {new Date(data.published_at).toLocaleString()}
        </p>
      ) : null}

      {published ? (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t('fund.transparency.colCategory')}</th>
                <th className="px-4 py-3 font-medium">{t('fund.transparency.colAmount')}</th>
                <th className="px-4 py-3 font-medium">{t('fund.transparency.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {LIVE_ROWS.map((row) => {
                const amount = laneAmount(data, row);
                return (
                  <tr key={row} className="border-t border-border/50">
                    <td className="px-4 py-3 text-foreground">
                      {t(`fund.transparency.rows.${row}.label`)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatUsd(amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t('fund.transparency.statusPublished')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-4 text-sm leading-relaxed text-muted-foreground">
          {t('fund.transparency.prototypeNote')}
        </p>
      )}

      <p className="text-sm leading-relaxed text-muted-foreground">{t('fund.transparency.privacyNote')}</p>
      {published ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{t('fund.transparency.basisNote')}</p>
      ) : null}
    </FundPageShell>
  );
}
