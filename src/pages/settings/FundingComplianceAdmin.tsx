import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ShieldAlert } from 'lucide-react';

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
import {
  listFundingComplianceCases,
  listFundingPaymentReceipts,
  recordFundingPaymentReceipt,
  upsertFundingComplianceCase,
  type FundingComplianceCase,
  type FundingPaymentReceipt,
} from '@/lib/funding/compliance';
import { listFundingCommitments, listFunders } from '@/lib/funding/ledger';
import type { FundingCommitmentRow, FunderRow } from '@/lib/funding/types';

const CASE_TYPES = [
  'kyc',
  'kyb',
  'sanctions',
  'source_of_funds',
  'tax_docs',
  'restricted_funds',
  'other',
] as const;

const CASE_STATUSES = ['open', 'in_review', 'cleared', 'blocked', 'waived'] as const;
const CASE_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;
const PROVIDERS = ['manual', 'wire', 'ach', 'card_processor', 'crypto_custodian', 'other'] as const;

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

type FundingComplianceAdminProps = {
  /** @deprecated Panels always render embedded under FundingAdmin. Kept for call-site compatibility. */
  embedded?: boolean;
};

export default function FundingComplianceAdmin(_props: FundingComplianceAdminProps = {}) {
  const { t } = useLanguage();
  const [cases, setCases] = useState<FundingComplianceCase[]>([]);
  const [receipts, setReceipts] = useState<FundingPaymentReceipt[]>([]);
  const [commitments, setCommitments] = useState<FundingCommitmentRow[]>([]);
  const [funders, setFunders] = useState<FunderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const [caseType, setCaseType] = useState<(typeof CASE_TYPES)[number]>('kyc');
  const [caseStatus, setCaseStatus] = useState<(typeof CASE_STATUSES)[number]>('open');
  const [priority, setPriority] = useState<(typeof CASE_PRIORITIES)[number]>('normal');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [funderId, setFunderId] = useState('none');
  const [commitmentId, setCommitmentId] = useState('none');

  const [receiptCommitmentId, setReceiptCommitmentId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptProvider, setReceiptProvider] = useState<(typeof PROVIDERS)[number]>('manual');
  const [receiptReference, setReceiptReference] = useState('');
  const [markReceived, setMarkReceived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [caseResult, receiptResult, commitmentResult, funderResult] = await Promise.all([
      listFundingComplianceCases(),
      listFundingPaymentReceipts(),
      listFundingCommitments(),
      listFunders(),
    ]);
    if (!caseResult.ok) setError(caseResult.message);
    else setCases(caseResult.data);
    if (receiptResult.ok) setReceipts(receiptResult.data);
    if (commitmentResult.ok) {
      setCommitments(commitmentResult.data);
      setReceiptCommitmentId((current) => current || commitmentResult.data[0]?.id || '');
    }
    if (funderResult.ok) setFunders(funderResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCases = useMemo(() => {
    if (statusFilter === 'all') return cases;
    return cases.filter((row) => row.status === statusFilter);
  }, [cases, statusFilter]);

  const funderName = useMemo(() => {
    const map = new Map(funders.map((f) => [f.id, f.legal_name]));
    return (id: string | null) => (id ? map.get(id) ?? id.slice(0, 8) : '—');
  }, [funders]);

  const onCreateCase = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await upsertFundingComplianceCase({
      caseType,
      summary,
      status: caseStatus,
      priority,
      notes: notes || undefined,
      funderId: funderId === 'none' ? null : funderId,
      fundingCommitmentId: commitmentId === 'none' ? null : commitmentId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('fund.compliance.caseSaved'));
    setSummary('');
    setNotes('');
    await load();
  };

  const onUpdateCaseStatus = async (row: FundingComplianceCase, nextStatus: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await upsertFundingComplianceCase({
      caseId: row.id,
      caseType: row.case_type,
      summary: row.summary,
      status: nextStatus,
      priority: row.priority,
      notes: row.notes ?? undefined,
      funderId: row.funder_id,
      fundingCommitmentId: row.funding_commitment_id,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('fund.compliance.caseUpdated'));
    await load();
  };

  const onRecordReceipt = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(receiptAmount);
    if (!receiptCommitmentId || !Number.isFinite(amount) || amount <= 0) {
      setError(t('fund.compliance.invalidReceiptAmount'));
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await recordFundingPaymentReceipt({
      fundingCommitmentId: receiptCommitmentId,
      amountUsd: amount,
      provider: receiptProvider,
      externalReference: receiptReference || undefined,
      markCommitmentReceived: markReceived,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('fund.compliance.receiptSaved'));
    setReceiptAmount('');
    setReceiptReference('');
    setMarkReceived(false);
    await load();
  };

  return (
    <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {t('fund.compliance.title')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('fund.compliance.description')}</p>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-primary">{success}</p> : null}

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-foreground">{t('fund.compliance.newCase')}</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateCase}>
            <div className="space-y-2">
              <Label>{t('fund.compliance.caseType')}</Label>
              <Select value={caseType} onValueChange={(v) => setCaseType(v as typeof caseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`fund.compliance.caseTypes.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('fund.compliance.priority')}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_PRIORITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`fund.compliance.priorities.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('fund.compliance.status')}</Label>
              <Select value={caseStatus} onValueChange={(v) => setCaseStatus(v as typeof caseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`fund.compliance.statuses.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('fund.compliance.funder')}</Label>
              <Select value={funderId} onValueChange={setFunderId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('fund.compliance.none')}</SelectItem>
                  {funders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.legal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.compliance.commitment')}</Label>
              <Select value={commitmentId} onValueChange={setCommitmentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('fund.compliance.none')}</SelectItem>
                  {commitments.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.lane} · {formatUsd(c.amount_usd)} · {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.compliance.summary')}</Label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.compliance.notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy || !summary.trim()}>
                {busy ? t('common.loading') : t('fund.compliance.saveCase')}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-2 p-4">
          <Label>{t('fund.compliance.filterStatus')}</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('fund.compliance.filterAll')}</SelectItem>
              {CASE_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`fund.compliance.statuses.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {!loading && filteredCases.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">{t('fund.compliance.emptyCases')}</Card>
        ) : null}

        <div className="space-y-3">
          {filteredCases.map((row) => (
            <Card key={row.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{row.summary}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`fund.compliance.caseTypes.${row.case_type}`)} · {funderName(row.funder_id)} ·{' '}
                    {t(`fund.compliance.priorities.${row.priority}`)}
                  </p>
                </div>
                <Select
                  value={row.status}
                  onValueChange={(v) => void onUpdateCaseStatus(row, v)}
                  disabled={busy}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`fund.compliance.statuses.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {row.notes ? <p className="text-sm text-muted-foreground">{row.notes}</p> : null}
            </Card>
          ))}
        </div>

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-foreground">{t('fund.compliance.receiptTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('fund.compliance.receiptHint')}</p>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onRecordReceipt}>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.compliance.commitment')}</Label>
              <Select value={receiptCommitmentId} onValueChange={setReceiptCommitmentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commitments.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.lane} · {formatUsd(c.amount_usd)} · {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('fund.compliance.amountUsd')}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('fund.compliance.provider')}</Label>
              <Select
                value={receiptProvider}
                onValueChange={(v) => setReceiptProvider(v as typeof receiptProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`fund.compliance.providers.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.compliance.externalReference')}</Label>
              <Input value={receiptReference} onChange={(e) => setReceiptReference(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
              <input
                type="checkbox"
                checked={markReceived}
                onChange={(e) => setMarkReceived(e.target.checked)}
              />
              {t('fund.compliance.markReceived')}
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy || !receiptCommitmentId}>
                {busy ? t('common.loading') : t('fund.compliance.saveReceipt')}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">{t('fund.compliance.receiptsList')}</h2>
          {receipts.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">{t('fund.compliance.emptyReceipts')}</Card>
          ) : (
            receipts.map((row) => (
              <Card key={row.id} className="space-y-1 p-4">
                <p className="font-semibold text-foreground">
                  {formatUsd(Number(row.amount_usd))} · {row.provider}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.funding_commitment_id.slice(0, 8)}… · {row.reconciliation_status} ·{' '}
                  {row.received_at}
                </p>
                {row.external_reference ? (
                  <p className="text-xs text-muted-foreground">{row.external_reference}</p>
                ) : null}
              </Card>
            ))
          )}
        </div>
    </div>
  );
}
