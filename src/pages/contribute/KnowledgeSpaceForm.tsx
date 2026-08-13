import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createContributionProgram, listManagedPrograms } from '@/lib/challenges-api';
import type { ContributionProgram } from '@/lib/challenges';
import { listCurrentAreas } from '@/lib/classification';
import {
  createKnowledgeSpace,
  getKnowledgeSpace,
  setKnowledgeSpaceStatus,
  updateKnowledgeSpace,
} from '@/lib/knowledge-api';
import { canManageKnowledgeSpace, type KnowledgeSpace } from '@/lib/knowledge';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';

type FormState = {
  programId: string;
  newProgramTitle: string;
  newProgramSummary: string;
  title: string;
  summary: string;
  description: string;
  areaNodeId: string;
};

const emptyForm: FormState = {
  programId: '',
  newProgramTitle: '',
  newProgramSummary: '',
  title: '',
  summary: '',
  description: '',
  areaNodeId: 'none',
};

export default function KnowledgeSpaceForm() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const editing = Boolean(spaceId);
  const areas = useMemo(() => listCurrentAreas(), []);

  const [form, setForm] = useState(emptyForm);
  const [programs, setPrograms] = useState<ContributionProgram[]>([]);
  const [existing, setExisting] = useState<KnowledgeSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      const publisherIds = profileId ? [profileId, ...linked] : [];
      const managed = publisherIds.length > 0 ? await listManagedPrograms(publisherIds) : [];
      setPrograms(managed);
      if (!spaceId) {
        setForm((current) => ({ ...current, programId: current.programId || managed[0]?.id || '' }));
        setShowNewProgram(managed.length === 0);
        setLoading(false);
        return;
      }
      const row = await getKnowledgeSpace(spaceId);
      if (!row) {
        setExisting(null);
        return;
      }
      if (!canManageKnowledgeSpace({ space: row, currentProfileId: profileId, ownedLinkedProfileIds: linked })) {
        setUnauthorized(true);
        setExisting(row);
        return;
      }
      setExisting(row);
      setForm({
        ...emptyForm,
        programId: row.programId,
        title: row.title,
        summary: row.summary,
        description: row.description ?? '',
        areaNodeId: row.areaNodeId ?? 'none',
      });
      if (row.description) setShowDetails(true);
    } catch {
      toast.error(tRef.current('contribute.knowledge.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId, spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (status: 'draft' | 'shared') => {
    if (form.title.trim().length < 3 || form.summary.trim().length < 3) {
      toast.error(t('contribute.knowledge.errors.title_required'));
      return;
    }
    setBusy(true);
    try {
      let programId = form.programId;
      if (!programId) {
        programId = await createContributionProgram({
          title: form.newProgramTitle,
          summary: form.newProgramSummary,
          status: 'active',
          programKind: 'shared_knowledge',
          areaNodeId: form.areaNodeId === 'none' ? null : form.areaNodeId,
        });
      }
      const payload = {
        programId,
        title: form.title,
        summary: form.summary,
        description: form.description || null,
        areaNodeId: form.areaNodeId === 'none' ? null : form.areaNodeId,
        status,
      };
      if (editing && spaceId) {
        await updateKnowledgeSpace(spaceId, payload);
        if (status === 'shared' && existing?.status === 'draft') {
          await setKnowledgeSpaceStatus(spaceId, 'shared');
        }
        toast.success(t('contribute.knowledge.saved'));
        navigate(`/contribute/knowledge/${spaceId}`);
        return;
      }
      const id = await createKnowledgeSpace(payload);
      toast.success(status === 'shared' ? t('contribute.knowledge.published') : t('contribute.knowledge.saved'));
      navigate(`/contribute/knowledge/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request_failed';
      toast.error(t(`contribute.knowledge.errors.${message}`) || t('contribute.knowledge.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (unauthorized || (editing && !existing)) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.knowledge.missingSpace')} fallbackPath="/contribute/knowledge" />
          <p className="text-sm text-muted-foreground">
            {unauthorized ? t('contribute.knowledge.unauthorized') : t('contribute.knowledge.missingSpaceBody')}
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={editing ? t('contribute.knowledge.editSpace') : t('contribute.knowledge.newSpace')}
          subtitle={t('contribute.knowledge.formHint')}
          fallbackPath="/contribute/knowledge"
        />
        <Card className="space-y-4 border-border/70 bg-card/95 p-4">
          <div className="space-y-2">
            <Label>{t('contribute.knowledge.programLabel')}</Label>
            {programs.length > 0 && !showNewProgram ? (
              <Select value={form.programId} onValueChange={(value) => setField('programId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {showNewProgram || programs.length === 0 ? (
              <div className="space-y-3">
                <Input
                  value={form.newProgramTitle}
                  onChange={(event) => setField('newProgramTitle', event.target.value)}
                  placeholder={t('contribute.knowledge.programTitle')}
                />
                <Textarea
                  value={form.newProgramSummary}
                  onChange={(event) => setField('newProgramSummary', event.target.value)}
                  placeholder={t('contribute.knowledge.programSummary')}
                  rows={2}
                />
              </div>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProgram(true)}>
                {t('contribute.knowledge.newProgram')}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ks-title">{t('contribute.knowledge.titleLabel')}</Label>
            <Input id="ks-title" value={form.title} onChange={(event) => setField('title', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ks-summary">{t('contribute.knowledge.summaryLabel')}</Label>
            <Textarea
              id="ks-summary"
              value={form.summary}
              onChange={(event) => setField('summary', event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('contribute.knowledge.areaLabel')}</Label>
            <Select value={form.areaNodeId} onValueChange={(value) => setField('areaNodeId', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('contribute.knowledge.areaNone')}</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.knowledge.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <Label htmlFor="ks-desc">{t('contribute.knowledge.descriptionLabel')}</Label>
            <Textarea
              id="ks-desc"
              className="mt-2"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              rows={4}
            />
          </CollapsibleContent>
        </Collapsible>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void save('draft')}>
            {t('contribute.knowledge.saveDraft')}
          </Button>
          <Button disabled={busy} onClick={() => void save('shared')}>
            {t('contribute.knowledge.publish')}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
