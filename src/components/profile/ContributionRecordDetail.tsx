import { Button } from '@/components/ui/button';
import { ContributionEvidenceForms } from '@/components/profile/ContributionEvidenceForms';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  associatedProjectLabel,
  contributionSurvivalState,
  publicCommitShas,
} from '@/lib/civizen-contribution-observation';
import { explainContributionChange } from '@/lib/civizen-contribution-explain';
import type { ContributionLedgerRecord } from '@/lib/civizen-contribution-ledger';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) return '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

type ContributionRecordDetailProps = {
  selected: ContributionLedgerRecord;
  unknown: string;
  evaluatorProfileId?: string;
  onClose: () => void;
  onEventsUpdated: () => void;
};

export function ContributionRecordDetail({
  selected,
  unknown,
  evaluatorProfileId,
  onClose,
  onEventsUpdated,
}: ContributionRecordDetailProps) {
  const { t } = useLanguage();
  const view = selected.observation;
  const labelFn = (value: string) => t(`profile.contributionsLedger.functions.${value}`);
  const labelKind = (value: string) => t(`profile.contributionsLedger.verificationKinds.${value}`);
  const latestCause = view.evidenceEvents[view.evidenceEvents.length - 1]?.cause ?? null;
  const previous = view.evidenceEvents.length > 1
    ? { realizedImpact: view.realizedImpact, evidenceConfidence: view.evidenceConfidence, verificationKind: view.verificationKind, stage: view.stage }
    : null;
  const explanation = explainContributionChange({ previous, current: view, cause: latestCause });

  return (
    <section className="space-y-3 rounded-xl border border-border/80 p-4" data-testid="contribution-record">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{selected.event.title}</h2>
        <Button type="button" variant="ghost" onClick={onClose}>{t('common.close')}</Button>
      </div>
      <h3 className="text-sm font-semibold">{t('profile.contributionsLedger.summary')}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t('profile.contributionsLedger.date')} value={formatDate(selected.event.occurredAt) || unknown} />
        <Field
          label={t('profile.contributionsLedger.yourRole')}
          value={view.roles.map((role) => t(`profile.contributionsLedger.roleLabels.${role}`)).join(' · ') || unknown}
        />
        <Field label={t('profile.contributionsLedger.method')} value={t(`profile.contributionsLedger.methods.${view.executionMethod}`)} />
        <Field label={t('profile.contributionsLedger.outcome')} value={labelKind(view.verificationKind)} />
        <Field label={t('profile.contributionsLedger.realizedImpact')} value={view.realizedImpact === 'unknown' ? unknown : String(view.realizedImpact)} />
      </div>
      {view.humanContributionSummary ? (
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('profile.contributionsLedger.humanContribution')}</p>
          <p className="text-sm text-foreground" data-testid="human-contribution-summary">{view.humanContributionSummary}</p>
        </div>
      ) : null}
      {explanation ? (
        <p className="text-sm text-foreground" data-testid="contribution-change-reason">
          <span className="font-medium">{explanation.title}. </span>
          {explanation.detail}
        </p>
      ) : null}
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer text-foreground">{t('profile.contributionsLedger.details')}</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label={t('profile.contributionsLedger.function')} value={labelFn(view.contributionFunction)} />
          <Field label={t('profile.contributionsLedger.stage')} value={t(`profile.contributionsLedger.stages.${view.stage}`)} />
          <Field label={t('profile.contributionsLedger.quality')} value={view.quality == null ? unknown : String(Math.round(view.quality))} />
          <Field label={t('profile.contributionsLedger.observation')} value={view.observation == null ? unknown : String(Math.round(view.observation))} />
          <Field label={t('profile.contributionsLedger.expectedImpact')} value={view.expectedImpact === 'unknown' ? unknown : String(view.expectedImpact)} />
          <Field label={t('profile.contributionsLedger.claimedScope')} value={view.claimedScope === 'unknown' ? unknown : view.claimedScope} />
          <Field label={t('profile.contributionsLedger.realizedReach')} value={view.realizedReach === 'unknown' ? unknown : view.realizedReach} />
          <Field label={t('profile.contributionsLedger.breadth')} value={view.impactBreadth} />
          <Field label={t('profile.contributionsLedger.depth')} value={view.impactDepth} />
          <Field label={t('profile.contributionsLedger.durability')} value={view.durabilityDays === 'unknown' ? unknown : `${view.durabilityDays} ${t('profile.contributionsLedger.days')}`} />
          <Field label={t('profile.contributionsLedger.reconstruction')} value={view.reconstructionResult ?? unknown} />
          <Field label={t('profile.contributionsLedger.significance')} value={view.structuralSignificance === 'unknown' ? unknown : view.structuralSignificance} />
          <Field label={t('profile.contributionsLedger.artifactType')} value={labelFn(view.artifactFunction)} />
          <Field
            label={t('profile.contributionsLedger.humanSubstance')}
            value={view.humanSubstance ? t(`profile.contributionsLedger.substanceLevels.${view.humanSubstance.level}`) : unknown}
          />
          {view.humanInvolvement && view.humanInvolvement.substantiveInteractions > 0 ? (
            <>
              <Field
                label={t('profile.contributionsLedger.humanEvidence')}
                value={`${view.humanInvolvement.substantiveInteractions} ${t('profile.contributionsLedger.substantiveInteractions')}`}
              />
              <Field
                label={t('profile.contributionsLedger.revisionCycles')}
                value={String(view.humanInvolvement.revisionCycles)}
              />
              <Field
                label={t('profile.contributionsLedger.involvementSpan')}
                value={view.humanInvolvement.spanDays == null
                  ? unknown
                  : `${view.humanInvolvement.spanDays} ${t('profile.contributionsLedger.days')}`}
              />
            </>
          ) : null}
          <Field label={t('profile.contributionsLedger.evidence')} value={view.evidenceConfidence} />
          <Field label={t('profile.contributionsLedger.project')} value={associatedProjectLabel(selected.event) ?? unknown} />
          <Field label={t('profile.contributionsLedger.state')} value={t(`profile.contributionsLedger.states.${contributionSurvivalState(selected.event)}`)} />
          <Field label={t('profile.contributionsLedger.subsystems')} value={view.subsystems.join(', ') || unknown} />
          <Field label={t('profile.contributionsLedger.provenance')} value={publicCommitShas(selected.event).join(', ') || unknown} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t('profile.contributionsLedger.methodNote')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('profile.contributionsLedger.humanEvidenceHint')}</p>
        <p className="mt-3 font-medium text-foreground">{t('profile.contributionsLedger.history')}</p>
        <ul className="mt-1 space-y-1">
          {view.evidenceEvents.map((item, index) => (
            <li key={`${item.kind}-${item.at}-${index}`}>
              {item.kind.replace(/_/g, ' ')} · {formatDate(item.at) || item.at} · {item.cause}
            </li>
          ))}
        </ul>
      </details>
      <p className="text-sm text-muted-foreground">{t('profile.contributionsLedger.notAdditive')}</p>
      {evaluatorProfileId ? (
        <ContributionEvidenceForms
          event={selected.event}
          observation={view}
          evaluatorProfileId={evaluatorProfileId}
          subjectProfileId={selected.event.profileId}
          onRecorded={onEventsUpdated}
        />
      ) : null}
    </section>
  );
}
