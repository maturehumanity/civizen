import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ACTION_OUTCOME_RATINGS } from '@/lib/happiness/types';
import { recordActionOutcome } from '@/lib/happiness/api';
import { saveWorkFollowUp, updateWorkInterventionStatus } from '@/lib/work-fulfillment/persist';
import { WORK_JOY_FEELINGS, type WorkIntervention, type WorkInterventionStatus, type WorkJoyFeeling } from '@/lib/work-fulfillment/types';
import type { WorkFulfillmentLoadResult } from '@/lib/work-fulfillment/workspace';

import { HappinessChoiceButton } from './HappinessShell';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function WorkTrackedActions({
  t,
  profileId,
  work,
  busy,
  setBusy,
  helped,
  setHelped,
  nowFeeling,
  setNowFeeling,
  onSaved,
}: {
  t: Translate;
  profileId: string;
  work: WorkFulfillmentLoadResult | null;
  busy: boolean;
  setBusy: (value: boolean) => void;
  helped: (typeof ACTION_OUTCOME_RATINGS)[number] | null;
  setHelped: (value: (typeof ACTION_OUTCOME_RATINGS)[number]) => void;
  nowFeeling: WorkJoyFeeling | null;
  setNowFeeling: (value: WorkJoyFeeling) => void;
  onSaved: () => void;
}) {
  const interventions = work?.interventions ?? [];
  const followUps = work?.followUps ?? [];
  const awaitingFollowUp = interventions.find(
    (item) => item.status === 'completed' && item.actionId && !followUps.some((row) => row.actionId === item.actionId),
  );

  const setStatus = async (intervention: WorkIntervention, status: WorkInterventionStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateWorkInterventionStatus(profileId, intervention.id, status);
      toast.success(t('happiness.actionSaved'));
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {interventions.slice(0, 5).map((intervention) => {
        const action = work?.actions.find((item) => item.id === intervention.actionId);
        return (
          <Card key={intervention.id} className="space-y-2 rounded-2xl border-border/70 p-4">
            <p className="text-sm font-medium text-foreground">{action?.title ?? intervention.desiredChange}</p>
            <p className="text-xs text-muted-foreground">{t(`happiness.work.actionStatus.${intervention.status}`)}</p>
            {intervention.status === 'planned' ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => void setStatus(intervention, 'in_progress')}>
                {t('happiness.work.startAction')}
              </Button>
            ) : null}
            {intervention.status === 'in_progress' ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => void setStatus(intervention, 'completed')}>
                {t('happiness.work.completeAction')}
              </Button>
            ) : null}
          </Card>
        );
      })}

      {awaitingFollowUp?.actionId ? (
        <Card className="space-y-3 rounded-2xl border-border/70 p-4">
          <p className="text-sm font-medium text-foreground">{t('happiness.work.followUpTitle')}</p>
          {ACTION_OUTCOME_RATINGS.map((value) => (
            <HappinessChoiceButton key={value} selected={helped === value} onClick={() => setHelped(value)}>
              {t(`happiness.helped.${value}`)}
            </HappinessChoiceButton>
          ))}
          <p className="text-sm font-medium text-foreground">{t('happiness.work.howFeelsNow')}</p>
          {WORK_JOY_FEELINGS.map((value) => (
            <HappinessChoiceButton key={value} selected={nowFeeling === value} onClick={() => setNowFeeling(value)}>
              {t(`happiness.work.feelings.${value}`)}
            </HappinessChoiceButton>
          ))}
          <Button
            type="button"
            disabled={!helped || busy}
            onClick={() => {
              if (!helped || !awaitingFollowUp.actionId) return;
              void (async () => {
                setBusy(true);
                try {
                  await recordActionOutcome(profileId, awaitingFollowUp.actionId!, helped);
                  await saveWorkFollowUp(profileId, {
                    actionId: awaitingFollowUp.actionId,
                    changeKind: 'role_redesign',
                    helped,
                    workJoyFeeling: nowFeeling,
                  });
                  toast.success(t('happiness.followUpSaved'));
                  onSaved();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {t('happiness.work.saveFollowUp')}
          </Button>
        </Card>
      ) : null}

      {followUps.slice(0, 3).map((row) => (
        <p key={row.id} className="text-sm text-muted-foreground">
          {row.helped ? t('happiness.work.outcomeRecorded', { rating: t(`happiness.helped.${row.helped}`) }) : t('happiness.work.saveFollowUp')}
        </p>
      ))}
    </>
  );
}
