import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listManagedOpportunities,
  listMyParticipations,
  listOpenOpportunities,
  listOpportunitiesByIds,
  listOwnedLinkedProfileIds,
} from '@/lib/opportunities-api';
import {
  opportunityCardSkills,
  participantNextAction,
  profileCanManagePublisher,
  type ContributionOpportunity,
  type OpportunityParticipation,
} from '@/lib/opportunities';

function formatDeadline(iso: string | null, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  try {
    return t('contribute.opportunities.deadlineOn', {
      date: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time)),
    });
  } catch {
    return null;
  }
}

function OpportunityCard({
  opportunity,
  statusLabel,
  actionLabel,
}: {
  opportunity: ContributionOpportunity;
  statusLabel: string;
  actionLabel?: string;
}) {
  const { t } = useLanguage();
  const skills = opportunityCardSkills(opportunity);
  const deadline = formatDeadline(opportunity.applicationDeadline, t);
  const place = opportunity.isRemote
    ? t('contribute.opportunities.remote')
    : opportunity.locationText || t('contribute.opportunities.onSite');

  return (
    <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{opportunity.title}</h3>
        <Badge variant="outline" className="shrink-0 rounded-full">
          {statusLabel}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{opportunity.summary}</p>
      {skills.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{skills.join(' · ')}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {[opportunity.estimatedEffort, place, deadline].filter(Boolean).join(' · ')}
      </p>
      {actionLabel ? (
        <p className="mt-3 text-sm font-medium text-primary">{actionLabel}</p>
      ) : null}
    </Card>
  );
}

export default function ProfessionalOpportunities() {
  const { t } = useLanguage();
  const tRef = useRef(t); tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const profileId = profile?.id ?? '';

  const [openOpps, setOpenOpps] = useState<ContributionOpportunity[]>([]);
  const [managed, setManaged] = useState<ContributionOpportunity[]>([]);
  const [mine, setMine] = useState<OpportunityParticipation[]>([]);
  const [participationOpps, setParticipationOpps] = useState<ContributionOpportunity[]>([]);
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
      const [openRows, managedRows, participations] = await Promise.all([
        listOpenOpportunities(),
        publisherIds.length > 0 ? listManagedOpportunities(publisherIds) : Promise.resolve([]),
        profileId ? listMyParticipations(profileId) : Promise.resolve([]),
      ]);
      const participationIds = [...new Set(participations.map((row) => row.opportunityId))];
      const extra = participationIds.length > 0 ? await listOpportunitiesByIds(participationIds) : [];
      setOpenOpps(openRows.filter((row) => row.opportunityKind === 'education_to_contribution'));
      setManaged(managedRows.filter((row) => row.opportunityKind === 'education_to_contribution'));
      setMine(participations);
      setParticipationOpps(extra.filter((row) => row.opportunityKind === 'education_to_contribution'));
    } catch {
      setError(tRef.current('contribute.opportunities.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const opportunityById = useMemo(() => {
    const map = new Map<string, ContributionOpportunity>();
    for (const row of [...openOpps, ...managed, ...participationOpps]) map.set(row.id, row);
    return map;
  }, [managed, openOpps, participationOpps]);

  const myWork = useMemo(() => {
    return mine
      .map((participation) => {
        const opportunity = opportunityById.get(participation.opportunityId);
        return opportunity ? { participation, opportunity } : null;
      })
      .filter((row): row is { participation: OpportunityParticipation; opportunity: ContributionOpportunity } =>
        Boolean(row),
      );
  }, [mine, opportunityById]);

  const drafts = managed.filter((row) => row.status === 'draft' || row.status === 'closed');
  const appliedOpportunityIds = new Set(mine.map((row) => row.opportunityId));
  const discoverable = openOpps.filter((row) => !appliedOpportunityIds.has(row.id));

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('contribute.lanes.professional.title')}
          subtitle={t('contribute.opportunities.subtitle')}
          fallbackPath="/contribute"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
          }
          actions={
            profileId ? (
              <Button size="sm" onClick={() => navigate('/contribute/professional/new')}>
                <Plus className="mr-1 h-4 w-4" />
                {t('contribute.opportunities.create')}
              </Button>
            ) : null
          }
        />

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && myWork.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('contribute.opportunities.myWorkTitle')}
            </h2>
            <div className="grid gap-3">
              {myWork.map(({ opportunity, participation }) => {
                const next = participantNextAction({
                  opportunity,
                  currentProfileId: profileId,
                  ownedLinkedProfileIds: ownedLinkedIds,
                  participation,
                });
                return (
                  <Link key={participation.id} to={`/contribute/professional/${opportunity.id}`}>
                    <OpportunityCard
                      opportunity={opportunity}
                      statusLabel={t(`contribute.opportunities.participationStatus.${participation.status}`)}
                      actionLabel={
                        next === 'none'
                          ? undefined
                          : t(`contribute.opportunities.nextAction.${next}`)
                      }
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('contribute.opportunities.openTitle')}
          </h2>
          {!loading && discoverable.length === 0 ? (
            <Card className="border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
              {t('contribute.opportunities.empty')}
            </Card>
          ) : (
            <div className="grid gap-3">
              {discoverable.map((opportunity) => {
                const mineForOpp = mine.find((row) => row.opportunityId === opportunity.id) ?? null;
                const manages = profileCanManagePublisher({
                  currentProfileId: profileId,
                  publisherProfileId: opportunity.publisherProfileId,
                  ownedLinkedProfileIds: ownedLinkedIds,
                });
                const next = participantNextAction({
                  opportunity,
                  currentProfileId: profileId,
                  ownedLinkedProfileIds: ownedLinkedIds,
                  participation: mineForOpp,
                });
                return (
                  <Link key={opportunity.id} to={`/contribute/professional/${opportunity.id}`}>
                    <OpportunityCard
                      opportunity={opportunity}
                      statusLabel={
                        manages
                          ? t('contribute.opportunities.managing')
                          : t(`contribute.opportunities.status.${opportunity.status}`)
                      }
                      actionLabel={
                        next === 'none' ? undefined : t(`contribute.opportunities.nextAction.${next}`)
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
              {t('contribute.opportunities.managedTitle')}
            </h2>
            <div className="grid gap-3">
              {drafts.map((opportunity) => (
                <Link key={opportunity.id} to={`/contribute/professional/${opportunity.id}`}>
                  <OpportunityCard
                    opportunity={opportunity}
                    statusLabel={t(`contribute.opportunities.status.${opportunity.status}`)}
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
