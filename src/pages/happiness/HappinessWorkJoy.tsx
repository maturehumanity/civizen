import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { saveWorkJoyEntry } from '@/lib/work-fulfillment/api';
import { deriveWorkJoyPatterns, workJoyHasSufficientHistory } from '@/lib/work-fulfillment/joy-patterns';
import { joyEntriesForContext, primaryWorkContext } from '@/lib/work-fulfillment/scope';
import { WORK_ACTIVITY_TAGS, WORK_JOY_FEELINGS, type WorkJoyFeeling } from '@/lib/work-fulfillment/types';
import type { WorkFulfillmentLoadResult } from '@/lib/work-fulfillment/workspace';

import { HappinessChoiceButton } from './HappinessShell';
import { WorkContextSelect } from './HappinessWorkContextSelect';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function WorkJoySection({
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
  const [feeling, setFeeling] = useState<WorkJoyFeeling | null>(null);
  const [activity, setActivity] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const contexts = work?.contexts ?? [];
  const fallback = primaryWorkContext(contexts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const contextId = selectedId ?? fallback?.id ?? null;
  const scoped = joyEntriesForContext(work?.joyEntries ?? [], contextId);
  const patterns = deriveWorkJoyPatterns(scoped);

  const toggleTag = (tag: string) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const save = async () => {
    if (!feeling || busy) return;
    setBusy(true);
    try {
      await saveWorkJoyEntry(profileId, {
        feeling,
        activity,
        activityTags: tags,
        workContextId: contextId,
      });
      toast.success(t('happiness.work.joySaved'));
      setFeeling(null);
      setActivity('');
      setTags([]);
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
      <WorkContextSelect
        t={t}
        legendKey="happiness.work.joyForThisWork"
        contexts={contexts}
        value={contextId}
        onChange={setSelectedId}
      />
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-foreground">{t('happiness.work.howDidItFeel')}</legend>
        {WORK_JOY_FEELINGS.map((value) => (
          <HappinessChoiceButton key={value} selected={feeling === value} onClick={() => setFeeling(value)}>
            {t(`happiness.work.feelings.${value}`)}
          </HappinessChoiceButton>
        ))}
      </fieldset>

      {feeling ? (
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">{t('happiness.work.whatDoing')}</span>
            <Input value={activity} onChange={(event) => setActivity(event.target.value)} />
          </label>
          <p className="text-xs text-muted-foreground">{t('happiness.work.activityOptional')}</p>
          <div className="flex flex-wrap gap-2">
            {WORK_ACTIVITY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${tags.includes(tag) ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}
                onClick={() => toggleTag(tag)}
              >
                {t(`happiness.work.activities.${tag}`)}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => void save()} disabled={busy}>
            {t('happiness.work.saveJoy')}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.joyHistory')}</p>
        {scoped.length ? (
          scoped.slice(0, 8).map((entry) => {
            const context = contexts.find((item) => item.id === entry.workContextId);
            return (
              <Card key={entry.id} className="rounded-2xl border-border/70 p-3 text-sm">
                <p className="font-medium text-foreground">{t(`happiness.work.feelings.${entry.feeling}`)}</p>
                <p className="text-muted-foreground">{entry.activity || entry.activityTags.map((tag) => t(`happiness.work.activities.${tag}`)).join(', ') || '—'}</p>
                {context ? <p className="text-xs text-muted-foreground">{context.roleTitle}</p> : null}
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">{t('happiness.work.noJoyYet')}</p>
        )}
      </div>

      <Card className="space-y-2 rounded-2xl border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">{t('happiness.work.patternsTitle')}</p>
        {workJoyHasSufficientHistory(scoped) && patterns.length ? (
          <>
            {patterns.map((pattern) => (
              <p key={`${pattern.tag}-${pattern.kind}`} className="text-sm text-muted-foreground">
                {t(`happiness.work.${pattern.phraseKey}`, { tag: pattern.tag.replace(/_/g, ' ') })}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">{t('happiness.work.notACalling')}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('happiness.work.patternsNeedMore')}</p>
        )}
      </Card>
    </div>
  );
}
