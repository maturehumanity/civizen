import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { BookOpen, Download, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadTextFile } from '@/lib/funding/interest-csv';
import {
  fundingCommitmentsToCsv,
  listFundingCommitments,
  listFundingLaneTotals,
  listFunders,
  markFundingCommitmentStatus,
  recordFundingCommitment,
} from '@/lib/funding/ledger';
import {
  getFundingTransparencyPublish,
  setFundingTransparencyPublished,
  type FundingTransparencyPublishRow,
} from '@/lib/funding/transparency';
import {
  LEDGER_COMMITMENT_STATUSES,
  LEDGER_FUNDER_TYPES,
  LEDGER_LANES,
  LEDGER_PAYMENT_METHODS,
  type FundingCommitmentRow,
  type FundingLaneTotalRow,
  type FunderRow,
  type LedgerCommitmentStatus,
  type LedgerFunderType,
  type LedgerFundingLane,
  type LedgerPaymentMethod,
} from '@/lib/funding/types';

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

type FundingLedgerAdminProps = {
  /** @deprecated Panels always render embedded under FundingAdmin. Kept for call-site compatibility. */
  embedded?: boolean;
};

export default function FundingLedgerAdmin(_props: FundingLedgerAdminProps = {}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<FundingCommitmentRow[]>([]);
  const [totals, setTotals] = useState<FundingLaneTotalRow[]>([]);
  const [funders, setFunders] = useState<FunderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [publishState, setPublishState] = useState<FundingTransparencyPublishRow | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [laneFilter, setLaneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [existingFunderId, setExistingFunderId] = useState<string>('new');
  const [legalName, setLegalName] = useState('');
  const [publicDisplayName, setPublicDisplayName] = useState('');
  const [funderType, setFunderType] = useState<LedgerFunderType>('individual');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [lane, setLane] = useState<LedgerFundingLane>('donation');
  const [amountOriginal, setAmountOriginal] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amountUsd, setAmountUsd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<LedgerPaymentMethod | ''>('wire');
  const [status, setStatus] = useState<LedgerCommitmentStatus>('pledged');
  const [restrictionCode, setRestrictionCode] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [agreementId, setAgreementId] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [datePledged, setDatePledged] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [commitments, laneTotals, funderList, publish] = await Promise.all([
      listFundingCommitments(),
      listFundingLaneTotals(),
      listFunders(),
      getFundingTransparencyPublish(),
    ]);
    if (!commitments.ok) {
      setError(commitments.message);
      setRows([]);
    } else {
      setRows(commitments.data);
    }
    if (laneTotals.ok) setTotals(laneTotals.data);
    if (funderList.ok) setFunders(funderList.data);
    if (publish.ok) setPublishState(publish.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const receivedTotalsByLane = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of totals) {
      if (row.status === 'received' || row.status === 'partially_received') {
        map.set(row.lane, (map.get(row.lane) ?? 0) + Number(row.total_amount_usd || 0));
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [totals]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (laneFilter !== 'all' && row.lane !== laneFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      return true;
    });
  }, [laneFilter, rows, statusFilter]);

  const onChangeCommitmentStatus = async (row: FundingCommitmentRow, nextStatus: LedgerCommitmentStatus) => {
    setStatusUpdatingId(row.id);
    setError(null);
    setSuccess(null);
    const result = await markFundingCommitmentStatus({
      commitmentId: row.id,
      status: nextStatus,
      amountUsd: row.amount_usd,
    });
    setStatusUpdatingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('fund.ledger.statusUpdated'));
    await load();
  };

  const onSelectExistingFunder = (value: string) => {
    setExistingFunderId(value);
    if (value === 'new') return;
    const funder = funders.find((item) => item.id === value);
    if (!funder) return;
    setLegalName(funder.legal_name);
    setPublicDisplayName(funder.public_display_name ?? '');
    setFunderType(funder.funder_type);
    setCountry(funder.country ?? '');
    setEmail(funder.email ?? '');
  };

  const resetForm = () => {
    setExistingFunderId('new');
    setLegalName('');
    setPublicDisplayName('');
    setFunderType('individual');
    setCountry('');
    setEmail('');
    setLane('donation');
    setAmountOriginal('');
    setCurrency('USD');
    setAmountUsd('');
    setPaymentMethod('wire');
    setStatus('pledged');
    setRestrictionCode('');
    setRestrictions('');
    setAgreementId('');
    setReceiptId('');
    setDatePledged('');
    setDateReceived('');
    setBankReference('');
    setNotes('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const amount = Number(amountOriginal);
    const usd = amountUsd.trim() ? Number(amountUsd) : null;

    const result = await recordFundingCommitment({
      legalName,
      funderType,
      lane,
      amountOriginal: amount,
      currency,
      amountUsd: usd,
      publicDisplayName,
      country,
      email,
      paymentMethod,
      status,
      restrictionCode,
      restrictions,
      agreementId,
      receiptId,
      datePledged: datePledged || undefined,
      dateReceived: dateReceived || undefined,
      bankReference,
      notes,
      existingFunderId: existingFunderId === 'new' ? null : existingFunderId,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(t('fund.ledger.recordSuccess'));
    resetForm();
    setShowForm(false);
    await load();
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                {t('fund.ledger.title')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('fund.ledger.description')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={rows.length === 0}
              onClick={() =>
                downloadTextFile(
                  `civizen-funding-commitments-${new Date().toISOString().slice(0, 10)}.csv`,
                  fundingCommitmentsToCsv(filteredRows.length ? filteredRows : rows),
                )
              }
            >
              <Download className="h-4 w-4" />
              {t('fund.ledger.exportCsv')}
            </Button>
            <Button type="button" className="gap-2" onClick={() => setShowForm((value) => !value)}>
              <Plus className="h-4 w-4" />
              {showForm ? t('fund.ledger.hideForm') : t('fund.ledger.showForm')}
            </Button>
          </div>
        </div>

        <p className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
          {t('fund.ledger.legalNote')}
        </p>

        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">{t('fund.ledger.publishTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('fund.ledger.publishDescription')}</p>
              {publishState?.published_at ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fund.ledger.lastPublished')}: {new Date(publishState.published_at).toLocaleString()}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant={publishState?.is_published ? 'destructive' : 'default'}
              disabled={publishBusy || !publishState}
              onClick={() => {
                void (async () => {
                  if (!publishState) return;
                  setPublishBusy(true);
                  setError(null);
                  setSuccess(null);
                  const result = await setFundingTransparencyPublished(!publishState.is_published);
                  setPublishBusy(false);
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setPublishState(result.data);
                  setSuccess(
                    result.data.is_published
                      ? t('fund.ledger.publishOnSuccess')
                      : t('fund.ledger.publishOffSuccess'),
                  );
                })();
              }}
            >
              {publishBusy
                ? t('fund.ledger.publishBusy')
                : publishState?.is_published
                  ? t('fund.ledger.unpublish')
                  : t('fund.ledger.publish')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('fund.ledger.publishHint')}</p>
        </Card>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-primary">{success}</p> : null}

        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-foreground">{t('fund.ledger.totalsTitle')}</h2>
          {receivedTotalsByLane.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('fund.ledger.totalsEmpty')}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {receivedTotalsByLane.map(([laneKey, total]) => (
                <div
                  key={laneKey}
                  className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2 text-sm"
                >
                  <span className="capitalize text-muted-foreground">{laneKey}</span>
                  <span className="font-medium text-foreground">{formatUsd(total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {showForm ? (
          <Card className="p-4">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t('fund.ledger.existingFunder')}</Label>
                <Select value={existingFunderId} onValueChange={onSelectExistingFunder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{t('fund.ledger.newFunder')}</SelectItem>
                    {funders.map((funder) => (
                      <SelectItem key={funder.id} value={funder.id}>
                        {funder.legal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-name">{t('fund.ledger.legalName')}</Label>
                <Input id="legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name">{t('fund.ledger.displayName')}</Label>
                <Input
                  id="display-name"
                  value={publicDisplayName}
                  onChange={(e) => setPublicDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fund.ledger.funderType')}</Label>
                <Select value={funderType} onValueChange={(v) => setFunderType(v as LedgerFunderType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_FUNDER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`fund.ledger.funderTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('fund.ledger.lane')}</Label>
                <Select value={lane} onValueChange={(v) => setLane(v as LedgerFundingLane)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_LANES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`fund.ledger.lanes.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t('fund.ledger.amountOriginal')}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountOriginal}
                  onChange={(e) => setAmountOriginal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t('fund.ledger.currency')}</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount-usd">{t('fund.ledger.amountUsd')}</Label>
                <Input
                  id="amount-usd"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fund.ledger.status')}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as LedgerCommitmentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_COMMITMENT_STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`fund.ledger.statuses.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('fund.ledger.paymentMethod')}</Label>
                <Select
                  value={paymentMethod || 'wire'}
                  onValueChange={(v) => setPaymentMethod(v as LedgerPaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_PAYMENT_METHODS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`fund.ledger.paymentMethods.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('fund.ledger.country')}</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('fund.ledger.email')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restriction-code">{t('fund.ledger.restrictionCode')}</Label>
                <Input
                  id="restriction-code"
                  value={restrictionCode}
                  onChange={(e) => setRestrictionCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreement">{t('fund.ledger.agreementId')}</Label>
                <Input id="agreement" value={agreementId} onChange={(e) => setAgreementId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt">{t('fund.ledger.receiptId')}</Label>
                <Input id="receipt" value={receiptId} onChange={(e) => setReceiptId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-ref">{t('fund.ledger.bankReference')}</Label>
                <Input id="bank-ref" value={bankReference} onChange={(e) => setBankReference(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-pledged">{t('fund.ledger.datePledged')}</Label>
                <Input
                  id="date-pledged"
                  type="date"
                  value={datePledged}
                  onChange={(e) => setDatePledged(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-received">{t('fund.ledger.dateReceived')}</Label>
                <Input
                  id="date-received"
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="restrictions">{t('fund.ledger.restrictions')}</Label>
                <Textarea
                  id="restrictions"
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{t('fund.ledger.restrictionsHint')}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t('fund.ledger.notes')}</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                  {submitting ? t('fund.ledger.saving') : t('fund.ledger.save')}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('fund.ledger.filterLane')}</Label>
            <Select value={laneFilter} onValueChange={setLaneFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fund.ledger.filterAll')}</SelectItem>
                {LEDGER_LANES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`fund.ledger.lanes.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('fund.ledger.filterStatus')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fund.ledger.filterAll')}</SelectItem>
                {LEDGER_COMMITMENT_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`fund.ledger.statuses.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!loading && filteredRows.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">{t('fund.ledger.emptyFiltered')}</Card>
        ) : null}

        <div className="space-y-3">
          {filteredRows.map((row) => (
            <Card key={row.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {row.funders?.legal_name ?? t('fund.ledger.unknownFunder')}
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {row.lane} · {row.status}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-foreground">
                    {row.amount_original} {row.currency}
                  </p>
                  <p className="text-muted-foreground">{formatUsd(row.amount_usd)}</p>
                </div>
              </div>
              {(row.restriction_code || row.restrictions) && (
                <p className="rounded-xl bg-muted/40 p-3 text-sm text-foreground/90">
                  {[row.restriction_code, row.restrictions].filter(Boolean).join(' — ')}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">{t('fund.ledger.status')}</span>
                <Select
                  value={row.status}
                  disabled={statusUpdatingId === row.id}
                  onValueChange={(value) =>
                    void onChangeCommitmentStatus(row, value as LedgerCommitmentStatus)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_COMMITMENT_STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`fund.ledger.statuses.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
                {row.receipt_id ? ` · ${t('fund.ledger.receiptId')}: ${row.receipt_id}` : ''}
              </p>
            </Card>
          ))}
        </div>
    </div>
  );
}
