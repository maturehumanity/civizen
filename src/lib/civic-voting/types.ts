/**
 * Civic voting domain types — see docs/01-governance/participation/civic-voting-system-design-v0.1.md
 */

export type CivicElectionTier =
  | 'neighborhood'
  | 'local'
  | 'district'
  | 'regional'
  | 'national'
  | 'supranational';

export type CivicElectionSecurityClass = 'ordinary' | 'elevated' | 'constitutional';

export type CivicElectionStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'certified'
  | 'cancelled';

export type CivicContestKind = 'office' | 'measure' | 'open_nomination';

export type CivicVoteSessionStatus =
  | 'scheduled'
  | 'notified'
  | 'in_progress'
  | 'cast'
  | 'missed'
  | 'failed'
  | 'voided'
  | 'exhausted';

export type CivicVerificationCheckKind =
  | 'eligibility'
  | 'device'
  | 'location_home'
  | 'solitude'
  | 'liveness'
  | 'face_match'
  | 'attestation';

export type CivicVerificationCheckResult = 'passed' | 'failed' | 'skipped' | 'inconclusive';

export type CivicRiskSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type CivicElection = {
  id: string;
  title: string;
  summary: string;
  tier: CivicElectionTier;
  securityClass: CivicElectionSecurityClass;
  status: CivicElectionStatus;
  scopeCountryCode: string | null;
  scopeRegionCode: string | null;
  scopeLocalityCode: string | null;
  votingOpensAt: string;
  votingClosesAt: string;
  primaryWindowSeconds: number;
  maxAttempts: number;
  retrySpacingHours: number;
  requireHomePresence: boolean;
  requireSolitude: boolean;
  requireFaceLiveness: boolean;
};

export type CivicContest = {
  id: string;
  electionId: string;
  title: string;
  contestKind: CivicContestKind;
  officeKey: string | null;
  seatCount: number;
  allowAbstain: boolean;
  sortOrder: number;
};

export type CivicCandidate = {
  id: string;
  contestId: string;
  displayName: string;
  statement: string;
  profileId: string | null;
  sortOrder: number;
};

export const CIVIC_ELECTION_TIER_LABELS: Record<CivicElectionTier, string> = {
  neighborhood: 'Neighborhood',
  local: 'Local authority',
  district: 'District',
  regional: 'Regional',
  national: 'National',
  supranational: 'Supranational',
};

export const CIVIC_SECURITY_CLASS_LABELS: Record<CivicElectionSecurityClass, string> = {
  ordinary: 'Ordinary',
  elevated: 'Elevated',
  constitutional: 'Constitutional',
};
