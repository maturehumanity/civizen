import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveQuickCheckIn } from '@/lib/happiness/api';
import { AFFECTING_CATEGORIES, CHECKIN_FEELINGS, type AffectingCategory, type CheckInFeeling } from '@/lib/happiness/types';
import { useHappinessWorkspace } from '@/lib/happiness/use-happiness';

import { HappinessChoiceButton, HappinessShell } from './HappinessShell';

export default function HappinessCheckIn() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { result } = useHappinessWorkspace(profile?.id);
  const [feeling, setFeeling] = useState<CheckInFeeling | null>(null);
  const [affecting, setAffecting] = useState<AffectingCategory | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const disabled = result?.privacy.checkinsEnabled === false;

  const submit = async () => {
    if (!profile?.id || !feeling || busy || disabled) return;
    setBusy(true);
    try {
      await saveQuickCheckIn(profile.id, {
        feeling,
        affectingMost: affecting,
        note,
      });
      toast.success(t('happiness.checkInSaved'));
      navigate('/happiness', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <HappinessShell titleKey="happiness.checkInTitle" subtitle={t('happiness.checkInSubtitle')} fallbackPath="/happiness">
      {disabled ? <p className="text-sm text-muted-foreground">{t('happiness.checkinsDisabledHint')}</p> : null}

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.howFeelingToday')}</legend>
        {CHECKIN_FEELINGS.map((value) => (
          <HappinessChoiceButton key={value} selected={feeling === value} onClick={() => setFeeling(value)}>
            {t(`happiness.feelings.${value}`)}
          </HappinessChoiceButton>
        ))}
      </fieldset>

      {feeling ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.affectingMost')}</legend>
          {AFFECTING_CATEGORIES.map((value) => (
            <HappinessChoiceButton key={value} selected={affecting === value} onClick={() => setAffecting(value)}>
              {t(`happiness.affecting.${value}`)}
            </HappinessChoiceButton>
          ))}
        </fieldset>
      ) : null}

      {feeling ? (
        <div className="space-y-2">
          <label htmlFor="happiness-checkin-note" className="text-sm font-medium text-foreground">
            {t('happiness.wantToAdd')}
          </label>
          <Textarea
            id="happiness-checkin-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('happiness.notePlaceholder')}
            rows={3}
          />
        </div>
      ) : null}

      <Button type="button" onClick={() => void submit()} disabled={!feeling || busy || disabled}>
        {busy ? t('common.saving') : t('happiness.saveCheckIn')}
      </Button>
    </HappinessShell>
  );
}
