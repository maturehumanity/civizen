import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  emptyDeclaredContext,
  loadDeclaredContext,
  saveDeclaredContext,
  type PersistedDeclaredContext,
} from '@/lib/civizen-declared-context';
import type { CivizenContextView } from '@/lib/civizen-context-model';

function csv(values: string[]): string {
  return values.join(', ');
}

function parseCsv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

type DeclaredContextEditorProps = {
  profileId: string;
  context: CivizenContextView;
  onSaved?: (declared: PersistedDeclaredContext) => void;
};

export function DeclaredContextEditor({ profileId, context, onSaved }: DeclaredContextEditorProps) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<PersistedDeclaredContext>(emptyDeclaredContext());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadDeclaredContext(profileId).then(setDraft);
  }, [profileId]);

  const save = async () => {
    setBusy(true);
    try {
      const next = await saveDeclaredContext(profileId, draft);
      setDraft(next);
      setSaved(true);
      onSaved?.(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-border/80 p-4" data-testid="declared-context-editor">
      <h2 className="text-base font-semibold">{t('profile.contributionsLedger.declaredContext')}</h2>
      <p className="text-sm text-muted-foreground">{t('profile.contributionsLedger.declaredContextHelp')}</p>
      <p className="text-xs text-muted-foreground">{t('profile.contributionsLedger.declaredByYou')}</p>
      <label className="block text-sm">
        {t('profile.contributionsLedger.interests')}
        <Input value={csv(draft.interests)} onChange={(e) => setDraft({ ...draft, interests: parseCsv(e.target.value) })} />
      </label>
      <label className="block text-sm">
        {t('profile.contributionsLedger.goals')}
        <Input value={csv(draft.goals)} onChange={(e) => setDraft({ ...draft, goals: parseCsv(e.target.value) })} />
      </label>
      <label className="block text-sm">
        {t('profile.contributionsLedger.contributionInterests')}
        <Input value={csv(draft.contributionInterests)} onChange={(e) => setDraft({ ...draft, contributionInterests: parseCsv(e.target.value) })} />
      </label>
      <label className="block text-sm">
        {t('profile.contributionsLedger.priorities')}
        <Input value={csv(draft.priorities)} onChange={(e) => setDraft({ ...draft, priorities: parseCsv(e.target.value) })} />
      </label>
      <Button type="button" disabled={busy} onClick={() => void save()}>{t('common.save')}</Button>
      {saved ? <p className="text-xs text-muted-foreground">{t('profile.contributionsLedger.declaredSaved')}</p> : null}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{t('profile.contributionsLedger.demonstratedByEvidence')}: {context.demonstrated.skills.join(', ') || t('profile.contributionsDetails.unknown')}</p>
        <p>{t('profile.contributionsLedger.inferredFocus')}: {context.currentFocus.functions.join(', ') || t('profile.contributionsDetails.unknown')}</p>
      </div>
    </section>
  );
}
