import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listBrowsableChallenges,
  listManagedChallenges,
} from '@/lib/challenges-api';
import {
  challengeCardAction,
  publicChallengeStage,
  type CommunityChallenge,
} from '@/lib/challenges';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';

function ChallengeCard({
  challenge,
  stageLabel,
  actionLabel,
}: {
  challenge: CommunityChallenge;
  stageLabel: string;
  actionLabel?: string;
}) {
  return (
    <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{challenge.title}</h3>
        <Badge variant="outline" className="shrink-0 rounded-full">
          {stageLabel}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{challenge.problemStatement}</p>
      {actionLabel ? <p className="mt-3 text-sm font-medium text-primary">{actionLabel}</p> : null}
    </Card>
  );
}

export default function CommunityChallenges() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';

  const [openRows, setOpenRows] = useState<CommunityChallenge[]>([]);
  const [managed, setManaged] = useState<CommunityChallenge[]>([]);
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
        listBrowsableChallenges(),
        publisherIds.length > 0 ? listManagedChallenges(publisherIds) : Promise.resolve([]),
      ]);
      setOpenRows(browsable);
      setManaged(managedRows);
    } catch {
      setError(tRef.current('contribute.challenges.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const drafts = managed.filter((row) => row.status === 'draft' || row.status === 'cancelled');

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('contribute.lanes.challenges.title')}
          subtitle={t('contribute.challenges.subtitle')}
          fallbackPath="/contribute"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Target className="h-7 w-7 text-accent" />
            </div>
          }
          actions={
            profileId ? (
              <Button size="sm" onClick={() => navigate('/contribute/challenges/new')}>
                <Plus className="mr-1 h-4 w-4" />
                {t('contribute.challenges.create')}
              </Button>
            ) : null
          }
        />

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.challenges.openTitle')}
          </h2>
          {!loading && openRows.length === 0 ? (
            <Card className="border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
              {t('contribute.challenges.empty')}
            </Card>
          ) : (
            <div className="grid gap-3">
              {openRows.map((challenge) => {
                const action = challengeCardAction({
                  challenge,
                  currentProfileId: profileId,
                  ownedLinkedProfileIds: ownedLinkedIds,
                });
                return (
                  <Link key={challenge.id} to={`/contribute/challenges/${challenge.id}`}>
                    <ChallengeCard
                      challenge={challenge}
                      stageLabel={t(`contribute.challenges.stage.${publicChallengeStage(challenge.status)}`)}
                      actionLabel={
                        action === 'manage'
                          ? t('contribute.challenges.managing')
                          : t(`contribute.challenges.cardAction.${action}`)
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
              {t('contribute.challenges.managedTitle')}
            </h2>
            <div className="grid gap-3">
              {drafts.map((challenge) => (
                <Link key={challenge.id} to={`/contribute/challenges/${challenge.id}`}>
                  <ChallengeCard
                    challenge={challenge}
                    stageLabel={t(`contribute.challenges.stage.${publicChallengeStage(challenge.status)}`)}
                    actionLabel={t('contribute.challenges.cardAction.manage')}
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
