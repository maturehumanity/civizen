import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { recordHappinessAction, saveHappinessCause } from '@/lib/happiness/api';
import { CAUSE_TAGS, causeGroupKey, causeTagKey, isCauseTag } from '@/lib/happiness/causes';
import { DOMAIN_LABEL_KEYS } from '@/lib/happiness/domains';
import { createFulfillmentPlan, listRecommendationFeedback, savePlanFactor, saveRecommendationFeedback, linkPlanIntervention } from '@/lib/happiness/fulfillment/api';
import { causeGroupForDomain, helpfulnessFromHistory, hypothesisKeysFor, observedFactorTagsFromCheckIns, recommendForPlan, recommendationForKey } from '@/lib/happiness/fulfillment/engine';
import { interventionByKey, isCommunitySystemPath } from '@/lib/happiness/fulfillment/library';
import { FULFILLMENT_LIBRARY_VERSION, FULFILLMENT_RECOMMENDATION_MODEL, type PlanReminderPref, type RecommendationFeedbackKind } from '@/lib/happiness/fulfillment/types';
import { marketJobsPrefillFromShareable } from '@/lib/happiness/fulfillment/jobs-bridge';
import { integrationTargetForRecommendationPath } from '@/lib/happiness/integrations';
import { followUpAtFromTiming } from '@/lib/happiness/recommendations';
import { HAPPINESS_CAUSE_GROUPS, HAPPINESS_DOMAINS, type FollowUpTiming, type HappinessCauseGroup, type HappinessDomainId } from '@/lib/happiness/types';
import { useHappinessWorkspace } from '@/lib/happiness/use-happiness';
import { loadShareablePreferences } from '@/lib/work-fulfillment/api';

import { HappinessFulfillmentPlan } from './HappinessFulfillmentPlan';
import { HappinessChoiceButton, HappinessShell } from './HappinessShell';
import { WorkDomainDelegate } from './WorkDomainDelegate';

const FEEDBACK_ACTIONS: RecommendationFeedbackKind[] = ['not_relevant', 'tried_before', 'not_now', 'saved_later'];

function reminderFromChoice(choice: PlanReminderPref | 'later'): { reminderPref: PlanReminderPref; followUpAt: string | null; followUpTiming: FollowUpTiming } {
  if (choice === 'none') return { reminderPref: 'none', followUpAt: null, followUpTiming: 'two_weeks' };
  if (choice === 'weekly') return { reminderPref: 'weekly', followUpAt: followUpAtFromTiming('one_week'), followUpTiming: 'one_week' };
  return { reminderPref: 'chosen_date', followUpAt: followUpAtFromTiming('two_weeks'), followUpTiming: 'two_weeks' };
}

