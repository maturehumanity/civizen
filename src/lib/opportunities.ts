/**
 * Education-to-Contribution opportunity domain (Slice 1).
 * Participations are the workflow record. Score events are a derived projection.
 */
export const OPPORTUNITY_KINDS = ['education_to_contribution'] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export const OPPORTUNITY_STATUSES = ['draft', 'open', 'closed', 'cancelled'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const PARTICIPATION_STATUSES = [
  'applied',
  'accepted',
  'active',
  'submitted',
  'completed',
  'declined',
  'withdrawn',
  'cancelled',
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  'not_submitted',
  'pending',
  'verified',
  'rejected',
  'disputed',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const COMPENSATION_STATUSES = [
  'volunteer',
  'paid',
  'stipend',
  'credit',
  'learning',
  'mixed',
] as const;
export type CompensationStatus = (typeof COMPENSATION_STATUSES)[number];

export const EVALUATION_DECISIONS = ['verified', 'rejected', 'disputed'] as const;
export type EvaluationDecision = (typeof EVALUATION_DECISIONS)[number];

export const APPLICATION_REVIEW_DECISIONS = ['accept', 'decline'] as const;
export type ApplicationReviewDecision = (typeof APPLICATION_REVIEW_DECISIONS)[number];

export const OPPORTUNITY_CONTRIBUTION_SOURCE_TABLE = 'opportunity_participations';
export const OPPORTUNITY_CONTRIBUTION_EVENT_TYPE = 'opportunity_participation';

export type ContributionOpportunity = {
  id: string;
  publisherProfileId: string;
  title: string;
  summary: string;
  description: string | null;
  status: OpportunityStatus;
  opportunityKind: OpportunityKind;
  areaNodeId: string | null;
  requiredSkills: string[];
  optionalSkills: string[];
  locationText: string | null;
  isRemote: boolean;
  estimatedEffort: string | null;
  applicationDeadline: string | null;
  workStartsAt: string | null;
  workEndsAt: string | null;
  compensationStatus: CompensationStatus;
  expectedOutcome: string | null;
  evidenceRequirements: string | null;
  evaluationCriteria: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityParticipation = {
  id: string;
  opportunityId: string;
  participantProfileId: string;
  status: ParticipationStatus;
  verificationStatus: VerificationStatus;
  applicationMessage: string | null;
  appliedAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  declinedAt: string | null;
  declinedBy: string | null;
  declineNote: string | null;
  activatedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  withdrawnAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityEvidence = {
  id: string;
  participationId: string;
  description: string;
  referenceUrl: string | null;
  referenceLabel: string | null;
  createdBy: string;
  createdAt: string;
};

export type OpportunityEvaluation = {
  id: string;
  participationId: string;
  evaluatorProfileId: string;
  decision: EvaluationDecision;
  feedback: string | null;
  qualityScore: number | null;
  impactScore: number | null;
  createdAt: string;
};

export type OpportunitySkillEvidence = {
  id: string;
  participationId: string;
  evaluationId: string | null;
  skillName: string;
  createdAt: string;
};

export type OpportunityPayload = {
  title: string;
  summary: string;
  description?: string | null;
  status?: 'draft' | 'open';
  opportunityKind?: OpportunityKind;
  areaNodeId?: string | null;
  requiredSkills?: string[];
  optionalSkills?: string[];
  locationText?: string | null;
  isRemote?: boolean;
  estimatedEffort?: string | null;
  applicationDeadline?: string | null;
  workStartsAt?: string | null;
  workEndsAt?: string | null;
  compensationStatus?: CompensationStatus;
  expectedOutcome?: string | null;
  evidenceRequirements?: string | null;
  evaluationCriteria?: string | null;
};

export type ParticipantNextAction =
  | 'apply'
  | 'withdraw'
  | 'start'
  | 'submit_evidence'
  | 'wait_review'
  | 'revise'
  | 'none';

export type OrganizerNextAction =
  | 'review_application'
  | 'evaluate'
  | 'none';

const OPPORTUNITY_STATUS_SET = new Set<string>(OPPORTUNITY_STATUSES);
const PARTICIPATION_STATUS_SET = new Set<string>(PARTICIPATION_STATUSES);
const VERIFICATION_STATUS_SET = new Set<string>(VERIFICATION_STATUSES);

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return typeof value === 'string' && OPPORTUNITY_STATUS_SET.has(value);
}

export function isParticipationStatus(value: unknown): value is ParticipationStatus {
  return typeof value === 'string' && PARTICIPATION_STATUS_SET.has(value);
}

export function isVerificationStatus(value: unknown): value is VerificationStatus {
  return typeof value === 'string' && VERIFICATION_STATUS_SET.has(value);
}

export function profileCanManagePublisher(args: {
  currentProfileId: string | null | undefined;
  publisherProfileId: string;
  ownedLinkedProfileIds?: readonly string[];
}): boolean {
  const current = args.currentProfileId?.trim();
  if (!current) return false;
  if (current === args.publisherProfileId) return true;
  return (args.ownedLinkedProfileIds ?? []).includes(args.publisherProfileId);
}

export function canApplyToOpportunity(args: {
  opportunity: Pick<ContributionOpportunity, 'status' | 'applicationDeadline' | 'publisherProfileId'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
  existingParticipation?: Pick<OpportunityParticipation, 'id'> | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!args.currentProfileId) {
    return { ok: false, reason: 'not_authenticated' };
  }
  if (args.opportunity.status !== 'open') {
    return { ok: false, reason: 'opportunity_not_open' };
  }
  if (
    args.opportunity.applicationDeadline &&
    Date.parse(args.opportunity.applicationDeadline) < Date.now()
  ) {
    return { ok: false, reason: 'opportunity_deadline_passed' };
  }
  if (
    profileCanManagePublisher({
      currentProfileId: args.currentProfileId,
      publisherProfileId: args.opportunity.publisherProfileId,
      ownedLinkedProfileIds: args.ownedLinkedProfileIds,
    })
  ) {
    return { ok: false, reason: 'cannot_apply_to_own_opportunity' };
  }
  if (args.existingParticipation) {
    return { ok: false, reason: 'already_applied' };
  }
  return { ok: true };
}

export function canTransitionOpportunityStatus(
  from: OpportunityStatus,
  to: OpportunityStatus,
): boolean {
  if (from === to) return true;
  if (from === 'cancelled') return false;
  if (from === 'draft') return to === 'open' || to === 'cancelled';
  if (from === 'open') return to === 'closed' || to === 'cancelled';
  if (from === 'closed') return to === 'open' || to === 'cancelled';
  return false;
}

export function canWithdrawParticipation(status: ParticipationStatus): boolean {
  return status === 'applied' || status === 'accepted';
}

export function canReviewApplication(status: ParticipationStatus): boolean {
  return status === 'applied';
}

export function canStartWork(status: ParticipationStatus): boolean {
  return status === 'accepted';
}

export function canAddEvidence(participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'>): boolean {
  if (participation.status === 'active') return true;
  return (
    participation.status === 'submitted' &&
    (participation.verificationStatus === 'pending' || participation.verificationStatus === 'rejected')
  );
}

export function canSubmitWork(participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'>): boolean {
  if (participation.status === 'active') return true;
  return (
    participation.status === 'submitted' &&
    (participation.verificationStatus === 'rejected' || participation.verificationStatus === 'pending')
  );
}

export function canEvaluateWork(participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'>): boolean {
  return (
    participation.status === 'submitted' &&
    (participation.verificationStatus === 'pending' ||
      participation.verificationStatus === 'rejected' ||
      participation.verificationStatus === 'disputed')
  );
}

export function forbidSelfEvaluation(
  participantProfileId: string,
  evaluatorProfileId: string | null | undefined,
): boolean {
  return Boolean(evaluatorProfileId && evaluatorProfileId === participantProfileId);
}

export function participantNextAction(args: {
  opportunity: Pick<ContributionOpportunity, 'status' | 'applicationDeadline' | 'publisherProfileId'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
  participation: OpportunityParticipation | null;
}): ParticipantNextAction {
  const { participation } = args;
  if (
    profileCanManagePublisher({
      currentProfileId: args.currentProfileId,
      publisherProfileId: args.opportunity.publisherProfileId,
      ownedLinkedProfileIds: args.ownedLinkedProfileIds,
    })
  ) {
    return 'none';
  }
  if (!participation) {
    return canApplyToOpportunity({ ...args, existingParticipation: null }).ok ? 'apply' : 'none';
  }
  if (canWithdrawParticipation(participation.status)) {
    return participation.status === 'accepted' ? 'start' : 'withdraw';
  }
  if (canStartWork(participation.status)) return 'start';
  if (participation.status === 'submitted' && participation.verificationStatus === 'pending') {
    return 'wait_review';
  }
  if (participation.verificationStatus === 'rejected') return 'revise';
  if (participation.status === 'active') return 'submit_evidence';
  return 'none';
}

export function organizerNextAction(
  participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'> | null,
): OrganizerNextAction {
  if (!participation) return 'none';
  if (canReviewApplication(participation.status)) return 'review_application';
  if (canEvaluateWork(participation)) return 'evaluate';
  return 'none';
}

/** Public lifecycle label — hides internal verification nuance except when it is the next useful fact. */
export function publicParticipationLabel(
  participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'>,
): ParticipationStatus | 'revision_needed' {
  if (participation.status === 'active' && participation.verificationStatus === 'rejected') {
    return 'revision_needed';
  }
  return participation.status;
}

export function isVerifiedCompletedParticipation(
  participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'>,
): boolean {
  return participation.status === 'completed' && participation.verificationStatus === 'verified';
}

export function shouldProjectScoreEvent(
  participation: Pick<OpportunityParticipation, 'status' | 'verificationStatus'>,
): boolean {
  return isVerifiedCompletedParticipation(participation);
}

export function buildOpportunityScoreEvent(args: {
  participation: OpportunityParticipation;
  opportunity: Pick<ContributionOpportunity, 'title' | 'opportunityKind'>;
  evaluation?: Pick<OpportunityEvaluation, 'qualityScore' | 'impactScore'> | null;
}): {
  profileId: string;
  sourceTable: string;
  sourceId: string;
  eventType: typeof OPPORTUNITY_CONTRIBUTION_EVENT_TYPE;
  title: string;
  summary: string;
  capacityEstimate: number;
  impactEstimate: number;
  collaborationEstimate: number;
  beneficiaryEstimate: number;
  verified: boolean;
  occurredAt: string;
  rawMeta: { kind: OpportunityKind };
} {
  const quality = args.evaluation?.qualityScore;
  const impact = args.evaluation?.impactScore;
  const capacityEstimate = clampScoreFactor(quality ?? 75);
  const impactEstimate = clampScoreFactor((impact ?? 70) * 1.25);
  return {
    profileId: args.participation.participantProfileId,
    sourceTable: OPPORTUNITY_CONTRIBUTION_SOURCE_TABLE,
    sourceId: args.participation.id,
    eventType: OPPORTUNITY_CONTRIBUTION_EVENT_TYPE,
    title: args.opportunity.title.trim().slice(0, 120) || 'Verified contribution',
    summary: args.opportunity.opportunityKind,
    capacityEstimate,
    impactEstimate,
    collaborationEstimate: 40,
    beneficiaryEstimate: 65,
    verified: true,
    occurredAt: args.participation.completedAt ?? args.participation.updatedAt,
    rawMeta: { kind: args.opportunity.opportunityKind },
  };
}

function clampScoreFactor(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
export {
  demonstratedExperienceFromVerified,
  demonstratedSkillsNotInDeclared,
  mapContributionOpportunity,
  mapOpportunityEvaluation,
  mapOpportunityEvidence,
  mapOpportunityParticipation,
  mapOpportunitySkillEvidence,
  mapOpportunityApplicantIdentity,
  opportunityCardSkills,
  parseOptionalEvaluationScore,
  toOpportunityPayloadJson,
} from '@/lib/opportunities-map';
export type { DemonstratedExperience, OpportunityApplicantIdentity } from '@/lib/opportunities-map';
