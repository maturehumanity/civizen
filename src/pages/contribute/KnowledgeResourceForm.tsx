import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  KNOWLEDGE_RESOURCE_TYPES,
  canManageKnowledgeSpace,
  type KnowledgeResourceType,
} from '@/lib/knowledge';
import {
  createKnowledgeResource,
  getKnowledgeResource,
  getKnowledgeSpace,
  updateKnowledgeResource,
} from '@/lib/knowledge-api';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';

export default function KnowledgeResourceForm() {
  const { spaceId, resourceId } = useParams<{ spaceId: string; resourceId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const editing = Boolean(resourceId);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [resourceType, setResourceType] = useState<KnowledgeResourceType>('guide');
  const [bodyText, setBodyText] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [relatedSkills, setRelatedSkills] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [sourceEvidence, setSourceEvidence] = useState('');
  const [uncertaintyNotes, setUncertaintyNotes] = useState('');
  const [pathwayOrder, setPathwayOrder] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const fallback = `/contribute/knowledge/${spaceId ?? ''}`;

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      const space = await getKnowledgeSpace(spaceId);
      if (!space || !canManageKnowledgeSpace({ space, currentProfileId: profileId, ownedLinkedProfileIds: linked })) {
        setUnauthorized(true);
        return;
      }
      if (resourceId) {
        const row = await getKnowledgeResource(resourceId);
        if (row) {
          setTitle(row.title);
          setSummary(row.summary);
          setResourceType(row.resourceType);
          setBodyText(row.bodyText ?? '');
          setExternalUrl(row.externalUrl ?? '');
          setRelatedSkills(row.relatedSkills.join(', '));
          setReviewerNotes(row.reviewerNotes ?? '');
          setSourceEvidence(row.sourceEvidence ?? '');
          setUncertaintyNotes(row.uncertaintyNotes ?? '');
          setPathwayOrder(row.pathwayOrder != null ? String(row.pathwayOrder) : '');
          if (row.bodyText || row.externalUrl || row.reviewerNotes || row.uncertaintyNotes || row.pathwayOrder) {
            setShowDetails(true);
          }
        }
      }
    } catch {
      toast.error(tRef.current('contribute.knowledge.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId, resourceId, spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (status: 'draft' | 'shared') => {
    if (!spaceId || title.trim().length < 3 || summary.trim().length < 3) {
      toast.error(t('contribute.knowledge.errors.title_required'));
      return;
    }
    setBusy(true);
    try {
      const attributions = [
        { attributionKind: 'person' as const, profileId },
        ...(organizationName.trim()
          ? [{ attributionKind: 'organization' as const, organizationName: organizationName.trim() }]
          : []),
      ];
      const payload = {
        spaceId,
        title,
        summary,
        resourceType,
        bodyText: bodyText || null,
        externalUrl: externalUrl || null,
        relatedSkills: relatedSkills.split(',').map((item) => item.trim()).filter(Boolean),
        status,
        reviewerNotes: reviewerNotes || null,
        sourceEvidence: sourceEvidence || null,
        uncertaintyNotes: uncertaintyNotes || null,
        pathwayOrder: pathwayOrder.trim() ? Number(pathwayOrder) : null,
        attributions,
      };
      if (editing && resourceId) {
        await updateKnowledgeResource(resourceId, payload);
        toast.success(t('contribute.knowledge.saved'));
        navigate(`/contribute/knowledge/${spaceId}/resources/${resourceId}`);
        return;
      }
      const id = await createKnowledgeResource(payload);
      toast.success(t('contribute.knowledge.saved'));
      navigate(`/contribute/knowledge/${spaceId}/resources/${id}`);
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

  if (unauthorized) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.knowledge.unauthorized')} fallbackPath={fallback} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={editing ? t('contribute.knowledge.editResource') : t('contribute.knowledge.newResource')}
          subtitle={t('contribute.knowledge.resourceHint')}
          fallbackPath={fallback}
        />
        <Card className="space-y-4 border-border/70 bg-card/95 p-4">
          <div className="space-y-2">
            <Label htmlFor="kr-title">{t('contribute.knowledge.titleLabel')}</Label>
            <Input id="kr-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kr-summary">{t('contribute.knowledge.summaryLabel')}</Label>
            <Textarea id="kr-summary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>{t('contribute.knowledge.typeLabel')}</Label>
            <Select value={resourceType} onValueChange={(value) => setResourceType(value as KnowledgeResourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`contribute.knowledge.resourceType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kr-org">{t('contribute.knowledge.organizationLabel')}</Label>
            <Input
              id="kr-org"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
            />
          </div>
        </Card>
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.knowledge.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <Textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              placeholder={t('contribute.knowledge.bodyLabel')}
              rows={5}
            />
            <Input
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
              placeholder={t('contribute.knowledge.urlLabel')}
            />
            <Input
              value={relatedSkills}
              onChange={(event) => setRelatedSkills(event.target.value)}
              placeholder={t('contribute.knowledge.skillsLabel')}
            />
            <Input
              value={pathwayOrder}
              onChange={(event) => setPathwayOrder(event.target.value)}
              placeholder={t('contribute.knowledge.pathwayOrder')}
            />
            <Textarea
              value={sourceEvidence}
              onChange={(event) => setSourceEvidence(event.target.value)}
              placeholder={t('contribute.knowledge.sourceLabel')}
              rows={2}
            />
            <Textarea
              value={reviewerNotes}
              onChange={(event) => setReviewerNotes(event.target.value)}
              placeholder={t('contribute.knowledge.reviewerNotes')}
              rows={2}
            />
            <Textarea
              value={uncertaintyNotes}
              onChange={(event) => setUncertaintyNotes(event.target.value)}
              placeholder={t('contribute.knowledge.uncertaintyLabel')}
              rows={2}
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
