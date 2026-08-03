import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { submitFundingInterest } from '@/lib/funding/submit-interest';
import type { FundingInterestLane } from '@/lib/funding/types';

type FundingInterestFormProps = {
  lane: FundingInterestLane;
  requireRiskDisclosure?: boolean;
  showAmount?: boolean;
  showAccredited?: boolean;
  showOrganization?: boolean;
  submitLabelKey?: string;
};

export function FundingInterestForm({
  lane,
  requireRiskDisclosure = false,
  showAmount = true,
  showAccredited = false,
  showOrganization = true,
  submitLabelKey,
}: FundingInterestFormProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [accredited, setAccredited] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const indicatedAmountUsd = amount.trim() ? Number(amount) : null;
    if (indicatedAmountUsd !== null && (!Number.isFinite(indicatedAmountUsd) || indicatedAmountUsd < 0)) {
      setError(t('fund.form.invalidAmount'));
      setSubmitting(false);
      return;
    }

    const result = await submitFundingInterest({
      lane,
      fullName,
      email,
      organization: showOrganization ? organization : undefined,
      country,
      indicatedAmountUsd,
      message,
      accreditedInvestorInterest: showAccredited ? accredited : undefined,
      acceptRiskDisclosure: requireRiskDisclosure ? acceptRisk : true,
      userId: user?.id ?? null,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div
        className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm leading-relaxed text-foreground"
        data-build-key="fund-interest-success"
      >
        <p className="font-semibold">{t('fund.form.successTitle')}</p>
        <p className="mt-2 text-muted-foreground">{t('fund.form.successBody')}</p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} data-build-key="fund-interest-form">
      <div className="space-y-2">
        <Label htmlFor={`fund-name-${lane}`}>{t('fund.form.fullName')}</Label>
        <Input
          id={`fund-name-${lane}`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`fund-email-${lane}`}>{t('fund.form.email')}</Label>
        <Input
          id={`fund-email-${lane}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      {showOrganization ? (
        <div className="space-y-2">
          <Label htmlFor={`fund-org-${lane}`}>{t('fund.form.organization')}</Label>
          <Input
            id={`fund-org-${lane}`}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            autoComplete="organization"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`fund-country-${lane}`}>{t('fund.form.country')}</Label>
        <Input
          id={`fund-country-${lane}`}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          autoComplete="country-name"
        />
      </div>

      {showAmount ? (
        <div className="space-y-2">
          <Label htmlFor={`fund-amount-${lane}`}>{t('fund.form.indicatedAmount')}</Label>
          <Input
            id={`fund-amount-${lane}`}
            type="number"
            min={0}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('fund.form.indicatedAmountPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('fund.form.indicatedAmountHint')}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`fund-message-${lane}`}>{t('fund.form.message')}</Label>
        <Textarea
          id={`fund-message-${lane}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder={t('fund.form.messagePlaceholder')}
        />
      </div>

      {showAccredited ? (
        <label className="flex items-start gap-3 text-sm text-foreground">
          <Checkbox checked={accredited} onCheckedChange={(v) => setAccredited(v === true)} />
          <span>{t('fund.form.accreditedInterest')}</span>
        </label>
      ) : null}

      {requireRiskDisclosure ? (
        <label className="flex items-start gap-3 text-sm text-foreground">
          <Checkbox
            checked={acceptRisk}
            onCheckedChange={(v) => setAcceptRisk(v === true)}
            required
          />
          <span>{t('fund.form.acceptRisk')}</span>
        </label>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full gap-2" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? t('fund.form.submitting') : t(submitLabelKey ?? 'fund.form.submit')}
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">{t('fund.form.disclaimer')}</p>
    </form>
  );
}
