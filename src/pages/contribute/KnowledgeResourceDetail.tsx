import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  attributionLabel,
  canManageKnowledgeSpace,
  type KnowledgeAttributionIdentity,
  type KnowledgeResource,
  type KnowledgeSpace,
} from '@/lib/knowledge';
import {
  getKnowledgeResource,
  getKnowledgeSpace,
  listResourceAttributionIdentities,
  setKnowledgeResourceStatus,
} from '@/lib/knowledge-api';
import { getSolutionRecordForChallenge } from '@/lib/challenges-api';
import type { SolutionRecord } from '@/lib/challenges';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { toast } from 'sonner';

export default function KnowledgeResourceDetail() {
  const { spaceId, resourceId } = useParams<{ spaceId: string; resourceId: string }>();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';

  const [space, setSpace] = useState<KnowledgeSpace | null>(null);
  const [resource, setResource] = useState<KnowledgeResource | null>(null);
  const [attributions, setAttributions] = useState<KnowledgeAttributionIdentity[]>([]);
  const [solution, setSolution] = useState<SolutionRecord | null>(null);
  const [ownedLinkedIds, setOwnedLinkedIds] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!spaceId || !resourceId) return;
    setLoading(true);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setOwnedLinkedIds(linked);
      const [spaceRow, resourceRow] = await Promise.all([
        getKnowledgeSpace(spaceId),
        getKnowledgeResource(resourceId),
      ]);
      setSpace(spaceRow);
      setResource(resourceRow);
      if (resourceRow) {
        setAttributions(await listResourceAttributionIdentities(resourceRow.id));
        if (resourceRow.reviewerNotes || resourceRow.sourceEvidence || resourceRow.uncertaintyNotes) {
          setShowDetails(true);
        }
        if (resourceRow.challengeId) {
          setSolution(await getSolutionRecordForChallenge(resourceRow.challengeId));
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

  const manages = space
    ? canManageKnowledgeSpace({
        space,
        currentProfileId: profileId,
        ownedLinkedProfileIds: ownedLinkedIds,
      })
    : false;

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!resource || !space) {
    return (
      <AppLayout>
        <div className="space-y-4 px-4 py-6">
          <AppPageHeader title={t('contribute.knowledge.missingResource')} fallbackPath="/contribute/knowledge" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 px-4 py-6">
        <AppPageHeader
          title={resource.title}
          subtitle={resource.summary}
          fallbackPath={`/contribute/knowledge/${space.id}`}
          actions={
            manages ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/contribute/knowledge/${space.id}/resources/${resource.id}/edit`)}
              >
                {t('common.edit')}
              </Button>
            ) : null
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.knowledge.resourceType.${resource.resourceType}`)}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {t(`contribute.knowledge.resourceStatus.${resource.status}`)}
          </Badge>
        </div>
        {attributions.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {attributions.map((row) => attributionLabel(row)).join(' · ')}
          </p>
        ) : null}
        <Card className="space-y-3 border-border/70 bg-card/95 p-4">
          {resource.bodyText ? <p className="whitespace-pre-wrap text-sm">{resource.bodyText}</p> : null}
          {resource.externalUrl ? (
            <a href={resource.externalUrl} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
              {resource.externalUrl}
            </a>
          ) : null}
          {resource.relatedSkills.length > 0 ? (
            <p className="text-xs text-muted-foreground">{resource.relatedSkills.join(' · ')}</p>
          ) : null}
          {resource.solutionRecordId && solution ? (
            <p className="text-sm text-muted-foreground">
              {t('contribute.knowledge.fromSolvedProblem')}{' '}
              <Link to={`/contribute/challenges/${solution.challengeId}`} className="underline">
                {solution.implementedSolution}
              </Link>
            </p>
          ) : null}
        </Card>
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {t('contribute.knowledge.moreDetails')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 text-sm text-muted-foreground">
            {resource.sourceEvidence ? <p>{resource.sourceEvidence}</p> : null}
            {resource.reviewerNotes ? <p>{resource.reviewerNotes}</p> : null}
            {resource.uncertaintyNotes ? <p>{resource.uncertaintyNotes}</p> : null}
          </CollapsibleContent>
        </Collapsible>
        {manages ? (
          <div className="flex flex-wrap gap-2">
            {resource.status === 'draft' ? (
              <Button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void setKnowledgeResourceStatus(resource.id, 'shared')
                    .then(() => load())
                    .finally(() => setBusy(false));
                }}
              >
                {t('contribute.knowledge.publish')}
              </Button>
            ) : null}
            {resource.status === 'shared' ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void setKnowledgeResourceStatus(resource.id, 'reviewed')
                    .then(() => {
                      toast.success(t('contribute.knowledge.validated'));
                      return load();
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {t('contribute.knowledge.markReviewed')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
