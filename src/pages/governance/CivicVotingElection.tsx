import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileWarning,
  Globe2,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Vote,
} from 'lucide-react';

import { CivicVotingPageShell } from '@/components/governance/CivicVotingPageShell';
import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  APP_RELEASE_ID,
  APP_VERSION,
  ANDROID_VERSION_CODE,
} from '@/lib/app-release';
import {
  CIVIC_ELECTION_TIER_LABELS,
  CIVIC_SECURITY_CLASS_LABELS,
  advanceAssistedBallot,
  assertDistinctAssistedRoles,
  attestVotingClient,
  buildDuressVoidBallot,
  buildVotingManifestFromRelease,
  canSubmitChallenge,
  checkBoothUnlockPin,
  computeCoolingOffUntil,
  deriveDefaultChallengeWindow,
  electionTitleWithoutCountryLabel,
  enrollDuressPin,
  evaluateCivicVotingEligibility,
  evaluateSessionGates,
  isCoolingOffActive,
  loadCivicElectionDetail,
  openVoteWindow,
  remainingCoolingOffHours,
  remainingWindowSeconds,
  securityClassGatePolicy,
  type CivicElectionSecurityClass,
  type CivicVerificationCheckKind,
  type CivicElectionDetail,
} from '@/lib/civic-voting';
import { MIN_GOVERNANCE_SCORE, isNativeGovernanceApp } from '@/lib/governance-eligibility';

type DemoGateState = Record<CivicVerificationCheckKind, boolean>;

const VOTING_MANIFEST = buildVotingManifestFromRelease({
  appVersion: APP_VERSION,
  appReleaseId: APP_RELEASE_ID,
  androidVersionCode: ANDROID_VERSION_CODE,
  packageFingerprints: ['demo-fingerprint'],
});

