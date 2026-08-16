import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveQuickCheckIn } from '@/lib/happiness/api';
import { areaHasProblem, followUpsForAreas } from '@/lib/happiness/checkin-flow';
import { tagLabelKey } from '@/lib/happiness/causes';
import {
  AFFECTING_CATEGORIES,
  CHECKIN_FEELINGS,
  type AffectingCategory,
  type CausePolarity,
  type CheckInArea,
  type CheckInAreaPolarity,
  type CheckInFeeling,
} from '@/lib/happiness/types';
import { useHappinessWorkspace } from '@/lib/happiness/use-happiness';

import { HappinessChoiceButton, HappinessQuietLink, HappinessShell } from './HappinessShell';

type Step = 'start' | 'polarity' | 'tags' | 'note';

const POLARITY_OPTIONS: CheckInAreaPolarity[] = ['support', 'problem', 'both'];

export default function HappinessCheckIn() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { result } = useHappinessWorkspace(profile?.id);
  const [step, setStep] = useState<Step>('start');
  const [feeling, setFeeling] = useState<CheckInFeeling | null>(null);
  const [selected, setSelected] = useState<AffectingCategory[]>([]);
  const [polarities, setPolarities] = useState<Partial<Record<AffectingCategory, CheckInAreaPolarity>>>({});
  const [polarityIndex, setPolarityIndex] = useState(0);
  const [tagIndex, setTagIndex] = useState(0);
  const [pickedTags, setPickedTags] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const disabled = result?.privacy.checkinsEnabled === false;

  const areas: CheckInArea[] = selected.map((category) => ({
    category,
    polarity: polarities[category] ?? 'problem',
  }));
  const followUps = useMemo(() => followUpsForAreas(areas), [areas]);
  const polarityCategory = selected[polarityIndex] ?? null;
  const followUp = followUps[tagIndex] ?? null;

  const toggleArea = (value: AffectingCategory) => {
    setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const toggleTag = (key: string, tag: string) => {
    setPickedTags((current) => {
      const next = current[key] ?? [];
      return { ...current, [key]: next.includes(tag) ? next.filter((item) => item !== tag) : [...next, tag] };
    });
  };

  const submit = async () => {
    if (!profile?.id || !feeling || busy || disabled) return;
    setBusy(true);
    try {
      const tags: { category: AffectingCategory; polarity: CausePolarity; tag: string }[] = [];
      for (const item of followUps) {
        const key = `${item.category}:${item.polarity}`;
        for (const tag of pickedTags[key] ?? []) {
          tags.push({ category: item.category, polarity: item.polarity, tag });
        }
      }
      await saveQuickCheckIn(profile.id, { feeling, areas, tags, note });
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

      {step === 'start' ? (
        <div className="space-y-5">
          <fieldset disabled={disabled}>
            <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.howFeelingToday')}</legend>
            <p className="mb-2 text-xs text-muted-foreground">{t('happiness.howFeelingTodayHint')}</p>
            <div className="flex flex-wrap gap-2">
              {CHECKIN_FEELINGS.map((value) => (
                <HappinessChoiceButton key={value} compact selected={feeling === value} onClick={() => setFeeling(value)}>
                  {t(`happiness.feelings.${value}`)}
                </HappinessChoiceButton>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={disabled}>
            <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.affectingAreas')}</legend>
            <p className="mb-2 text-xs text-muted-foreground">{t('happiness.affectingAreasHint')}</p>
            <div className="flex flex-wrap gap-2">
              {AFFECTING_CATEGORIES.map((value) => (
                <HappinessChoiceButton
                  key={value}
                  compact
                  selected={selected.includes(value)}
                  onClick={() => toggleArea(value)}
                >
                  {t(`happiness.affecting.${value}`)}
                </HappinessChoiceButton>
              ))}
            </div>
          </fieldset>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!feeling || disabled || busy}
            onClick={() => {
              if (!selected.length) {
                void submit();
                return;
              }
              setPolarityIndex(0);
              setStep('polarity');
            }}
          >
            {busy && !selected.length ? t('common.saving') : selected.length ? t('common.next') : t('happiness.saveCheckIn')}
          </Button>
        </div>
      ) : null}

      {step === 'polarity' && polarityCategory ? (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="mb-1 text-sm font-medium text-foreground">
            {t('happiness.areaPolarity', { area: t(`happiness.affecting.${polarityCategory}`) })}
          </legend>
          {POLARITY_OPTIONS.map((value) => (
            <HappinessChoiceButton
              key={value}
              selected={polarities[polarityCategory] === value}
              onClick={() => setPolarities((current) => ({ ...current, [polarityCategory]: value }))}
            >
              {t(`happiness.polarity.${value}`)}
            </HappinessChoiceButton>
          ))}
          <Button
            type="button"
            className="mt-2 w-full sm:w-auto"
            disabled={!polarities[polarityCategory]}
            onClick={() => {
              if (polarityIndex + 1 < selected.length) {
                setPolarityIndex(polarityIndex + 1);
                return;
              }
              const nextFollowUps = followUpsForAreas(
                selected.map((category) => ({ category, polarity: polarities[category] ?? 'problem' })),
              );
              if (!nextFollowUps.length) {
                setStep('note');
                return;
              }
              setTagIndex(0);
              setStep('tags');
            }}
          >
            {t('common.next')}
          </Button>
        </fieldset>
      ) : null}

      {step === 'tags' && followUp ? (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="mb-1 text-sm font-medium text-foreground">
            {t(followUp.polarity === 'support' ? 'happiness.whatHelping' : 'happiness.whatMakingHarder', {
              area: t(`happiness.affecting.${followUp.category}`),
            })}
          </legend>
          <p className="mb-2 text-xs text-muted-foreground">{t('happiness.followUpHint')}</p>
          {followUp.tags.map((tag) => {
            const key = `${followUp.category}:${followUp.polarity}`;
            return (
              <HappinessChoiceButton key={tag} selected={(pickedTags[key] ?? []).includes(tag)} onClick={() => toggleTag(key, tag)}>
                {t(tagLabelKey(followUp.group, tag, followUp.polarity))}
              </HappinessChoiceButton>
            );
          })}
          <Button
            type="button"
            className="mt-2 w-full sm:w-auto"
            onClick={() => {
              if (tagIndex + 1 < followUps.length) {
                setTagIndex(tagIndex + 1);
                return;
              }
              setStep('note');
            }}
          >
            {t('common.next')}
          </Button>
        </fieldset>
      ) : null}

      {step === 'note' ? (
        <div className="space-y-4">
          {areaHasProblem(areas, 'work') ? (
            <p className="text-sm text-muted-foreground">
              {t('happiness.workDeeperHint')}{' '}
              <HappinessQuietLink to="/happiness/work">{t('happiness.openWorkFulfillment')}</HappinessQuietLink>
            </p>
          ) : null}
          <OutlinedField label={t('happiness.wantToAdd')} htmlFor="happiness-checkin-note">
            <Textarea
              id="happiness-checkin-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('happiness.notePlaceholder')}
              rows={3}
            />
          </OutlinedField>
          <Button type="button" onClick={() => void submit()} disabled={!feeling || busy || disabled}>
            {busy ? t('common.saving') : t('happiness.saveCheckIn')}
          </Button>
        </div>
      ) : null}
    </HappinessShell>
  );
}
