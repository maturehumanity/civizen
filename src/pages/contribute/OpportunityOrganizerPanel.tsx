import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  organizerNextAction,
  parseOptionalEvaluationScore,
  type ContributionOpportunity,
  type OpportunityApplicantIdentity,
  type OpportunityEvidence,
  type OpportunityParticipation,
} from '@/lib/opportunities';
import {
  evaluateOpportunityWork,
  listOpportunityApplicantIdentities,
  reviewOpportunityApplication,
  setContributionOpportunityStatus,
} from '@/lib/opportunities-api';
import { OpportunityEvidenceList } from '@/pages/contribute/OpportunityEvidenceList';
import { toast } from 'sonner';

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function parseScores(qualityRaw: string, impactRaw: string) {
  const quality = parseOptionalEvaluationScore(qualityRaw);
  const impact = parseOptionalEvaluationScore(impactRaw);
  if (!quality.ok || !impact.ok) return null;
  return { qualityScore: quality.value, impactScore: impact.value };
}

export function OpportunityOrganizerPanel({
  opportunity,
  applicants,
  busy,
  reviewingId,
  reviewEvidence,
  evalFeedback,
  evalSkills,
  onReviewingId,
  onEvalFeedback,
  onEvalSkills,
  onAction,
}: {
  opportunity: ContributionOpportunity;
  applicants: OpportunityParticipation[];
  busy: boolean;
  reviewingId: string | null;
  reviewEvidence: OpportunityEvidence[];
  evalFeedback: string;
  evalSkills: string;
  onReviewingId: (id: string | null) => void;
  onEvalFeedback: (value: string) => void;
  onEvalSkills: (value: string) => void;
  onAction: (action: () => Promise<unknown>, successKey: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [identities, setIdentities] = useState<Map<string, OpportunityApplicantIdentity>>(new Map());
  const [qualityScore, setQualityScore] = useState('');
  const [impactScore, setImpactScore] = useState('');
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    if (applicants.length === 0) {
      setIdentities(new Map());
      return;
    }
    let cancelled = false;
    void listOpportunityApplicantIdentities(opportunity.id)
      .then((rows) => {
        if (cancelled) return;
        setIdentities(new Map(rows.map((row) => [row.participationId, row])));
      })
      .catch(() => {
        if (!cancelled) setIdentities(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [applicants, opportunity.id]);

  const evaluate = (applicantId: string, decision: 'verified' | 'rejected') => {
    const scores = parseScores(qualityScore, impactScore);
    if (!scores) {
      toast.error(t('contribute.opportunities.evaluationScoresInvalid'));
      return;
    }
    void onAction(async () => {
      await evaluateOpportunityWork({
        participationId: applicantId,
        decision,
        feedback: evalFeedback,
        qualityScore: scores.qualityScore,
        impactScore: scores.impactScore,
        skillNames:
          decision === 'verified'
            ? evalSkills.split(',').map((name) => name.trim()).filter(Boolean)
            : [],
      });
      onReviewingId(null);
    }, decision === 'verified' ? 'contribute.opportunities.verified' : 'contribute.opportunities.revisionRequested');
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('contribute.opportunities.applicantsTitle')}
      </h2>
      {opportunity.status === 'draft' ? (
        <Button
          disabled={busy}
          onClick={() =>
            onAction(() => setContributionOpportunityStatus(opportunity.id, 'open'), 'contribute.opportunities.published')
          }
        >
          {t('contribute.opportunities.publish')}
        </Button>
      ) : null}
      {opportunity.status === 'open' ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            onAction(() => setContributionOpportunityStatus(opportunity.id, 'closed'), 'contribute.opportunities.closed')
          }
        >
          {t('contribute.opportunities.closeOpportunity')}
        </Button>
      ) : null}
      {applicants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('contribute.opportunities.noApplicants')}</p>
      ) : (
        applicants.map((applicant) => {
          const organizerAction = organizerNextAction(applicant);
          const identity = identities.get(applicant.id);
          const displayName = identity?.displayName || t('contribute.opportunities.unnamedApplicant');
          return (
            <Card key={applicant.id} className="space-y-3 border-border/70 bg-card/95 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={identity?.avatarUrl || undefined} alt="" />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {initialsFor(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {identity?.profileId ? (
                      <Link
                        to={`/user/${identity.profileId}`}
                        className="block truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">{displayName}</p>
                    )}
                    {identity?.username ? (
                      <p className="truncate text-xs text-muted-foreground">@{identity.username}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t(`contribute.opportunities.participationStatus.${applicant.status}`)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {t(`contribute.opportunities.verification.${applicant.verificationStatus}`)}
                </Badge>
              </div>
              {applicant.applicationMessage ? (
                <p className="text-sm text-muted-foreground">{applicant.applicationMessage}</p>
              ) : null}
              {organizerAction === 'review_application' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      onAction(
                        () => reviewOpportunityApplication(applicant.id, 'accept'),
                        'contribute.opportunities.accepted',
                      )
                    }
                  >
                    {t('contribute.opportunities.accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      onAction(
                        () => reviewOpportunityApplication(applicant.id, 'decline'),
                        'contribute.opportunities.declined',
                      )
                    }
                  >
                    {t('contribute.opportunities.decline')}
                  </Button>
                </div>
              ) : null}
              {organizerAction === 'evaluate' ? (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReviewingId(reviewingId === applicant.id ? null : applicant.id)}
                  >
                    {t('contribute.opportunities.evaluate')}
                  </Button>
                  {reviewingId === applicant.id ? (
                    <div className="space-y-2">
                      <OpportunityEvidenceList
                        items={reviewEvidence}
                        emptyLabel={t('contribute.opportunities.noEvidence')}
                        referenceLabel={t('contribute.opportunities.reference')}
                      />
                      <Textarea
                        value={evalFeedback}
                        onChange={(event) => onEvalFeedback(event.target.value)}
                        placeholder={t('contribute.opportunities.feedbackPlaceholder')}
                        rows={3}
                      />
                      <Input
                        value={evalSkills}
                        onChange={(event) => onEvalSkills(event.target.value)}
                        placeholder={t('contribute.opportunities.skillsPlaceholder')}
                      />
                      <Collapsible open={showScores} onOpenChange={setShowScores}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {t('contribute.opportunities.moreDetails')}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          <p className="text-xs text-muted-foreground">
                            {t('contribute.opportunities.evaluationScoresHint')}
                          </p>
                          <Label htmlFor={`quality-${applicant.id}`}>
                            {t('contribute.opportunities.qualityScore')}
                          </Label>
                          <Input
                            id={`quality-${applicant.id}`}
                            inputMode="decimal"
                            value={qualityScore}
                            onChange={(event) => setQualityScore(event.target.value)}
                          />
                          <Label htmlFor={`impact-${applicant.id}`}>
                            {t('contribute.opportunities.impactScore')}
                          </Label>
                          <Input
                            id={`impact-${applicant.id}`}
                            inputMode="decimal"
                            value={impactScore}
                            onChange={(event) => setImpactScore(event.target.value)}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={busy} onClick={() => evaluate(applicant.id, 'verified')}>
                          {t('contribute.opportunities.verify')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => evaluate(applicant.id, 'rejected')}
                        >
                          {t('contribute.opportunities.requestRevision')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </section>
  );
}
