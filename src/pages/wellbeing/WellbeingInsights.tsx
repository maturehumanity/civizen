import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { HappinessDomainId } from '@/lib/happiness/types';
import { requestWellbeingAggregate } from '@/lib/happiness/aggregate/api';
import type { QualifyingScope, WellbeingAggregateResult } from '@/lib/happiness/aggregate/types';
import {
  INSIGHTS_COPY,
  listBrowsableEfforts,
  listScopeCandidates,
  listScopeSnapshots,
  listViewableInsightScopes,
  linkInsightEffort,
  matchExistingEfforts,
  overviewHasQualifyingInsight,
  presentOverview,
  recordInsightAction,
  storeWellbeingHandoff,
  toCiviInsightContext,
  wellbeingHandoffFromPattern,
} from '@/lib/happiness/insights';
import type { ExistingEffort, PresentedDomainInsight, StoredSystemicCandidate } from '@/lib/happiness/insights/types';
import { HumanOutcomeLinks } from '@/pages/wellbeing/HumanOutcomeLinks';
import { cn } from '@/lib/utils';

export default function WellbeingInsights() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const section = params.get('section') === 'patterns' || params.get('section') === 'action' ? params.get('section')! : 'overview';
  const [scopes, setScopes] = useState<QualifyingScope[]>([]);
  const [results, setResults] = useState<WellbeingAggregateResult[]>([]);
  const [candidates, setCandidates] = useState<StoredSystemicCandidate[]>([]);
  const [efforts, setEfforts] = useState<ExistingEffort[]>([]);
  const [focus, setFocus] = useState<WellbeingAggregateResult | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const scopeId = params.get('scope') ?? scopes[0]?.id ?? '';
  const scope = scopes.find((row) => row.id === scopeId) ?? scopes[0] ?? null;

  useEffect(() => {
    void listViewableInsightScopes().then(setScopes).catch(() => setScopes([]));
    void listBrowsableEfforts().then(setEfforts).catch(() => setEfforts([]));
  }, []);

  useEffect(() => {
    if (!scope?.id) return;
    void Promise.all([listScopeSnapshots(scope.id), listScopeCandidates(scope.id)])
      .then(([nextResults, nextCandidates]) => {
        setResults(nextResults);
        setCandidates(nextCandidates);
      })
      .catch(() => {
        setResults([]);
        setCandidates([]);
      });
  }, [scope?.id]);

  const overview = useMemo(
    () =>
      presentOverview({
        scope,
        results,
        candidates,
        unauthorized: Boolean(profile?.id && scope && !scope.viewerProfileIds.includes(profile.id)),
      }),
    [scope, results, candidates, profile?.id],
  );

  const domainInsight = overview.needsAttention.concat(overview.goingWell).find((row) => row.domain === params.get('domain')) ?? null;
  const candidate = candidates.find((row) => row.id === params.get('candidate')) ?? null;
  const related = candidate ? matchExistingEfforts({ candidate, insight: domainInsight, efforts }) : [];
  const civi = toCiviInsightContext({ overview, focus });

  const setSection = (next: string) => {
    const copy = new URLSearchParams(params);
    copy.set('section', next);
    if (scope?.id) copy.set('scope', scope.id);
    setParams(copy);
  };

  const openDomain = async (row: PresentedDomainInsight) => {
    const copy = new URLSearchParams(params);
    copy.set('domain', row.domain);
    copy.set('section', 'overview');
    if (scope?.id) copy.set('scope', scope.id);
    setParams(copy);
    if (!scope?.id) return;
    setFocus(
      await requestWellbeingAggregate({
        scopeId: scope.id,
        topic: 'domain_state',
        timeBucket: row.timeBucket,
        periodStart: row.periodStart,
        domain: row.domain,
      }),
    );
  };

  const act = async (
    actionType: 'investigate' | 'monitor' | 'challenge_draft' | 'governance_draft' | 'link_existing',
    effort?: ExistingEffort,
  ) => {
    if (!profile?.id || !scope?.id) return;
    setBusy(true);
    try {
      await recordInsightAction({
        scopeId: scope.id,
        candidateId: candidate?.id,
        actionType,
        relatedEntityType: effort?.entityType,
        relatedEntityId: effort?.entityId,
        createdBy: profile.id,
      });
      if (actionType === 'link_existing' && candidate && effort) {
        await linkInsightEffort({
          candidateId: candidate.id,
          entityType: effort.entityType,
          entityId: effort.entityId,
          createdBy: profile.id,
        });
      }
      if ((actionType === 'challenge_draft' || actionType === 'governance_draft') && candidate) {
        storeWellbeingHandoff(wellbeingHandoffFromPattern({ candidate, insight: domainInsight, result: focus }));
        navigate(actionType === 'challenge_draft' ? '/contribute/challenges/new' : '/governance/solutions');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 overflow-x-clip px-4 py-6" data-wellbeing-insights="">
        <AppPageHeader
          title={INSIGHTS_COPY.title}
          fallbackPath="/happiness"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Heart className="h-6 w-6" aria-hidden />
            </div>
          }
        />
        <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.privacyHint}</p>
        <button type="button" className="text-left text-sm text-primary underline-offset-4 hover:underline" onClick={() => setHowOpen((open) => !open)}>
          {INSIGHTS_COPY.howTitle}
        </button>
        {howOpen ? (
          <Card className="space-y-2 rounded-2xl border-border/70 p-4 text-sm text-muted-foreground">
            {INSIGHTS_COPY.howBody.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>{INSIGHTS_COPY.coordinatorLimits}</p>
          </Card>
        ) : null}

        {scopes.length ? (
          <div className="flex flex-wrap gap-2">
            {scopes.map((row) => (
              <Button key={row.id} size="sm" variant={row.id === scope?.id ? 'default' : 'outline'} onClick={() => setParams({ scope: row.id, section })}>
                {row.label || row.kind}
              </Button>
            ))}
          </div>
        ) : null}

        {!scopes.length ? (
          <Unavailable title={INSIGHTS_COPY.noViewerTitle} body={INSIGHTS_COPY.noViewerBody} />
        ) : overview.unauthorized ? (
          <Unavailable title={INSIGHTS_COPY.unauthorizedTitle} body={INSIGHTS_COPY.unauthorizedBody} />
        ) : overview.scopeDisabled ? (
          <Unavailable title={INSIGHTS_COPY.scopeDisabledTitle} body={INSIGHTS_COPY.scopeDisabledBody} />
        )         : !overviewHasQualifyingInsight(overview) ? (
          <Unavailable
            title={overview.suppressed ? INSIGHTS_COPY.suppressedTitle : INSIGHTS_COPY.emptyTitle}
            body={overview.suppressed?.summary ?? INSIGHTS_COPY.emptyBody}
            suppressed={Boolean(overview.suppressed)}
          />
        ) : (
          <Tabs value={section} onValueChange={setSection}>
            <TabsList className="flex w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">{INSIGHTS_COPY.overview}</TabsTrigger>
              <TabsTrigger value="patterns">{INSIGHTS_COPY.patterns}</TabsTrigger>
              <TabsTrigger value="action">{INSIGHTS_COPY.action}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.whatShouldIKnow}</p>
              <InsightList title={INSIGHTS_COPY.goingWell} rows={overview.goingWell} onOpen={openDomain} />
              <InsightList title={INSIGHTS_COPY.needsAttention} rows={overview.needsAttention} onOpen={openDomain} />
              {overview.emerging.length ? (
                <section className="space-y-2">
                  <h2 className="text-sm font-medium">{INSIGHTS_COPY.emerging}</h2>
                  {overview.emerging.slice(0, 3).map((row) => (
                    <p key={`${row.domain}-${row.summary}`} className="text-sm text-muted-foreground">{row.summary}</p>
                  ))}
                </section>
              ) : null}
              {overview.movement.length ? (
                <section className="space-y-2">
                  <h2 className="text-sm font-medium">{INSIGHTS_COPY.recentMovement}</h2>
                  {overview.movement.map((row) => (
                    <p key={`move-${row.domain}`} className="text-sm text-muted-foreground">
                      {INSIGHTS_COPY.domains[row.domain]} — {INSIGHTS_COPY.trend[row.trend]}
                    </p>
                  ))}
                </section>
              ) : null}
              {domainInsight ? <DomainCard row={domainInsight} /> : null}
            </TabsContent>
            <TabsContent value="patterns" className="space-y-4">
              <CandidateList title={INSIGHTS_COPY.emerging} rows={candidates.filter((row) => row.status === 'emerging')} params={params} setParams={setParams} />
              <CandidateList title={INSIGHTS_COPY.established} rows={candidates.filter((row) => row.status === 'established_pattern')} params={params} setParams={setParams} />
              <CandidateList title={INSIGHTS_COPY.monitoring} rows={candidates.filter((row) => row.status === 'observing')} params={params} setParams={setParams} />
              {candidate ? (
                <Card className="space-y-2 rounded-2xl border-border/70 p-4" data-wellbeing-candidate="">
                  <p className="font-medium">{candidate.summary}</p>
                  <p className="text-sm text-muted-foreground">
                    {candidate.status.replace(/_/g, ' ')} · qualifying periods: {candidate.evidencePeriods}
                  </p>
                  {candidate.factorCategory ? <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.associatedFactors}: {candidate.factorCategory}</p> : null}
                  <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.evidenceNote}</p>
                  <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.noCausation}</p>
                  <p className="text-xs text-muted-foreground">{INSIGHTS_COPY.draftOnly}</p>
                  <HumanOutcomeLinks candidateId={candidate.id} scopeId={scope?.id} domain={candidate.domain} factor={candidate.factorCategory} />
                </Card>
              ) : null}
            </TabsContent>
            <TabsContent value="action" className="space-y-3">
              <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.whatMightHelp}</p>
              {domainInsight?.helpfulness ? <p className="text-sm">{domainInsight.helpfulness}</p> : null}
              <p className="text-xs text-muted-foreground">{INSIGHTS_COPY.helpfulnessCaveat}</p>
              {related.map((effort) => (
                <div key={effort.entityId} className="space-y-1">
                  <Link to={effort.path} className="block text-sm text-primary underline-offset-4 hover:underline">
                    {INSIGHTS_COPY.viewExisting}: {effort.title}
                  </Link>
                  <Button type="button" variant="ghost" size="sm" disabled={busy || !candidate} onClick={() => void act('link_existing', effort)}>
                    {INSIGHTS_COPY.contributeEvidence}
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" disabled={busy} onClick={() => void act('investigate')}>{INSIGHTS_COPY.investigate}</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void act('monitor')}>{INSIGHTS_COPY.continueMonitoring}</Button>
              <Button type="button" disabled={busy || !candidate} onClick={() => void act('challenge_draft')}>{INSIGHTS_COPY.exploreChallenge}</Button>
              <Button type="button" variant="outline" disabled={busy || !candidate} onClick={() => void act('governance_draft')}>{INSIGHTS_COPY.exploreGovernance}</Button>
              <p className="text-xs text-muted-foreground">{INSIGHTS_COPY.draftOnly}</p>
            </TabsContent>
          </Tabs>
        )}
        <p className="sr-only" data-civi-insight-context="">{civi.summary}</p>
      </div>
    </AppLayout>
  );
}

