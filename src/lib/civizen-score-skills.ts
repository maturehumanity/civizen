/**
 * Civizen Score V2 — declared vs demonstrated skills and project evidence.
 * Matching declared + demonstrated skills stay one canonical skill.
 */

import {
  EXPERIENCE_PROJECT_PRIOR_STRENGTH,
  EXPERIENCE_PROJECT_SIGNAL_FALLBACK,
  EXPERIENCE_PROJECT_SIGNAL_MIN,
  EXPERIENCE_PROJECT_SIGNAL_SPAN,
  EXPERIENCE_PROJECT_SUPPORT_MAX,
  blendActivityEvaluation,
  clampScoreValue,
  isWithinRecentWindow,
  observationWeight,
  uniqueEvidenceRoots,
  type CategoryObservation,
  type EvidenceRootRef,
} from '@/lib/civizen-score-model';

export type CanonicalSkillState = {
  id: string;
  name: string;
  declared: boolean;
  demonstrated: boolean;
  verifiedDemonstrations: number;
  lastDemonstratedAt: string | null;
  evidenceRoots: string[];
};

export type DemonstratedProjectEvidence = {
  opportunityId?: string | null;
  participationId?: string | null;
  evidenceRootId?: string;
  verified?: boolean;
  completedAt?: string | null;
  durationMinutes?: number | null;
  quality?: number | null;
  impact?: number | null;
};

/**
 * Prefer a stable skill/concept ID when the caller already has one.
 * TODO(model-evolution): when a skills taxonomy exists in the classification
 * registry, match declared and demonstrated skills by registry node ID.
 * Lowercase display-name matching is an explicit temporary fallback only —
 * do not treat this as a taxonomy migration.
 */
export function canonicalSkillId(name: string, stableId?: string | null): string {
  const id = typeof stableId === 'string' ? stableId.trim() : '';
  if (id) return id;
  return name.trim().toLowerCase();
}

export function mergeCanonicalSkills(args: {
  declaredNames: string[];
  demonstrated: Array<{
    skillName: string;
    skillId?: string | null;
    evidenceRootId: string;
    verified?: boolean;
    demonstratedAt?: string | null;
  }>;
}): CanonicalSkillState[] {
  const byId = new Map<string, CanonicalSkillState>();

  const upsert = (name: string, stableId?: string | null): CanonicalSkillState => {
    const trimmed = name.trim();
    const id = canonicalSkillId(trimmed, stableId);
    const existing = byId.get(id);
    if (existing) return existing;
    const created: CanonicalSkillState = {
      id,
      name: trimmed,
      declared: false,
      demonstrated: false,
      verifiedDemonstrations: 0,
      lastDemonstratedAt: null,
      evidenceRoots: [],
    };
    byId.set(id, created);
    return created;
  };

  for (const name of args.declaredNames) {
    if (!name.trim()) continue;
    upsert(name).declared = true;
  }

  for (const item of args.demonstrated) {
    if (!item.skillName.trim()) continue;
    const skill = upsert(item.skillName, item.skillId);
    skill.demonstrated = true;
    if (item.verified !== false) {
      const root = item.evidenceRootId;
      if (!skill.evidenceRoots.includes(root)) {
        skill.evidenceRoots.push(root);
        skill.verifiedDemonstrations += 1;
      }
    }
    if (item.demonstratedAt) {
      if (
        !skill.lastDemonstratedAt ||
        Date.parse(item.demonstratedAt) > Date.parse(skill.lastDemonstratedAt)
      ) {
        skill.lastDemonstratedAt = item.demonstratedAt;
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function countVerifiedUniqueSkills(skills: CanonicalSkillState[]): number {
  return skills.filter((skill) => skill.demonstrated && skill.verifiedDemonstrations > 0).length;
}

export function countRecentlyDemonstratedSkills(
  skills: CanonicalSkillState[],
  nowMs = Date.now(),
): number {
  return skills.filter(
    (skill) =>
      skill.demonstrated &&
      skill.verifiedDemonstrations > 0 &&
      isWithinRecentWindow(skill.lastDemonstratedAt, nowMs),
  ).length;
}

export function uniqueProjectRoots(projects: DemonstratedProjectEvidence[]): string[] {
  const ids = new Set<string>();
  for (const project of projects) {
    const id =
      project.evidenceRootId ||
      (project.participationId ? `opportunity_participations:${project.participationId}` : null) ||
      (project.opportunityId ? `contribution_opportunities:${project.opportunityId}` : null);
    if (id) ids.add(id);
  }
  return [...ids].sort();
}

function projectRootRef(project: DemonstratedProjectEvidence): EvidenceRootRef | null {
  const id =
    project.evidenceRootId ||
    (project.participationId ? `opportunity_participations:${project.participationId}` : null) ||
    (project.opportunityId ? `contribution_opportunities:${project.opportunityId}` : null);
  if (!id) return null;
  const [sourceTable, ...rest] = id.split(':');
  return {
    id,
    sourceTable: sourceTable || 'opportunity_participations',
    sourceId: rest.join(':') || id,
    verified: project.verified !== false,
    occurredAt: project.completedAt,
  };
}

function projectExperienceSignal(project: DemonstratedProjectEvidence): number {
  const evaluation = blendActivityEvaluation({
    quality: project.quality,
    impact: project.impact,
  });
  if (evaluation == null) return EXPERIENCE_PROJECT_SIGNAL_FALLBACK;
  return EXPERIENCE_PROJECT_SIGNAL_MIN + (evaluation / 100) * EXPERIENCE_PROJECT_SIGNAL_SPAN;
}

/**
 * Conservative demonstrated-project support on the Experience scale.
 * Unique roots only. Prior center is 0 so projects cannot mint ~50 tenure.
 * Tiny/short activities stay small; many of them do not stack linearly.
 */
export function projectSupportForExperience(
  projects: DemonstratedProjectEvidence[],
  options?: { nowMs?: number },
): { support: number; uniqueCount: number; effectiveVolume: number } {
  const refs = projects.map(projectRootRef).filter((item): item is EvidenceRootRef => item != null);
  const unique = uniqueEvidenceRoots(refs);
  if (unique.length === 0) {
    return { support: 0, uniqueCount: 0, effectiveVolume: 0 };
  }
  const byId = new Map(projects.map((project) => {
    const ref = projectRootRef(project);
    return [ref?.id ?? '', project] as const;
  }));
  let weighted = 0;
  let volume = 0;
  for (const root of unique) {
    const project = byId.get(root.id);
    const observation: CategoryObservation = {
      evidenceRootId: root.id,
      value: projectExperienceSignal(project ?? {}),
      verified: root.verified,
      occurredAt: root.occurredAt,
      durationMinutes: project?.durationMinutes,
    };
    const weight = observationWeight(observation, { nowMs: options?.nowMs });
    weighted += weight * observation.value;
    volume += weight;
  }
  if (volume <= 0) return { support: 0, uniqueCount: unique.length, effectiveVolume: 0 };
  const support = Math.min(
    EXPERIENCE_PROJECT_SUPPORT_MAX,
    (volume * (weighted / volume)) / (EXPERIENCE_PROJECT_PRIOR_STRENGTH + volume),
  );
  return {
    support: clampScoreValue(support),
    uniqueCount: unique.length,
    effectiveVolume: Math.round(volume * 100) / 100,
  };
}
