import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { saveShareablePreferences, saveWorkFulfillmentProfile } from '@/lib/work-fulfillment/api';
import { deriveWorkJoyPatterns } from '@/lib/work-fulfillment/joy-patterns';
import { joyEntriesForContext, primaryWorkContext } from '@/lib/work-fulfillment/scope';
import {
  WORK_LOCATION_MODES,
  WORK_VALUES,
  emptyWorkFulfillmentDraft,
  type WorkAutonomyPreferences,
  type WorkEnvironmentPreferences,
} from '@/lib/work-fulfillment/types';
import type { WorkFulfillmentLoadResult } from '@/lib/work-fulfillment/workspace';

import { HappinessChoiceButton } from './HappinessShell';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function AxisChoices<T extends string>({
  legend,
  value,
  options,
  prefix,
  onChange,
  t,
}: {
  legend: string;
  value: T | undefined;
  options: T[];
  prefix: string;
  onChange: (value: T) => void;
  t: Translate;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      {options.map((option) => (
        <HappinessChoiceButton key={option} selected={value === option} onClick={() => onChange(option)}>
          {t(`${prefix}.${option}`)}
        </HappinessChoiceButton>
      ))}
    </fieldset>
  );
}

export function WorkFitSection({
  t,
  profileId,
  work,
  onSaved,
  onExplore,
}: {
  t: Translate;
  profileId: string;
  work: WorkFulfillmentLoadResult | null;
  onSaved: () => void;
  onExplore: () => void;
}) {
  const profile = work?.profile ?? emptyWorkFulfillmentDraft(profileId);
  const [values, setValues] = useState(profile.values);
  const [enjoyed, setEnjoyed] = useState((profile.enjoyment.enjoyedActivities ?? []).join(', '));
  const [draining, setDraining] = useState((profile.enjoyment.drainingTasks ?? []).join(', '));
  const [purpose, setPurpose] = useState(profile.purposeFit.note ?? '');
  const [environment, setEnvironment] = useState<WorkEnvironmentPreferences>(profile.environment ?? {});
  const [autonomy, setAutonomy] = useState<WorkAutonomyPreferences>(profile.autonomy ?? {});
  const [scheduleNote, setScheduleNote] = useState(profile.lifestyle.scheduleNote ?? '');
  const [approved, setApproved] = useState(work?.shareable.approved ?? false);
  const [locationMode, setLocationMode] = useState(work?.shareable.locationMode ?? null);
  const [activitiesSought, setActivitiesSought] = useState((work?.shareable.activitiesSought ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const primary = primaryWorkContext(work?.contexts ?? []);
  const patterns = deriveWorkJoyPatterns(joyEntriesForContext(work?.joyEntries ?? [], primary?.id));

  const toggleValue = (value: (typeof WORK_VALUES)[number]) => {
    setValues((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveWorkFulfillmentProfile({
        profileId,
        currentRoleNote: profile.currentRoleNote ?? null,
        enjoyment: {
          enjoyedActivities: enjoyed.split(',').map((item) => item.trim()).filter(Boolean),
          enjoyedTasks: profile.enjoyment?.enjoyedTasks ?? [],
          dislikedActivities: profile.enjoyment?.dislikedActivities ?? [],
          drainingTasks: draining.split(',').map((item) => item.trim()).filter(Boolean),
        },
        values,
        environment,
        autonomy,
        lifestyle: { ...profile.lifestyle, scheduleNote: scheduleNote || undefined },
        purposeFit: { ...profile.purposeFit, note: purpose || undefined },
        createdAt: 'createdAt' in profile ? String(profile.createdAt) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await saveShareablePreferences({
        profileId,
        approved,
        activitiesSought: activitiesSought.split(',').map((item) => item.trim()).filter(Boolean),
        roleTypesSought: work?.shareable.roleTypesSought ?? [],
        environment: approved ? environment : {},
        locationMode,
        scheduleNote: approved ? scheduleNote || null : null,
        updatedAt: new Date().toISOString(),
      });
      toast.success(t('happiness.actionSaved'));
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">{t('happiness.work.valuesTitle')}</legend>
        {WORK_VALUES.map((value) => (
          <HappinessChoiceButton key={value} selected={values.includes(value)} onClick={() => toggleValue(value)}>
            {t(`happiness.work.values.${value}`)}
          </HappinessChoiceButton>
        ))}
      </fieldset>
      <label className="block space-y-1 text-sm">
        <span className="text-foreground">{t('happiness.work.recs.increaseFulfilling.title')}</span>
        <Input value={enjoyed} onChange={(event) => setEnjoyed(event.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-foreground">{t('happiness.work.recs.reduceDraining.title')}</span>
        <Input value={draining} onChange={(event) => setDraining(event.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-foreground">{t('happiness.work.dimensionPrompts.meaning_purpose')}</span>
        <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
      </label>

      <p className="text-sm font-medium text-foreground">{t('happiness.work.envTitle')}</p>
      <AxisChoices
        t={t}
        legend={t('happiness.work.envAxes.individualVsTeam')}
        value={environment.individualVsTeam}
        options={['individual', 'mixed', 'team']}
        prefix="happiness.work.envPick"
        onChange={(individualVsTeam) => setEnvironment((current) => ({ ...current, individualVsTeam }))}
      />
      <AxisChoices
        t={t}
        legend={t('happiness.work.envAxes.remoteVsOnsite')}
        value={environment.remoteVsOnsite}
        options={['remote', 'hybrid', 'onsite']}
        prefix="happiness.work.locations"
        onChange={(remoteVsOnsite) => setEnvironment((current) => ({ ...current, remoteVsOnsite }))}
      />
      <AxisChoices
        t={t}
        legend={t('happiness.work.envAxes.structuredVsFlexible')}
        value={environment.structuredVsFlexible}
        options={['structured', 'mixed', 'flexible']}
        prefix="happiness.work.envPick"
        onChange={(structuredVsFlexible) => setEnvironment((current) => ({ ...current, structuredVsFlexible }))}
      />

      <p className="text-sm font-medium text-foreground">{t('happiness.work.autonomyTitle')}</p>
      <AxisChoices
        t={t}
        legend={t('happiness.work.autonomyAxes.methods')}
        value={autonomy.methods}
        options={['low', 'moderate', 'high']}
        prefix="happiness.work.autonomyPick"
        onChange={(methods) => setAutonomy((current) => ({ ...current, methods }))}
      />
      <AxisChoices
        t={t}
        legend={t('happiness.work.autonomyAxes.schedule')}
        value={autonomy.schedule}
        options={['low', 'moderate', 'high']}
        prefix="happiness.work.autonomyPick"
        onChange={(schedule) => setAutonomy((current) => ({ ...current, schedule }))}
      />
      <label className="block space-y-1 text-sm">
        <span className="text-foreground">{t('happiness.work.lifestyleSchedule')}</span>
        <Input value={scheduleNote} onChange={(event) => setScheduleNote(event.target.value)} />
      </label>

      {patterns.length ? (
        <Card className="space-y-2 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{t('happiness.work.patternsTitle')}</p>
          {patterns.map((pattern) => (
            <p key={`${pattern.tag}-${pattern.kind}`} className="text-sm text-muted-foreground">
              {t(`happiness.work.${pattern.phraseKey}`, { tag: pattern.tag.replace(/_/g, ' ') })}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">{t('happiness.work.notACalling')}</p>
        </Card>
      ) : null}

      <Card className="space-y-3 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.shareableTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('happiness.work.shareableHint')}</p>
        <p className="text-xs text-muted-foreground">{t('happiness.work.shareableNotPrivateSource')}</p>
        <HappinessChoiceButton selected={approved} onClick={() => setApproved((current) => !current)}>
          {t('happiness.work.approveShareable')}
        </HappinessChoiceButton>
        <Input
          value={activitiesSought}
          onChange={(event) => setActivitiesSought(event.target.value)}
          placeholder={t('happiness.work.whatDoing')}
        />
        {WORK_LOCATION_MODES.map((value) => (
          <HappinessChoiceButton key={value} selected={locationMode === value} onClick={() => setLocationMode(value)}>
            {t(`happiness.work.locations.${value}`)}
          </HappinessChoiceButton>
        ))}
      </Card>

      <p className="text-sm text-muted-foreground">{t('happiness.work.capabilitiesHint')}</p>
      <Link to="/profile" className="text-sm text-primary underline-offset-4 hover:underline">
        {t('happiness.work.openProfileCapabilities')}
      </Link>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? t('common.saving') : t('common.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onExplore}>
          {t('happiness.work.exploreTitle')}
        </Button>
      </div>
    </div>
  );
}
