import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ContributionEvent } from '@/lib/civizen-contributions';
import {
  ratingDimensionsForFunction,
  type ContributionEvaluatorRole,
  type ContributionEvidenceKind,
  type RatingDimension,
} from '@/lib/civizen-contribution-evidence';
import { recordContributionEvidence } from '@/lib/civizen-contribution-evidence-store';
import type { ContributionLifecycleView } from '@/lib/civizen-contribution-lifecycle';
import type { RatingConflict } from '@/lib/civizen-evaluator-reputation';

const ROLES: ContributionEvaluatorRole[] = [
  'general_observer',
  'affected_user',
  'beneficiary',
  'contributor',
  'collaborator',
  'peer',
  'domain_expert',
  'institutional_evaluator',
];

type ContributionEvidenceFormsProps = {
  event: ContributionEvent;
  observation: ContributionLifecycleView;
  evaluatorProfileId: string;
  subjectProfileId: string;
  onRecorded: () => void;
};

export function ContributionEvidenceForms({
  event,
  observation,
  evaluatorProfileId,
  subjectProfileId,
  onRecorded,
}: ContributionEvidenceFormsProps) {
  const { t } = useLanguage();
  const dimensions = useMemo(
    () => ratingDimensionsForFunction(observation.contributionFunction),
    [observation.contributionFunction],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<ContributionEvaluatorRole>('general_observer');
  const [reason, setReason] = useState('');
  const [ratings, setRatings] = useState<Partial<Record<RatingDimension, number>>>({});
  const [conflict, setConflict] = useState<RatingConflict | ''>('');
  const [adoption, setAdoption] = useState('');
  const [population, setPopulation] = useState('');
  const [outcome, setOutcome] = useState('');
  const [claimed, setClaimed] = useState('');
  const [reach, setReach] = useState('');

  const submit = async (kind: ContributionEvidenceKind, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    try {
      const affected = role === 'affected_user' || role === 'beneficiary';
      await recordContributionEvidence({
        contributionSourceTable: event.sourceTable,
        contributionSourceId: event.sourceId,
        subjectProfileId,
        evaluatorProfileId,
        kind,
        evaluatorRole: role,
        ratings,
        reason: reason.trim() || null,
        affected,
        conflictType: conflict || null,
        conflictDisclosed: Boolean(conflict),
        payload,
        validationStatus: kind === 'independent_validation' ? 'accepted' : null,
      }, [event]);
      onRecorded();
      setReason('');
      setRatings({});
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.contributionsLedger.evidenceFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="contribution-evidence-forms">
      <p className="text-sm font-medium">{t('profile.contributionsLedger.addEvidence')}</p>
      <label className="block text-sm">
        {t('profile.contributionsLedger.evaluatorRole')}
        <select className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as ContributionEvaluatorRole)}>
          {ROLES.map((item) => (
            <option key={item} value={item}>{t(`profile.contributionsLedger.evaluatorRoles.${item}`)}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {dimensions.map((dimension) => (
          <label key={dimension} className="block text-sm">
            {t(`profile.contributionsLedger.dimensions.${dimension}`)}
            <Input
              type="number"
              min={0}
              max={100}
              value={ratings[dimension] ?? ''}
              onChange={(e) => setRatings((current) => ({ ...current, [dimension]: e.target.value === '' ? undefined : Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <label className="block text-sm">
        {t('profile.contributionsLedger.reason')}
        <textarea className="mt-1 min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="block text-sm">
        {t('profile.contributionsLedger.conflict')}
        <select className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={conflict} onChange={(e) => setConflict(e.target.value as RatingConflict | '')}>
          <option value="">{t('profile.contributionsLedger.noConflict')}</option>
          <option value="direct_collaboration">{t('profile.contributionsLedger.conflicts.direct_collaboration')}</option>
          <option value="employment">{t('profile.contributionsLedger.conflicts.employment')}</option>
          <option value="financial">{t('profile.contributionsLedger.conflicts.financial')}</option>
          <option value="affiliation">{t('profile.contributionsLedger.conflicts.affiliation')}</option>
          <option value="family">{t('profile.contributionsLedger.conflicts.family')}</option>
          <option value="adversarial">{t('profile.contributionsLedger.conflicts.adversarial')}</option>
          <option value="reciprocal">{t('profile.contributionsLedger.conflicts.reciprocal')}</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void submit(role === 'affected_user' || role === 'beneficiary' ? 'beneficiary_feedback' : 'observer_feedback')}>
          {t('profile.contributionsLedger.submitFeedback')}
        </Button>
        <Button type="button" variant="outline" disabled={busy || evaluatorProfileId === subjectProfileId} onClick={() => void submit('independent_validation')}>
          {t('profile.contributionsLedger.submitValidation')}
        </Button>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-foreground">{t('profile.contributionsLedger.addImpactEvidence')}</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label>{t('profile.contributionsLedger.claimedScope')}<Input value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder={t('profile.contributionsLedger.scopePlaceholder')} /></label>
          <label>{t('profile.contributionsLedger.realizedReach')}<Input value={reach} onChange={(e) => setReach(e.target.value)} placeholder={t('profile.contributionsLedger.scopePlaceholder')} /></label>
          <label>{t('profile.contributionsLedger.adoption')}<Input value={adoption} onChange={(e) => setAdoption(e.target.value)} /></label>
          <label>{t('profile.contributionsLedger.affectedPopulation')}<Input value={population} onChange={(e) => setPopulation(e.target.value)} /></label>
          <label>{t('profile.contributionsLedger.outcomeMetric')}<Input value={outcome} onChange={(e) => setOutcome(e.target.value)} /></label>
        </div>
        <Button className="mt-2" type="button" disabled={busy} onClick={() => void submit('impact_outcome', {
          claimedScope: claimed || undefined,
          realizedReach: reach || undefined,
          adoption: adoption ? Number(adoption) : undefined,
          affectedPopulation: population ? Number(population) : undefined,
          outcomeMetric: outcome ? Number(outcome) : undefined,
        })}>
          {t('profile.contributionsLedger.saveImpactEvidence')}
        </Button>
      </details>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
