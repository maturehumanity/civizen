import { Link, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';

import { CivicVotingPageHeading, CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  computeObserverMetrics,
  formatTurnoutPercent,
  planCanvassSamples,
  evaluateRiskSignals,
  detectVelocityAnomaly,
  detectDeviceFarmSignal,
} from '@/lib/civic-voting';

/** Demo process metrics — no PII. */
const DEMO_METRICS = computeObserverMetrics({
  eligibleRosterCount: 1000,
  sessions: [
    ...Array.from({ length: 420 }, () => ({ status: 'cast', attemptNumber: 1 })),
    ...Array.from({ length: 80 }, () => ({ status: 'cast', attemptNumber: 2 })),
    ...Array.from({ length: 60 }, () => ({ status: 'missed', attemptNumber: 1 })),
    ...Array.from({ length: 25 }, () => ({ status: 'failed', attemptNumber: 1 })),
    ...Array.from({ length: 15 }, () => ({ status: 'exhausted', attemptNumber: 3 })),
  ],
  gateChecks: [
    ...Array.from({ length: 450 }, () => ({ checkKind: 'liveness', result: 'passed' })),
    ...Array.from({ length: 50 }, () => ({ checkKind: 'liveness', result: 'failed' })),
    ...Array.from({ length: 480 }, () => ({ checkKind: 'location_home', result: 'passed' })),
    ...Array.from({ length: 20 }, () => ({ checkKind: 'location_home', result: 'failed' })),
    ...Array.from({ length: 470 }, () => ({ checkKind: 'solitude', result: 'passed' })),
    ...Array.from({ length: 30 }, () => ({ checkKind: 'solitude', result: 'failed' })),
  ],
});

const DEMO_RISK = evaluateRiskSignals([
  detectVelocityAnomaly({ sessionsInLastHour: 2 }),
  detectDeviceFarmSignal({ distinctProfilesOnFingerprint: 1 }),
]);

const DEMO_CANVASS = planCanvassSamples({
  sessions: Array.from({ length: 500 }, (_, i) => ({
    sessionId: `session-${i}`,
    status: i < 500 ? 'cast' : 'missed',
  })),
  sampleRate: 0.05,
  highRiskSessionIds: ['session-3', 'session-9'],
  random: () => 0.42,
});

export default function CivicVotingObserver() {
  const { electionId = '' } = useParams();
  const { t } = useLanguage();

  return (
    <CivicVotingPageShell
      sectionTrail={[
        { label: t('civicVoting.openElections'), href: '/governance/voting' },
        { label: t('civicVoting.observer.short') },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-0 py-2 pb-8">
        <div className="min-w-0 space-y-1">
          <CivicVotingPageHeading title={t('civicVoting.observer.title')} />
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.subtitle')}</p>
        </div>

        <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.turnout')}</h2>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {formatTurnoutPercent(DEMO_METRICS.turnoutRate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {DEMO_METRICS.sessionsCast} / {DEMO_METRICS.eligibleRosterCount}{' '}
            {t('civicVoting.observer.castOfEligible')}
          </p>
          <Progress className="mt-3" value={DEMO_METRICS.turnoutRate * 100} />
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label={t('civicVoting.observer.missed')} value={String(DEMO_METRICS.sessionsMissed)} />
          <MetricCard label={t('civicVoting.observer.failed')} value={String(DEMO_METRICS.sessionsFailed)} />
          <MetricCard label={t('civicVoting.observer.exhausted')} value={String(DEMO_METRICS.sessionsExhausted)} />
          <MetricCard
            label={t('civicVoting.observer.avgAttempts')}
            value={DEMO_METRICS.averageAttemptsAmongCast.toFixed(2)}
          />
        </div>

        <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.gateFails')}</h2>
          {Object.entries(DEMO_METRICS.gateFailRates).map(([kind, rate]) => (
            <div key={kind} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize">{kind.replace(/_/g, ' ')}</span>
                <span className="tabular-nums">{(rate * 100).toFixed(1)}%</span>
              </div>
              <Progress value={rate * 100} />
            </div>
          ))}
        </Card>

        <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.riskTitle')}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{DEMO_RISK.maxSeverity}</Badge>
            <Badge variant="secondary">
              {t('civicVoting.observer.riskScore')}: {DEMO_RISK.aggregateScore.toFixed(2)}
            </Badge>
            <Badge variant={DEMO_RISK.blockSession ? 'destructive' : 'outline'}>
              {DEMO_RISK.blockSession
                ? t('civicVoting.observer.riskBlocking')
                : t('civicVoting.observer.riskClear')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.riskBody')}</p>
        </Card>

        <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{t('civicVoting.observer.canvassTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('civicVoting.observer.canvassBody')}</p>
          <p className="text-sm text-foreground">
            {DEMO_CANVASS.samples.length} {t('civicVoting.observer.canvassSamples')} · rate{' '}
            {(DEMO_CANVASS.sampleRate * 100).toFixed(0)}%
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_CANVASS.samples.slice(0, 6).map((sample) => (
              <Badge key={sample.sessionId} variant="outline">
                {sample.sampleBucket}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Keep electionId referenced for deep-link stability */}
        <p className="sr-only">
          <Link to={`/governance/voting/${electionId}`}>{electionId}</Link>
        </p>
      </div>
    </CivicVotingPageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </Card>
  );
}