export default function CivicVotingElection() {
  const { electionId = '' } = useParams();
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const [detail, setDetail] = useState<CivicElectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      const result = await loadCivicElectionDetail(electionId);
      if (cancelled) return;
      setDetail(result.detail);
      setDetailError(result.error);
      setDetailLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  const securityClass: CivicElectionSecurityClass = detail?.election.securityClass ?? 'ordinary';
  const title = detail?.election.title ?? t('civicVoting.unknownElection');
  const displayTitle = electionTitleWithoutCountryLabel(
    title,
    detail?.election.scopeCountryCode,
    language,
  );
  const policy = securityClassGatePolicy(securityClass);

  const homeChangedAt = useMemo(() => new Date(Date.now() - 12 * 60 * 60 * 1000), []);
  const coolingOffUntil = computeCoolingOffUntil({
    changedAt: homeChangedAt,
    securityClass,
    source: 'home_address_change',
  });
  const coolingOffActive = isCoolingOffActive({ now: new Date(), coolingOffUntil });

  const attestation = attestVotingClient({
    appVersion: APP_VERSION,
    appReleaseId: APP_RELEASE_ID,
    androidVersionCode: ANDROID_VERSION_CODE,
    packageFingerprint: 'demo-fingerprint',
    manifest: VOTING_MANIFEST,
  });

  const challengePeriod = deriveDefaultChallengeWindow({
    votingOpensAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    challengeDays: 7,
  });
  const challengeOpen = canSubmitChallenge(new Date(), challengePeriod);

  const eligibility = useMemo(
    () =>
      evaluateCivicVotingEligibility({
        isVerified: Boolean(profile?.is_verified),
        role: profile?.role,
        score:
          profile?.is_governance_eligible || profile?.is_verified ? MIN_GOVERNANCE_SCORE : null,
        isNativeMobileApp: isNativeGovernanceApp(),
        isOnEligibilityRoster: true,
        alreadyVoted: false,
        homeCoolingOffActive: false,
        clientAttestationFailed: !attestation.ok,
        securityClass,
      }),
    [attestation.ok, securityClass, profile?.is_governance_eligible, profile?.is_verified, profile?.role],
  );

  const [gates, setGates] = useState<DemoGateState>(() => {
    const initial = {} as DemoGateState;
    for (const kind of eligibility.requiredGates) {
      initial[kind] = kind === 'eligibility' ? eligibility.eligible : false;
    }
    return initial;
  });
  const [windowOpen, setWindowOpen] = useState(false);
  const [notifiedAt, setNotifiedAt] = useState<Date | null>(null);
  const [boothOpen, setBoothOpen] = useState(false);
  const [castComplete, setCastComplete] = useState(false);
  const [castWasDuress, setCastWasDuress] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [duressEnrollment, setDuressEnrollment] = useState<{ pinHash: string; pinSalt: string } | null>(
    null,
  );
  const [normalEnrollment, setNormalEnrollment] = useState<{ pinHash: string; pinSalt: string } | null>(
    null,
  );
  const [assistedStatus, setAssistedStatus] = useState<
    'draft' | 'awaiting_witness' | 'awaiting_steward' | 'accepted' | 'rejected' | 'voided'
  >('draft');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const voteWindow = notifiedAt ? openVoteWindow(notifiedAt, policy.primaryWindowSeconds) : null;
  const secondsLeft = voteWindow ? remainingWindowSeconds(new Date(), voteWindow) : 0;
  const gateList = eligibility.requiredGates.map((kind) => ({
    kind,
    passed: Boolean(gates[kind]),
  }));
  const { canOpenBooth, failed } = evaluateSessionGates(gateList);

  const startSimulatedWindow = () => {
    const now = new Date();
    setNotifiedAt(now);
    setWindowOpen(true);
    setBoothOpen(false);
    setCastComplete(false);
    setCastWasDuress(false);
    setGates((prev) => ({
      ...prev,
      eligibility: eligibility.eligible,
    }));
  };

  const toggleGate = (kind: CivicVerificationCheckKind) => {
    setGates((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const tryOpenBooth = () => {
    if (!windowOpen || secondsLeft <= 0) return;
    if (!canOpenBooth) return;
    setBoothOpen(true);
  };

  const enrollPins = async () => {
    const normal = await enrollDuressPin('135790', 'normal-demo-salt');
    const duress = await enrollDuressPin('246813', 'duress-demo-salt');
    setNormalEnrollment(normal);
    setDuressEnrollment(duress);
    setPinMessage(t('civicVoting.extras.pinsEnrolled'));
  };

  const unlockWithPin = async () => {
    if (!normalEnrollment || !duressEnrollment) {
      setPinMessage(t('civicVoting.extras.enrollPinsFirst'));
      return;
    }
    const result = await checkBoothUnlockPin({
      enteredPin: pinInput,
      normalPinHash: normalEnrollment.pinHash,
      normalPinSalt: normalEnrollment.pinSalt,
      duressPinHash: duressEnrollment.pinHash,
      duressPinSalt: duressEnrollment.pinSalt,
    });
    if (result.mode === 'invalid') {
      setPinMessage(t('civicVoting.extras.pinInvalid'));
      return;
    }
    setBoothOpen(true);
    setCastWasDuress(result.mode === 'duress');
    setPinMessage(t('civicVoting.extras.boothUnlocked'));
  };

  const castSimulatedBallot = async () => {
    if (castWasDuress) {
      await buildDuressVoidBallot({
        sessionId: 'demo-session',
        electionId,
      });
    }
    setCastComplete(true);
    setBoothOpen(false);
  };

  const runAssistedStep = (action: 'assistant_confirm' | 'witness_confirm' | 'steward_accept') => {
    const roles = {
      voterProfileId: profile?.id || 'voter',
      assistantProfileId: 'assistant-demo',
      witnessProfileId: 'witness-demo',
    };
    if (!assertDistinctAssistedRoles(roles).ok) return;
    const next = advanceAssistedBallot({ status: assistedStatus, action, roles });
    if (next.ok) setAssistedStatus(next.nextStatus);
  };

  return (
    <CivicVotingPageShell
      sectionTrail={[
        { label: t('civicVoting.openElections'), href: '/governance/voting' },
        { label: displayTitle },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-1 py-2 pb-8">
        <div className="space-y-1">
          <h1 className="sr-only">{displayTitle}</h1>
          <div className="flex min-w-0 items-center gap-2">
            {detail?.election.scopeCountryCode &&
            /^(GLOBAL|WW|XZ|UN)$/i.test(detail.election.scopeCountryCode) ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30"
                title={t('civicVoting.filters.global')}
                aria-label={t('civicVoting.filters.global')}
              >
                <Globe2 className="h-2.5 w-2.5" aria-hidden />
              </span>
            ) : detail?.election.scopeCountryCode ? (
              <RoundCountryFlag
                countryCode={detail.election.scopeCountryCode}
                locale={language}
                size="sm"
              />
            ) : null}
            {detail?.election.summary ? (
              <SlowRunningText
                text={detail.election.summary}
                onlyWhenOverflow
                className="min-w-0 flex-1 text-sm text-muted-foreground"
              />
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild>
                  <Link
                    to={`/governance/voting/${electionId}/observe`}
                    aria-label={t('civicVoting.observer.short')}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{t('civicVoting.observer.short')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {detailLoading ? (
          <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </Card>
        ) : null}

        {detailError ? (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {t('civicVoting.loadFailed')}
          </Card>
        ) : null}

        {detail ? (
          <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{CIVIC_ELECTION_TIER_LABELS[detail.election.tier]}</Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline">
                    {CIVIC_SECURITY_CLASS_LABELS[detail.election.securityClass]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[16rem]">
                  <p className="font-medium">
                    {CIVIC_SECURITY_CLASS_LABELS[detail.election.securityClass]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`civicVoting.securityHint.${detail.election.securityClass}`)}
                  </p>
                </TooltipContent>
              </Tooltip>
              {detail.scopeRegionCode ? <Badge variant="outline">{detail.scopeRegionCode}</Badge> : null}
              {detail.scopeLocalityCode ? (
                <Badge variant="outline">{detail.scopeLocalityCode}</Badge>
              ) : null}
              <Badge variant={detail.election.status === 'certified' ? 'default' : 'secondary'}>
                {detail.election.status}
              </Badge>
            </div>

            {detail.contests.map((contest) => (
              <div key={contest.id} className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">{contest.title}</h2>
                <ul className="space-y-2">
                  {contest.candidates.map((candidate) => (
                    <li
                      key={candidate.id}
                      className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3"
                    >
                      <p className="font-medium text-foreground">{candidate.displayName}</p>
                      {candidate.statement ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {candidate.statement}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        ) : null}

        {!user ? (
          <Card className="rounded-2xl border-dashed border-border/70 p-4 shadow-none space-y-3">
            <p className="text-sm text-muted-foreground">{t('civicVoting.publicBrowseOnly')}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" asChild>
                <Link to="/login">{t('civicVoting.publicLanding.signIn')}</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to="/signup">{t('civicVoting.publicLanding.signUp')}</Link>
              </Button>
            </div>
          </Card>
        ) : null}

        <Accordion type="multiple" className="rounded-2xl border border-border/60 bg-card/40 px-4">
          {detail?.body ? (
            <AccordionItem value="about" className="border-border/40">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                {t('civicVoting.folds.aboutElection')}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {detail.body}
              </AccordionContent>
            </AccordionItem>
          ) : null}

          <AccordionItem value="session" className="border-border/40">
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
              {t('civicVoting.folds.sessionTools')}
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-xs text-muted-foreground">{t('civicVoting.sessionSimulatorHint')}</p>

              <div className="flex flex-wrap gap-2">
                <Badge variant={eligibility.eligible ? 'secondary' : 'outline'}>
                  {eligibility.eligible ? t('civicVoting.eligible') : t('civicVoting.ineligible')}
                </Badge>
                <Badge variant="outline">
                  {policy.primaryWindowSeconds / 60}-min · {policy.maxAttempts} attempts
                </Badge>
                <Badge variant={attestation.ok ? 'secondary' : 'destructive'}>
                  {attestation.ok
                    ? t('civicVoting.extras.attestationOk')
                    : t('civicVoting.extras.attestationFail')}
                </Badge>
              </div>
              {!eligibility.eligible ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {eligibility.reasons.map((reason) => (
                    <li key={reason}>• {t(`civicVoting.reasons.${reason}`)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">{t('civicVoting.eligibleReady')}</p>
              )}
              {coolingOffActive && coolingOffUntil ? (
                <p className="text-xs text-muted-foreground">
                  {t('civicVoting.extras.coolingOff', {
                    hours: String(remainingCoolingOffHours({ now: new Date(), coolingOffUntil })),
                  })}
                </p>
              ) : null}

              {!user ? (
                <p className="text-xs text-muted-foreground">{t('civicVoting.publicBrowseOnly')}</p>
              ) : (
                <div className="space-y-4">
                  <section className="space-y-2 rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-2 text-primary">
                      <FileWarning className="h-4 w-4" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {t('civicVoting.extras.challengeTitle')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('civicVoting.extras.challengeBody')}</p>
                    <Badge variant={challengeOpen ? 'secondary' : 'outline'}>
                      {challengeOpen
                        ? t('civicVoting.extras.challengeOpen')
                        : t('civicVoting.extras.challengeClosed')}
                    </Badge>
                  </section>

                  <section className="space-y-2 rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock3 className="h-4 w-4" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {t('civicVoting.windowTitle')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('civicVoting.windowBody')}</p>
                    {!windowOpen ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={startSimulatedWindow}
                        disabled={!eligibility.eligible}
                      >
                        {t('civicVoting.simulatePush')}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{t('civicVoting.timeRemaining')}</span>
                          <span className="font-semibold tabular-nums">
                            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                          </span>
                        </div>
                        <Progress value={(secondsLeft / policy.primaryWindowSeconds) * 100} />
                      </div>
                    )}
                  </section>

                  <section className="space-y-2 rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-2 text-primary">
                      <ShieldAlert className="h-4 w-4" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {t('civicVoting.gatesTitle')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('civicVoting.gatesBody')}</p>
                    <div className="space-y-2">
                      {eligibility.requiredGates.map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-left text-sm"
                          onClick={() => toggleGate(kind)}
                        >
                          <span>{t(`civicVoting.gateLabels.${kind}`)}</span>
                          <Badge variant={gates[kind] ? 'secondary' : 'outline'}>
                            {gates[kind] ? t('civicVoting.gatePassed') : t('civicVoting.gatePending')}
                          </Badge>
                        </button>
                      ))}
                    </div>
                    {failed.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t('civicVoting.gatesFailed', { gates: failed.join(', ') })}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={tryOpenBooth}
                      disabled={!windowOpen || !canOpenBooth || secondsLeft <= 0 || castComplete}
                    >
                      {t('civicVoting.openBooth')}
                    </Button>
                  </section>

                  <section className="space-y-2 rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-2 text-primary">
                      <KeyRound className="h-4 w-4" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {t('civicVoting.extras.duressTitle')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('civicVoting.extras.duressBody')}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => void enrollPins()}>
                      {t('civicVoting.extras.enrollPins')}
                    </Button>
                    <div className="flex gap-2">
                      <Input
                        inputMode="numeric"
                        placeholder={t('civicVoting.extras.pinPlaceholder')}
                        value={pinInput}
                        onChange={(event) => setPinInput(event.target.value)}
                      />
                      <Button type="button" size="sm" onClick={() => void unlockWithPin()}>
                        {t('civicVoting.extras.unlock')}
                      </Button>
                    </div>
                    {pinMessage ? <p className="text-xs text-muted-foreground">{pinMessage}</p> : null}
                    <p className="text-[11px] text-muted-foreground">{t('civicVoting.extras.duressHint')}</p>
                  </section>

                  <section className="space-y-2 rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-2 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {t('civicVoting.extras.assistedTitle')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('civicVoting.extras.assistedBody')}</p>
                    <Badge variant="outline">{assistedStatus}</Badge>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => runAssistedStep('assistant_confirm')}
                      >
                        {t('civicVoting.extras.assistantConfirm')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => runAssistedStep('witness_confirm')}
                      >
                        {t('civicVoting.extras.witnessConfirm')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => runAssistedStep('steward_accept')}
                      >
                        {t('civicVoting.extras.stewardAccept')}
                      </Button>
                    </div>
                  </section>

                  {boothOpen ? (
                    <section className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Vote className="h-4 w-4" />
                        <h3 className="text-sm font-semibold text-foreground">
                          {t('civicVoting.boothTitle')}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{t('civicVoting.boothBody')}</p>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void castSimulatedBallot()}>
                        {t('civicVoting.castSimulated')}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">{t('civicVoting.noChoiceReceipt')}</p>
                    </section>
                  ) : null}

                  {castComplete ? (
                    <section className="space-y-1 rounded-xl border border-border/50 p-3">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <p className="text-sm font-semibold text-foreground">
                          {t('civicVoting.castComplete')}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('civicVoting.castCompleteBody')}</p>
                    </section>
                  ) : null}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </CivicVotingPageShell>
  );
}
