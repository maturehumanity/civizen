import { evaluateGovernanceEligibility, type GovernanceEligibilityResult } from '../governance-eligibility';
import type { AppRole } from '../access-control';
import { securityClassGatePolicy, type SecurityClassGatePolicy } from './security-class';
import type { CivicElectionSecurityClass, CivicVerificationCheckKind } from './types';

export type CivicVotingEligibilityInput = {
  isVerified: boolean;
  role?: AppRole | null;
  score: number | null;
  isNativeMobileApp: boolean;
  isSanctioned?: boolean;
  isOnEligibilityRoster?: boolean;
  alreadyVoted?: boolean;
  homeCoolingOffActive?: boolean;
  identityCoolingOffActive?: boolean;
  clientAttestationFailed?: boolean;
  securityClass: CivicElectionSecurityClass;
};

export type CivicVotingEligibilityReason =
  | 'mobile_app_required'
  | 'verified_required'
  | 'minimum_score_required'
  | 'score_unavailable'
  | 'sanctioned'
  | 'not_on_roster'
  | 'already_voted'
  | 'home_cooling_off'
  | 'identity_cooling_off'
  | 'client_attestation_failed'
  | 'gates_incomplete';

export type CivicVotingEligibilityResult = {
  eligible: boolean;
  reasons: CivicVotingEligibilityReason[];
  governance: GovernanceEligibilityResult;
  requiredGates: CivicVerificationCheckKind[];
  policy: SecurityClassGatePolicy;
};

export function requiredGatesForPolicy(policy: SecurityClassGatePolicy): CivicVerificationCheckKind[] {
  const gates: CivicVerificationCheckKind[] = ['eligibility', 'device'];
  if (policy.requireNativeApp) {
    gates.push('attestation');
  }
  if (policy.requireHomePresence) {
    gates.push('location_home');
  }
  if (policy.requireSolitude) {
    gates.push('solitude');
  }
  if (policy.requireFaceLiveness) {
    gates.push('liveness', 'face_match');
  }
  return gates;
}

export function evaluateCivicVotingEligibility(
  input: CivicVotingEligibilityInput,
): CivicVotingEligibilityResult {
  const policy = securityClassGatePolicy(input.securityClass);
  const governance = evaluateGovernanceEligibility({
    isVerified: input.isVerified,
    role: input.role,
    score: input.score,
    isNativeMobileApp: input.isNativeMobileApp || !policy.requireNativeApp,
  });

  const reasons: CivicVotingEligibilityReason[] = [];

  for (const reason of governance.reasons) {
    reasons.push(reason);
  }

  if (input.isSanctioned) {
    reasons.push('sanctioned');
  }

  if (input.isOnEligibilityRoster === false) {
    reasons.push('not_on_roster');
  }

  if (input.alreadyVoted) {
    reasons.push('already_voted');
  }

  if (input.homeCoolingOffActive) {
    reasons.push('home_cooling_off');
  }

  if (input.identityCoolingOffActive) {
    reasons.push('identity_cooling_off');
  }

  if (input.clientAttestationFailed) {
    reasons.push('client_attestation_failed');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    governance,
    requiredGates: requiredGatesForPolicy(policy),
    policy,
  };
}

export type GateEvaluation = {
  kind: CivicVerificationCheckKind;
  passed: boolean;
  optional?: boolean;
};

/**
 * All non-optional gates must pass before the sealed booth opens.
 */
export function evaluateSessionGates(gates: GateEvaluation[]): {
  canOpenBooth: boolean;
  failed: CivicVerificationCheckKind[];
} {
  const failed = gates.filter((g) => !g.passed && !g.optional).map((g) => g.kind);
  return { canOpenBooth: failed.length === 0, failed };
}

export type SolitudeSignal = {
  faceCount: number;
  dominantFaceConfidence: number;
  secondaryFaceMaxConfidence: number;
};

/**
 * Soft solitude heuristic for constitutional / high-stakes sessions.
 * Single dominant face; no confident secondary face.
 */
export function evaluateSolitude(signal: SolitudeSignal): {
  alone: boolean;
  reason?: string;
} {
  if (signal.faceCount <= 0) {
    return { alone: false, reason: 'no_face_detected' };
  }
  if (signal.faceCount > 1 && signal.secondaryFaceMaxConfidence >= 0.45) {
    return { alone: false, reason: 'secondary_face_detected' };
  }
  if (signal.dominantFaceConfidence < 0.55) {
    return { alone: false, reason: 'dominant_face_weak' };
  }
  return { alone: true };
}

export type FaceMatchSignal = {
  matchScore: number;
  livenessPassed: boolean;
  minMatchScore?: number;
};

export function evaluateFaceAndLiveness(signal: FaceMatchSignal): {
  passed: boolean;
  reasons: string[];
} {
  const minMatch = signal.minMatchScore ?? 0.82;
  const reasons: string[] = [];
  if (!signal.livenessPassed) reasons.push('liveness_failed');
  if (signal.matchScore < minMatch) reasons.push('face_match_failed');
  return { passed: reasons.length === 0, reasons };
}
