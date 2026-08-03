import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { listFundingAuditEvents, type FundingAuditEventRow } from '@/lib/funding/ledger';

const EVENT_FILTERS = [
  'all',
  'commitment_recorded',
  'commitment_status_changed',
  'interest_converted',
  'transparency_published',
  'transparency_unpublished',
  'compliance_case_upserted',
  'payment_receipt_recorded',
  'distribution_period_created',
  'distribution_period_approved',
] as const;

type FundingAuditAdminProps = {
  /** @deprecated Panels always render embedded under FundingAdmin. Kept for call-site compatibility. */
  embedded?: boolean;
};

export default function FundingAuditAdmin(_props: FundingAuditAdminProps = {}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<FundingAuditEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFundingAuditEvents();
    if (!result.ok) {
      setError(result.message);
      setRows([]);
    } else {
      setRows(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (eventFilter === 'all') return rows;
    return rows.filter((row) => row.event_type === eventFilter);
  }, [eventFilter, rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ScrollText className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{t('fund.audit.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('fund.audit.description')}</p>
        </div>
      </div>

      <Card className="space-y-2 p-4">
        <Label>{t('fund.audit.filterEvent')}</Label>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_FILTERS.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`fund.audit.events.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

      {!loading && filtered.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{t('fund.audit.empty')}</Card>
      ) : null}

      <div className="space-y-3">
        {filtered.map((row) => (
          <Card key={row.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{row.event_type}</p>
                <p className="text-sm text-muted-foreground">
                  {row.entity_type} · {row.entity_id}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/40 p-3 text-xs text-foreground/90">
              {JSON.stringify(row.payload, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
