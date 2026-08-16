import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { deleteAllHappinessData, deleteHappinessCheckIn, saveHappinessPrivacy } from '@/lib/happiness/api';
import { loadAggregateParticipation, saveAggregateParticipation } from '@/lib/happiness/aggregate/api';
import type { AggregateParticipation } from '@/lib/happiness/aggregate/types';
import { DOMAIN_LABEL_KEYS } from '@/lib/happiness/domains';
import { deleteFulfillmentPlan, listFulfillmentPlans } from '@/lib/happiness/fulfillment/api';
import type { FulfillmentPlan } from '@/lib/happiness/fulfillment/types';
import { HAPPINESS_PROHIBITED_USES } from '@/lib/happiness/privacy';
import { useHappinessWorkspace } from '@/lib/happiness/use-happiness';

import { HappinessShell } from './HappinessShell';

export default function HappinessPrivacy() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { result, reload } = useHappinessWorkspace(profile?.id);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<FulfillmentPlan[]>([]);
  const [aggregate, setAggregate] = useState<AggregateParticipation | null>(null);
  const privacy = result?.privacy;

  useEffect(() => {
    if (!profile?.id) return;
    void listFulfillmentPlans(profile.id).then(setPlans).catch(() => setPlans([]));
    void loadAggregateParticipation(profile.id).then(setAggregate).catch(() => setAggregate(null));
  }, [profile?.id, result?.actions.length]);

  const update = async (patch: Partial<{ checkinsEnabled: boolean; recommendationsEnabled: boolean; optionalSharingEnabled: boolean }>) => {
    if (!profile?.id || !privacy) return;
    setBusy(true);
    try {
      await saveHappinessPrivacy(profile.id, {
        checkinsEnabled: patch.checkinsEnabled ?? privacy.checkinsEnabled,
        recommendationsEnabled: patch.recommendationsEnabled ?? privacy.recommendationsEnabled,
        optionalSharingEnabled: patch.optionalSharingEnabled ?? privacy.optionalSharingEnabled,
      });
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const updateAggregate = async (enabled: boolean) => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      setAggregate(await saveAggregateParticipation(profile.id, enabled));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const erase = async () => {
    if (!profile?.id) return;
    if (!window.confirm(t('happiness.deleteConfirm'))) return;
    setBusy(true);
    try {
      await deleteAllHappinessData(profile.id);
      toast.success(t('happiness.deleted'));
      await reload();
      setPlans([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <HappinessShell titleKey="happiness.privacyTitle" subtitle={t('happiness.privacySubtitle')} fallbackPath="/happiness">
      <Card className="space-y-3 rounded-2xl border-border/70 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{t('happiness.privacyNeverUsed')}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {HAPPINESS_PROHIBITED_USES.map((use) => (
            <li key={use}>{t(`happiness.prohibited.${use}`)}</li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 rounded-2xl border-border/70 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('happiness.disableCheckins')}</p>
            <p className="text-xs text-muted-foreground">{t('happiness.disableCheckinsHint')}</p>
          </div>
          <Switch
            checked={privacy?.checkinsEnabled !== false}
            disabled={busy || !privacy}
            onCheckedChange={(checked) => void update({ checkinsEnabled: checked })}
            aria-label={t('happiness.disableCheckins')}
          />
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('happiness.enableRecommendations')}</p>
            <p className="text-xs text-muted-foreground">{t('happiness.enableRecommendationsHint')}</p>
          </div>
          <Switch
            checked={privacy?.recommendationsEnabled !== false}
            disabled={busy || !privacy}
            onCheckedChange={(checked) => void update({ recommendationsEnabled: checked })}
            aria-label={t('happiness.enableRecommendations')}
          />
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('happiness.optionalSharing')}</p>
            <p className="text-xs text-muted-foreground">{t('happiness.optionalSharingHint')}</p>
          </div>
          <Switch
            checked={privacy?.optionalSharingEnabled === true}
            disabled={busy || !privacy}
            onCheckedChange={(checked) => void update({ optionalSharingEnabled: checked })}
            aria-label={t('happiness.optionalSharing')}
          />
        </div>
      </Card>

      <Card className="space-y-3 rounded-2xl border-border/70 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('happiness.aggregateParticipation')}</p>
            <p className="text-xs text-muted-foreground">{t('happiness.aggregateParticipationHint')}</p>
          </div>
          <Switch
            checked={aggregate?.enabled === true}
            disabled={busy || !profile}
            onCheckedChange={(checked) => void updateAggregate(checked)}
            aria-label={t('happiness.aggregateParticipation')}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('happiness.aggregateParticipationWithdraw')}</p>
        <Link to="/wellbeing-insights" className="text-sm text-primary underline-offset-4 hover:underline">
          Wellbeing Insights
        </Link>
      </Card>

      <Card className="space-y-3 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.collectedTitle')}</p>
        <p className="text-sm text-muted-foreground">
          {t('happiness.collectedSummary', {
            checkins: result?.checkIns.length ?? 0,
            reviews: (result?.reviews.length ?? 0) + (result?.pulses.length ?? 0),
            actions: result?.actions.length ?? 0,
          })}
        </p>
        {plans.length ? (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li key={plan.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{t(DOMAIN_LABEL_KEYS[plan.domainKey])}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!profile?.id) return;
                    if (!window.confirm(t('happiness.plans.deletePlanConfirm'))) return;
                    await deleteFulfillmentPlan(profile.id, plan.id);
                    setPlans((current) => current.filter((row) => row.id !== plan.id));
                    await reload();
                  }}
                >
                  {t('happiness.plans.removePlan')}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="space-y-2">
          {(result?.checkIns ?? []).slice(0, 8).map((checkIn) => (
            <li key={checkIn.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t(`happiness.feelings.${checkIn.feeling}`)} · {checkIn.createdAt.slice(0, 10)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (!profile?.id) return;
                  await deleteHappinessCheckIn(profile.id, checkIn.id);
                  await reload();
                }}
              >
                {t('happiness.removeEntry')}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Button type="button" variant="destructive" disabled={busy} onClick={() => void erase()}>
        {t('happiness.deleteAll')}
      </Button>
    </HappinessShell>
  );
}