export default function HappinessImprove() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { result, reload } = useHappinessWorkspace(profile?.id);
  const planId = searchParams.get('plan');
  const requested = searchParams.get('domain');
  const requestedDomain = (HAPPINESS_DOMAINS as readonly string[]).includes(requested ?? '') ? (requested as HappinessDomainId) : null;
  const [pickedDomain, setPickedDomain] = useState<HappinessDomainId | null>(requestedDomain);
  const [changeArea, setChangeArea] = useState(!requestedDomain);
  const domain = pickedDomain ?? result?.view.attentionDomains.find((item) => item !== 'work_fulfillment') ?? requestedDomain ?? 'time_life_balance';
  const [group, setGroup] = useState<HappinessCauseGroup | null>(() => causeGroupForDomain(requestedDomain ?? domain));
  const [cause, setCause] = useState<string | null>(null);
  const [causeNote, setCauseNote] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [reminderChoice, setReminderChoice] = useState<PlanReminderPref | 'later'>('weekly');
  const [busy, setBusy] = useState(false);
  const [jobsPath, setJobsPath] = useState('/market?section=jobs');
  const [sessionHidden, setSessionHidden] = useState<string[]>([]);
  const [storedFeedback, setStoredFeedback] = useState<{ interventionKey: string; feedback: RecommendationFeedbackKind }[]>([]);
  const recommendationsEnabled = result?.privacy.recommendationsEnabled !== false;

  useEffect(() => {
    if (!profile?.id) return;
    void loadShareablePreferences(profile.id).then((prefs) => setJobsPath(marketJobsPrefillFromShareable(prefs).path)).catch(() => undefined);
    void listRecommendationFeedback(profile.id)
      .then((rows) => setStoredFeedback(rows.map((row) => ({ interventionKey: row.interventionKey, feedback: row.feedback }))))
      .catch(() => undefined);
  }, [profile?.id]);

  const memory = helpfulnessFromHistory(result?.actions ?? [], result?.outcomes ?? []);
  const suggestions = useMemo(() => {
    if (!recommendationsEnabled) return [];
    const observed = observedFactorTagsFromCheckIns(domain, result?.checkIns ?? [], result?.causes ?? []);
    const factorTags = [...(cause ? [cause] : []), ...observed];
    return recommendForPlan({
      domain,
      causeGroup: group,
      factorTags,
      factorCertainty: {
        ...(cause ? { [cause]: 'member_confirmed' as const } : {}),
        ...Object.fromEntries(observed.map((tag) => [tag, 'observed_pattern' as const])),
        ...Object.fromEntries(hypothesisKeysFor(domain, cause).map((tag) => [tag, 'hypothesis' as const])),
      },
      suppressedKeys: sessionHidden,
      feedback: storedFeedback,
      previouslyHelped: memory.previouslyHelped,
      previouslyUnhelpful: memory.previouslyUnhelpful,
    });
  }, [cause, domain, group, memory.previouslyHelped, memory.previouslyUnhelpful, recommendationsEnabled, result?.checkIns, result?.causes, sessionHidden, storedFeedback]);

  const savedLater = storedFeedback
    .filter((row) => row.feedback === 'saved_later')
    .map((row) => interventionByKey(row.interventionKey))
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.domains.includes(domain)));

  if (planId && profile?.id) {
    return (
      <HappinessShell titleKey="happiness.improveTitle" subtitle={t('happiness.plans.planSubtitle')} fallbackPath="/happiness?section=improvement">
        <HappinessFulfillmentPlan t={t} profileId={profile.id} planId={planId} actions={result?.actions ?? []} outcomes={result?.outcomes ?? []} onReload={reload} />
      </HappinessShell>
    );
  }

  const takeSuggestion = async (key: string) => {
    if (!profile?.id || busy) return;
    const suggestion = suggestions.find((row) => row.key === key) ?? recommendationForKey(key, domain);
    if (!suggestion) return;
    setBusy(true);
    try {
      if (group && cause && isCauseTag(group, cause)) {
        await saveHappinessCause(profile.id, { sourceKind: 'improve', domain, group, category: cause, note: causeNote });
      }
      const reminder = reminderFromChoice(reminderChoice);
      const plan = await createFulfillmentPlan(profile.id, {
        domainKey: domain,
        title: t(DOMAIN_LABEL_KEYS[domain]),
        concern: causeNote || cause,
        desiredOutcome,
        reminderPref: reminder.reminderPref,
        followUpAt: reminder.followUpAt,
      });
      if (cause) await savePlanFactor(profile.id, plan.id, { factorKey: cause, certaintyType: 'member_confirmed', sourceType: 'member', note: causeNote });
      for (const tag of observedFactorTagsFromCheckIns(domain, result?.checkIns ?? [], result?.causes ?? []).filter((item) => item !== cause)) {
        await savePlanFactor(profile.id, plan.id, { factorKey: tag, certaintyType: 'observed_pattern', sourceType: 'checkin_pattern' });
      }
      for (const tag of hypothesisKeysFor(domain, cause)) {
        await savePlanFactor(profile.id, plan.id, { factorKey: tag, certaintyType: 'hypothesis', sourceType: 'recommendation' });
      }
      const why = suggestion.why.map((item) => t(`happiness.plans.why.${item.kind}`)).join(' ');
      const action = await recordHappinessAction(profile.id, {
        planId: plan.id,
        domain,
        kind: suggestion.kind,
        title: t(suggestion.intervention.titleKey),
        why,
        relatedPath: suggestion.intervention.relatedPath,
        followUpTiming: reminder.followUpTiming,
        interventionKey: suggestion.key,
        libraryVersion: FULFILLMENT_LIBRARY_VERSION,
        recommendationModel: FULFILLMENT_RECOMMENDATION_MODEL,
        status: 'planned',
      });
      await linkPlanIntervention(profile.id, plan.id, { interventionKey: suggestion.key, libraryVersion: FULFILLMENT_LIBRARY_VERSION, actionId: action.id, whyShown: why });
      await saveRecommendationFeedback(profile.id, { interventionKey: suggestion.key, feedback: 'accepted', planId: plan.id });
      toast.success(t('happiness.actionSaved'));
      await reload();
      navigate(`/happiness/improve?plan=${plan.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('happiness.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const hideSuggestion = async (key: string, feedback: RecommendationFeedbackKind) => {
    if (!profile?.id) return;
    setSessionHidden((current) => [...current, key]);
    setStoredFeedback((current) => [...current, { interventionKey: key, feedback }]);
    await saveRecommendationFeedback(profile.id, { interventionKey: key, feedback });
    toast.message(t('happiness.dismissedLocal'));
  };

  return (
    <HappinessShell titleKey="happiness.improveTitle" subtitle={t('happiness.improveSubtitle')} fallbackPath="/happiness">
      {changeArea ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.chooseArea')}</legend>
          {HAPPINESS_DOMAINS.map((value) => (
            <HappinessChoiceButton
              key={value}
              selected={domain === value}
              onClick={() => {
                setPickedDomain(value);
                setGroup(causeGroupForDomain(value));
                setCause(null);
              }}
            >
              {t(DOMAIN_LABEL_KEYS[value])}
            </HappinessChoiceButton>
          ))}
        </fieldset>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{t('happiness.plans.improvingArea', { area: t(DOMAIN_LABEL_KEYS[domain]) })}</p>
          <Button type="button" size="sm" variant="ghost" onClick={() => setChangeArea(true)}>
            {t('happiness.plans.changeArea')}
          </Button>
        </div>
      )}

      {domain === 'work_fulfillment' ? <WorkDomainDelegate t={t} jobsPath={jobsPath} /> : null}

      {domain !== 'work_fulfillment' ? (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.whatIsAffecting')}</legend>
            {HAPPINESS_CAUSE_GROUPS.map((value) => (
              <HappinessChoiceButton key={value} selected={group === value} onClick={() => { setGroup(value); setCause(null); }}>
                {t(causeGroupKey(value))}
              </HappinessChoiceButton>
            ))}
          </fieldset>
          {group ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.moreSpecifically')}</legend>
              {CAUSE_TAGS[group].map((tag) => (
                <HappinessChoiceButton key={tag} selected={cause === tag} onClick={() => setCause(tag)}>
                  {t(causeTagKey(group, tag))}
                </HappinessChoiceButton>
              ))}
              <OutlinedField label={t('happiness.causeNote')}>
                <Textarea value={causeNote} onChange={(event) => setCauseNote(event.target.value)} placeholder={t('happiness.causeNote')} rows={2} />
              </OutlinedField>
            </fieldset>
          ) : null}
          <OutlinedField label={t('happiness.plans.betterLookLike')}>
            <Textarea value={desiredOutcome} onChange={(event) => setDesiredOutcome(event.target.value)} placeholder={t('happiness.plans.betterPlaceholder')} rows={2} />
          </OutlinedField>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.plans.reminderHeading')}</legend>
            <p className="text-xs text-muted-foreground">{t('happiness.plans.reminderDeferred')}</p>
            {(['none', 'weekly', 'chosen_date', 'later'] as const).map((value) => (
              <HappinessChoiceButton key={value} selected={reminderChoice === value} onClick={() => setReminderChoice(value)}>
                {t(`happiness.plans.reminder.${value}`)}
              </HappinessChoiceButton>
            ))}
          </fieldset>
          {recommendationsEnabled ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t('happiness.suggestions')}</p>
              <p className="text-xs text-muted-foreground">{t('happiness.suggestionsDisclaimer')}</p>
              {suggestions.map((suggestion) => {
                const target = integrationTargetForRecommendationPath(suggestion.intervention.relatedPath);
                return (
                  <Card key={suggestion.key} className="space-y-3 rounded-2xl border-border/70 p-4">
                    <p className="text-sm font-medium text-foreground">{t(suggestion.intervention.titleKey)}</p>
                    <p className="text-sm text-muted-foreground">{suggestion.why.map((item) => t(`happiness.plans.why.${item.kind}`)).join(' ')}</p>
                    {target ? (
                      <Link to={target.path} className="text-sm text-primary underline-offset-4 hover:underline">
                        {t(`happiness.integration.${target.kind}`)}
                      </Link>
                    ) : null}
                    {isCommunitySystemPath(suggestion.intervention.relatedPath) ? <p className="text-xs text-muted-foreground">{t('happiness.plans.communityCaution')}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void takeSuggestion(suggestion.key)}>
                        {t('happiness.recordAction')}
                      </Button>
                      {FEEDBACK_ACTIONS.map((kind) => (
                        <Button key={kind} type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void hideSuggestion(suggestion.key, kind)}>
                          {t(`happiness.plans.feedback.${kind}`)}
                        </Button>
                      ))}
                    </div>
                  </Card>
                );
              })}
              {savedLater.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t('happiness.plans.savedLaterHeading')}</p>
                  {savedLater.map((item) => (
                    <Card key={item.key} className="space-y-2 rounded-2xl border-border/70 p-4">
                      <p className="text-sm text-foreground">{t(item.titleKey)}</p>
                      <Button type="button" size="sm" disabled={busy} onClick={() => void takeSuggestion(item.key)}>
                        {t('happiness.recordAction')}
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('happiness.recommendationsDisabledHint')}</p>
          )}
        </>
      ) : null}
    </HappinessShell>
  );
}
