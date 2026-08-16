import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveMonthlyReview, saveWeeklyPulse } from '@/lib/happiness/api';
import { DOMAIN_LABEL_KEYS, selectWeeklyPulseDomains } from '@/lib/happiness/domains';
import { overallLevelPhraseKey } from '@/lib/happiness/levels';
import { HAPPINESS_DOMAINS, HAPPINESS_LEVELS, type HappinessDomainId, type HappinessLevel } from '@/lib/happiness/types';
import { useHappinessWorkspace } from '@/lib/happiness/use-happiness';

import { HappinessChoiceButton, HappinessShell } from './HappinessShell';

type Mode = 'pulse' | 'monthly';

export default function HappinessReview() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { result } = useHappinessWorkspace(profile?.id);
  const hasRecentMonthly = Boolean(
    result?.reviews[0] && Date.now() - new Date(result.reviews[0].createdAt).getTime() < 20 * 86_400_000,
  );
  const [mode, setMode] = useState<Mode>(hasRecentMonthly ? 'pulse' : 'monthly');
  const [answers, setAnswers] = useState<Partial<Record<HappinessDomainId, HappinessLevel>>>({});
  const [wantsHelp, setWantsHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  const lastAssessed = useMemo(() => {
    const map: Partial<Record<HappinessDomainId, string>> = {};
    for (const review of result?.reviews ?? []) {
      for (const domain of HAPPINESS_DOMAINS) {
        if (review.domainAnswers[domain] && !map[domain]) map[domain] = review.createdAt;
      }
    }
    for (const pulse of result?.pulses ?? []) {
      for (const domain of HAPPINESS_DOMAINS) {
        if (pulse.domainAnswers[domain] && !map[domain]) map[domain] = pulse.createdAt;
      }
    }
    return map;
  }, [result]);

  const pulseDomains = useMemo(() => selectWeeklyPulseDomains(lastAssessed), [lastAssessed]);
  const domains = mode === 'pulse' ? pulseDomains : [...HAPPINESS_DOMAINS];
  const complete = domains.every((domain) => answers[domain]);

  const submit = async () => {
    if (!profile?.id || !complete || busy) return;
    setBusy(true);
    try {
      if (mode === 'pulse') {
        await saveWeeklyPulse(profile.id, answers);
      } else {
        const helpAreas = wantsHelp
          ? domains.filter((domain) => answers[domain] === 'struggling' || answers[domain] === 'unsettled')
          : [];
        await saveMonthlyReview(profile.id, {
          domainAnswers: answers,
          wantsHelp,
          helpAreas,
        });
      }
      toast.success(t('happiness.reviewSaved'));
      if (wantsHelp) navigate('/happiness/improve');
      else navigate('/happiness');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <HappinessShell titleKey="happiness.reviewTitle" subtitle={t('happiness.reviewSubtitle')} fallbackPath="/happiness">
      {result?.view.overallLevel ? (
        <p className="text-sm text-foreground">{t(overallLevelPhraseKey(result.view.overallLevel))}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={mode === 'pulse' ? 'default' : 'outline'} onClick={() => setMode('pulse')}>
          {t('happiness.weeklyPulse')}
        </Button>
        <Button type="button" size="sm" variant={mode === 'monthly' ? 'default' : 'outline'} onClick={() => setMode('monthly')}>
          {t('happiness.monthlyReview')}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {mode === 'pulse' ? t('happiness.weeklyPulseHint') : t('happiness.monthlyReviewHint')}
      </p>

      <div className="space-y-4">
        {domains.map((domain) => (
          <Card key={domain} className="space-y-2 rounded-2xl border-border/70 p-4">
            <p className="text-sm font-medium text-foreground">{t(DOMAIN_LABEL_KEYS[domain])}</p>
            <div className="grid gap-2">
              {HAPPINESS_LEVELS.map((level) => (
                <HappinessChoiceButton
                  key={level}
                  selected={answers[domain] === level}
                  onClick={() => setAnswers((current) => ({ ...current, [domain]: level }))}
                >
                  {t(`happiness.levels.${level}`)}
                </HappinessChoiceButton>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {mode === 'monthly' ? (
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={wantsHelp}
            onChange={(event) => setWantsHelp(event.target.checked)}
          />
          <span>{t('happiness.wantHelpImproving')}</span>
        </label>
      ) : null}

      <Button type="button" onClick={() => void submit()} disabled={!complete || busy}>
        {busy ? t('common.saving') : t('happiness.saveReview')}
      </Button>
    </HappinessShell>
  );
}
