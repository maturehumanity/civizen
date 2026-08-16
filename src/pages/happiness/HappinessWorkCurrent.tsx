import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HAPPINESS_LEVELS, type HappinessLevel } from '@/lib/happiness/types';
import { saveWorkAssessment, saveWorkContext } from '@/lib/work-fulfillment/api';
import { WORK_ASSESSMENT_DIMENSIONS, WORK_LOCATION_MODES, WORK_TYPES, type WorkAssessmentDimension, type WorkContext, type WorkType } from '@/lib/work-fulfillment/types';
import { WORK_DIMENSION_PROMPTS } from '@/lib/work-fulfillment/assessment';
import { primaryWorkContext } from '@/lib/work-fulfillment/scope';
import type { WorkFulfillmentLoadResult } from '@/lib/work-fulfillment/workspace';

import { HappinessChoiceButton } from './HappinessShell';
import { WorkContextSelect } from './HappinessWorkContextSelect';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function WorkCurrentSection({
  t,
  profileId,
  work,
  onSaved,
}: {
  t: Translate;
  profileId: string;
  work: WorkFulfillmentLoadResult | null;
  onSaved: () => void;
}) {
  const [roleTitle, setRoleTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [workType, setWorkType] = useState<WorkType>('employed');
  const [isPrimary, setIsPrimary] = useState(!(work?.contexts ?? []).some((context) => context.isPrimary));
  const [locationMode, setLocationMode] = useState<(typeof WORK_LOCATION_MODES)[number] | null>(null);
  const [hours, setHours] = useState('');
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<WorkAssessmentDimension, HappinessLevel>>>({});
  const contexts = work?.contexts ?? [];
  const fallback = primaryWorkContext(contexts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const contextId = selectedId ?? fallback?.id ?? null;
  const assessing = contexts.find((context) => context.id === contextId) ?? fallback;
  const complete = WORK_ASSESSMENT_DIMENSIONS.every((dimension) => answers[dimension]);

  const saveContext = async () => {
    if (!roleTitle.trim() || busy) return;
    setBusy(true);
    try {
      await saveWorkContext(profileId, {
        roleTitle,
        organizationOrContext: organization,
        workType,
        startDate: null,
        hoursPattern: hours,
        locationMode,
        isPrimary,
        description: null,
        status: 'current',
      });
      toast.success(t('happiness.actionSaved'));
      setRoleTitle('');
      setOrganization('');
      setHours('');
      setIsPrimary(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (context: WorkContext) => {
    if (busy) return;
    setBusy(true);
    try {
      await saveWorkContext(profileId, { ...context, id: context.id, isPrimary: true });
      setSelectedId(context.id);
      toast.success(t('happiness.actionSaved'));
      setBusy(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const saveAssessment = async () => {
    if (!complete || busy) return;
    setBusy(true);
    try {
      await saveWorkAssessment(profileId, { workContextId: contextId, dimensions: answers });
      toast.success(t('happiness.reviewSaved'));
      setBusy(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {contexts.map((context) => (
        <Card key={context.id} className="space-y-2 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{context.roleTitle}</p>
          <p className="text-xs text-muted-foreground">
            {t(`happiness.work.types.${context.workType}`)}
            {context.isPrimary ? ` · ${t('happiness.work.primaryShort')}` : ''}
            {context.organizationOrContext ? ` · ${context.organizationOrContext}` : ''}
          </p>
          {!context.isPrimary && context.status === 'current' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              aria-label={t('happiness.work.makePrimaryNamed', { title: context.roleTitle })}
              onClick={() => void makePrimary(context)}
            >
              {t('happiness.work.makePrimary')}
            </Button>
          ) : null}
        </Card>
      ))}

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.addContext')}</p>
        <label className="block space-y-1 text-sm">
          <span className="text-foreground">{t('happiness.work.roleTitle')}</span>
          <Input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">{t('happiness.work.organization')}</span>
          <Input value={organization} onChange={(event) => setOrganization(event.target.value)} />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{t('happiness.work.workType')}</legend>
          {WORK_TYPES.map((value) => (
            <HappinessChoiceButton key={value} selected={workType === value} onClick={() => setWorkType(value)}>
              {t(`happiness.work.types.${value}`)}
            </HappinessChoiceButton>
          ))}
        </fieldset>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">{t('happiness.work.hours')}</span>
          <Input value={hours} onChange={(event) => setHours(event.target.value)} />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted-foreground">{t('happiness.work.location')}</legend>
          {WORK_LOCATION_MODES.map((value) => (
            <HappinessChoiceButton key={value} selected={locationMode === value} onClick={() => setLocationMode(value)}>
              {t(`happiness.work.locations.${value}`)}
            </HappinessChoiceButton>
          ))}
        </fieldset>
        <HappinessChoiceButton selected={isPrimary} onClick={() => setIsPrimary((current) => !current)}>
          {t('happiness.work.primary')}
        </HappinessChoiceButton>
        <Button type="button" onClick={() => void saveContext()} disabled={!roleTitle.trim() || busy}>
          {t('happiness.work.saveContext')}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.assessWork')}</p>
        <WorkContextSelect
          t={t}
          legendKey="happiness.work.assessingThisWork"
          contexts={contexts}
          value={contextId}
          onChange={setSelectedId}
        />
        {assessing ? (
          <p className="text-xs text-muted-foreground">{t('happiness.work.assessingNamed', { title: assessing.roleTitle })}</p>
        ) : null}
        {WORK_ASSESSMENT_DIMENSIONS.map((dimension) => (
          <fieldset key={dimension} className="space-y-2">
            <legend className="text-sm text-foreground">{t(WORK_DIMENSION_PROMPTS[dimension])}</legend>
            {HAPPINESS_LEVELS.map((level) => (
              <HappinessChoiceButton
                key={level}
                selected={answers[dimension] === level}
                onClick={() => setAnswers((current) => ({ ...current, [dimension]: level }))}
              >
                {t(`happiness.levels.${level}`)}
              </HappinessChoiceButton>
            ))}
          </fieldset>
        ))}
        <Button type="button" onClick={() => void saveAssessment()} disabled={!complete || busy}>
          {t('happiness.work.saveAssessment')}
        </Button>
      </div>
    </div>
  );
}
