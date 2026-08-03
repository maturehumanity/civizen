/**
 * Open-source client attestation — compare running build to published voting channel manifest.
 */

export type VotingClientManifest = {
  appVersion: string;
  appReleaseId: string;
  androidVersionCode: number;
  packageFingerprints?: string[];
  channel: 'testing' | 'release' | 'voting';
};

export type ClientAttestationInput = {
  appVersion: string;
  appReleaseId: string;
  androidVersionCode: number;
  packageFingerprint?: string | null;
  manifest: VotingClientManifest;
};

export type ClientAttestationResult = {
  ok: boolean;
  reasons: string[];
  expectedReleaseId: string;
};

export function attestVotingClient(input: ClientAttestationInput): ClientAttestationResult {
  const reasons: string[] = [];

  if (input.appReleaseId !== input.manifest.appReleaseId) {
    reasons.push('release_id_mismatch');
  }
  if (input.appVersion !== input.manifest.appVersion) {
    reasons.push('version_mismatch');
  }
  if (input.androidVersionCode !== input.manifest.androidVersionCode) {
    reasons.push('version_code_mismatch');
  }

  const allowed = input.manifest.packageFingerprints ?? [];
  if (allowed.length > 0) {
    if (!input.packageFingerprint) {
      reasons.push('package_fingerprint_missing');
    } else if (!allowed.includes(input.packageFingerprint)) {
      reasons.push('package_fingerprint_mismatch');
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    expectedReleaseId: input.manifest.appReleaseId,
  };
}

export function buildVotingManifestFromRelease(input: {
  appVersion: string;
  appReleaseId: string;
  androidVersionCode: number;
  packageFingerprints?: string[];
  channel?: VotingClientManifest['channel'];
}): VotingClientManifest {
  return {
    appVersion: input.appVersion,
    appReleaseId: input.appReleaseId,
    androidVersionCode: input.androidVersionCode,
    packageFingerprints: input.packageFingerprints,
    channel: input.channel ?? 'voting',
  };
}

/** Reproducible-build hint: release id should embed version for auditability. */
export function releaseIdLooksReproducible(appReleaseId: string, appVersion: string): boolean {
  return appReleaseId.includes(appVersion) || appReleaseId.includes(`v${appVersion}`);
}
