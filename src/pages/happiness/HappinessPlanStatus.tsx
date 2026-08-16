import { Button } from '@/components/ui/button';
import type { FulfillmentPlanStatus, PlanReminderPref } from '@/lib/happiness/fulfillment/types';

type Translate = (key: string) => string;

const REMINDERS: PlanReminderPref[] = ['none', 'weekly', 'chosen_date'];

export function HappinessPlanStatus({
  t,
  status,
  reminderPref,
  followUpAt,
  busy,
  onStatus,
  onReminder,
}: {
  t: Translate;
  status: FulfillmentPlanStatus;
  reminderPref: PlanReminderPref;
  followUpAt: string | null;
  busy: boolean;
  onStatus: (status: FulfillmentPlanStatus) => void;
  onReminder: (pref: PlanReminderPref, followUpAt: string | null) => void;
}) {
  const open = status === 'exploring' || status === 'active';
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t(`happiness.plans.statusHint.${status}`)}</p>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.plans.reminderHeading')}</legend>
        <p className="text-xs text-muted-foreground">{t('happiness.plans.reminderDeferred')}</p>
        {REMINDERS.map((pref) => (
          <button
            key={pref}
            type="button"
            disabled={busy}
            onClick={() =>
              onReminder(
                pref,
                pref === 'none' ? null : pref === 'weekly' ? new Date(Date.now() + 7 * 86_400_000).toISOString() : followUpAt ?? new Date(Date.now() + 14 * 86_400_000).toISOString(),
              )
            }
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${reminderPref === pref ? 'border-primary bg-primary/10' : 'border-border/70 bg-card'}`}
          >
            {t(`happiness.plans.reminder.${pref}`)}
          </button>
        ))}
        {reminderPref === 'chosen_date' ? (
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={followUpAt ? followUpAt.slice(0, 10) : ''}
            onChange={(event) => onReminder('chosen_date', event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : null)}
            aria-label={t('happiness.plans.reminder.chosen_date')}
          />
        ) : null}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {open ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus('paused')}>
            {t('happiness.plans.pause')}
          </Button>
        ) : null}
        {status === 'paused' ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => onStatus('active')}>
            {t('happiness.plans.resume')}
          </Button>
        ) : null}
        {status !== 'completed' && status !== 'stopped' ? (
          <>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus('completed')}>
              {t('happiness.plans.complete')}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onStatus('stopped')}>
              {t('happiness.plans.stop')}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