function Unavailable({ title, body, suppressed }: { title: string; body: string; suppressed?: boolean }) {
  return (
    <Card className="rounded-2xl border-border/70 p-5" data-wellbeing-suppressed={suppressed ? '' : undefined}>
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}

function InsightList({ title, rows, onOpen }: { title: string; rows: PresentedDomainInsight[]; onOpen: (row: PresentedDomainInsight) => void }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {rows.map((row) => (
        <button key={row.domain} type="button" className="block w-full text-left" onClick={() => onOpen(row)}>
          <Card className="rounded-2xl border-border/70 p-4">
            <p className="text-sm font-medium">{INSIGHTS_COPY.domains[row.domain as HappinessDomainId]}</p>
            <p className="mt-1 text-sm text-muted-foreground">{row.summary}</p>
          </Card>
        </button>
      ))}
    </section>
  );
}

function DomainCard({ row }: { row: PresentedDomainInsight }) {
  return (
    <Card className="space-y-2 rounded-2xl border-border/70 p-4" data-wellbeing-domain="">
      <p className="font-medium">{INSIGHTS_COPY.polarity[row.polarity]}</p>
      <p className="text-sm">Trend: {INSIGHTS_COPY.trend[row.trend]}</p>
      <p className="text-sm">{row.summary}</p>
      {row.factors.length ? <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.associatedFactors}: {row.factors.join(', ')}</p> : null}
      <p className="text-sm text-muted-foreground">{INSIGHTS_COPY.problem[row.problemKind]}</p>
      <p className="text-xs text-muted-foreground">{INSIGHTS_COPY.sufficiency[row.sufficiency === 'unavailable' ? 'insufficient' : row.sufficiency]} evidence</p>
      {row.caveats.map((line) => (
        <p key={line} className="text-xs text-muted-foreground">{line}</p>
      ))}
    </Card>
  );
}

function CandidateList({
  title,
  rows,
  params,
  setParams,
}: {
  title: string;
  rows: StoredSystemicCandidate[];
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
}) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className={cn('block w-full text-left')}
          onClick={() => {
            const copy = new URLSearchParams(params);
            copy.set('candidate', row.id);
            copy.set('section', 'patterns');
            setParams(copy);
          }}
        >
          <Card className="rounded-2xl border-border/70 p-4">
            <p className="text-sm">{row.summary}</p>
          </Card>
        </button>
      ))}
    </section>
  );
}
