import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listBrowsableKnowledgeSpaces, listManagedKnowledgeSpaces } from '@/lib/knowledge-api';
import { publicSpaceStage, spaceCardAction, type KnowledgeSpace } from '@/lib/knowledge';
import { listCurrentAreas } from '@/lib/classification';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';

function SpaceCard({
  space,
  stageLabel,
  topic,
  actionLabel,
}: {
  space: KnowledgeSpace;
  stageLabel: string;
  topic?: string | null;
  actionLabel?: string;
}) {
  return (
    <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{space.title}</h3>
        <Badge variant="outline" className="shrink-0 rounded-full">
          {stageLabel}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{space.summary}</p>
      {topic ? <p className="mt-2 text-xs text-muted-foreground">{topic}</p> : null}
      {actionLabel ? <p className="mt-3 text-sm font-medium text-primary">{actionLabel}</p> : null}
    </Card>
  );
}

export default function KnowledgeSpaces() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';
  const areas = listCurrentAreas();

  const [openRows, setOpenRows] = useState<KnowledgeSpace[]>([]);
  const [managed, setManaged] = useState<KnowledgeSpace[]>([]);
  const [ownedLinkedIds, setOwnedLinkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const linked = profileId ? await listOwnedLinkedProfileIds(profileId) : [];
      setOwnedLinkedIds(linked);
      const publisherIds = profileId ? [profileId, ...linked] : [];
      const [browsable, managedRows] = await Promise.all([
        listBrowsableKnowledgeSpaces(),
        publisherIds.length > 0 ? listManagedKnowledgeSpaces(publisherIds) : Promise.resolve([]),
      ]);
      setOpenRows(browsable);
      setManaged(managedRows);
    } catch {
      setError(tRef.current('contribute.knowledge.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const drafts = managed.filter((row) => row.status === 'draft' || row.status === 'archived');
  const topicFor = (space: KnowledgeSpace) =>
    areas.find((area) => area.id === space.areaNodeId)?.displayName ?? null;

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('contribute.lanes.knowledge.title')}
          subtitle={t('contribute.knowledge.subtitle')}
          fallbackPath="/contribute"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
          }
          actions={
            profileId ? (
              <Button size="sm" onClick={() => navigate('/contribute/knowledge/new')}>
                <Plus className="mr-1 h-4 w-4" />
                {t('contribute.knowledge.create')}
              </Button>
            ) : null
          }
        />

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.knowledge.openTitle')}
          </h2>
          {!loading && openRows.length === 0 ? (
            <Card className="border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
              {t('contribute.knowledge.empty')}
            </Card>
          ) : (
            <div className="grid gap-3">
              {openRows.map((space) => {
                const action = spaceCardAction({
                  space,
                  currentProfileId: profileId,
                  ownedLinkedProfileIds: ownedLinkedIds,
                });
                return (
                  <Link key={space.id} to={`/contribute/knowledge/${space.id}`}>
                    <SpaceCard
                      space={space}
                      stageLabel={t(`contribute.knowledge.spaceStage.${publicSpaceStage(space.status)}`)}
                      topic={topicFor(space)}
                      actionLabel={
                        action === 'manage'
                          ? t('contribute.knowledge.managing')
                          : t('contribute.knowledge.cardAction.view')
                      }
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {drafts.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('contribute.knowledge.managedTitle')}
            </h2>
            <div className="grid gap-3">
              {drafts.map((space) => (
                <Link key={space.id} to={`/contribute/knowledge/${space.id}`}>
                  <SpaceCard
                    space={space}
                    stageLabel={t(`contribute.knowledge.spaceStage.${publicSpaceStage(space.status)}`)}
                    topic={topicFor(space)}
                    actionLabel={t('contribute.knowledge.cardAction.manage')}
                  />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}
