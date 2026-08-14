/** Development contribution evidence: journal stays stored; only outcomes mint score roots. */

import {
  inferHumanContributionRolesFromText,
  isTrivialCosmeticHumanInput,
} from '@/lib/civizen-human-contribution-substance';

export type DevelopmentEvidenceEligibility =
  | 'journal_only'
  | 'provenance_only'
  | 'system_verified'
  | 'independently_validated'
  | 'outcome_validated';

export type DevelopmentContributionRole =
  | 'founder' | 'product_architect' | 'system_architect' | 'product_direction' | 'requirements'
  | 'problem_identification' | 'research' | 'design' | 'ux_design' | 'review' | 'quality_assurance'
  | 'validation' | 'implementation' | 'documentation' | 'governance_design' | 'coordination';

export type DevelopmentStoryEvidenceInput = {
  id?: string | null; sourceStoryKey?: string | null; source?: string | null; sourceType?: string | null;
  status?: string | null; title?: string | null; originalInstruction?: string | null; rephrasedDescription?: string | null;
  createdFeatures?: string[] | null; area?: string | null; commitSha?: string | null; prNumber?: number | null;
  reviewedBy?: string | null; chatId?: string | null; requestedAt?: string | null; createdAt?: string | null;
  metadata?: Record<string, unknown> | null; outcomeRootId?: string | null; testsPassed?: boolean | null;
  published?: boolean | null; roles?: DevelopmentContributionRole[] | null; implementationAssisted?: boolean | null;
};

export type DevelopmentEvidenceEvaluation = {
  eligibility: DevelopmentEvidenceEligibility; qualifiesAsContribution: boolean; verified: boolean;
  independentValidation: boolean; outcomeValidated: boolean; provenanceOnly: boolean; substantiveInstruction: boolean;
  evidenceRootId: string | null; groupingKey: string | null; realFeatures: string[]; roles: DevelopmentContributionRole[];
  implementationAssisted: boolean; reasons: string[];
};

export type EligibleDevelopmentContribution = {
  groupingKey: string; sourceId: string; title: string; summary: string; verified: boolean;
  eligibility: DevelopmentEvidenceEligibility; occurredAt: string; provenanceStoryIds: string[];
  commitShas: string[]; realFeatures: string[]; roles: DevelopmentContributionRole[];
  implementationAssisted: boolean; instruction: string; independentValidation: boolean;
  outcomeValidated: boolean; classifiedDomain: string | null; contributionFunction: string | null;
  testsPassed: boolean; affectedPaths: string[]; reconstructionResult: string | null;
  survivingImplementation: boolean | null; linkedInstructions: string[];
};

const PLACEHOLDER_FEATURE =
  /backfilled from chat|recorded from git history|cursor agent chat export|source:\s*cursor/i;

const PROCESS_ONLY =
  /^(yes|yep|ok|okay|continue|proceed|thanks|thank you|please continue|go on)[.!?]*$/i;

const PROCESS_PHRASE =
  /\b(move on|commit it|just commit|push it|build and ship|next slice)\b/i;

const QUESTION_START =
  /^(what|why|how|when|where|who|can you|could you|would you|is there|does this|do you)\b/i;

const SUBSTANTIVE =
  /\b(architect|architecture|invariant|redesign|requirement|governance|framework|classification|inclusion|accessib|integrat|principle|systemic|subsystem|evidence root|maturity|canonical|operating model|contribution record)\b/i;

const SUBSTANTIVE_ACTION =
  /\b(define|correct|specify|redesign|establish|introduce|separate|canonicalize|distinguish)\b/i;

const CLASSIFIED_DOMAIN_IDS = new Set([
  'education_skills',
  'culture_ethics',
  'responsibility_reliability',
  'environment_community',
  'economy_contribution',
]);

export function normalizeInstruction(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function isPlaceholderFeature(feature: string): boolean {
  return PLACEHOLDER_FEATURE.test(feature.trim());
}

export function realCreatedFeatures(features?: string[] | null): string[] {
  return (features ?? []).map((item) => item.trim()).filter((item) => item.length > 0 && !isPlaceholderFeature(item));
}

export function isProcessOnlyInstruction(text?: string | null): boolean {
  const t = normalizeInstruction(text);
  if (!t) return true;
  if (PROCESS_ONLY.test(t)) return true;
  if (t.length < 48 && PROCESS_PHRASE.test(t) && !SUBSTANTIVE.test(t)) return true;
  if (PROCESS_PHRASE.test(t) && t.length < 80 && !SUBSTANTIVE_ACTION.test(t)) return true;
  return false;
}

export function isOrdinaryQuestion(text?: string | null): boolean {
  const t = normalizeInstruction(text);
  if (!t) return false;
  if (!QUESTION_START.test(t)) return false;
  if (SUBSTANTIVE.test(t) || (SUBSTANTIVE_ACTION.test(t) && t.length > 120)) return false;
  return t.length < 180;
}

export function isSubstantiveInstruction(text?: string | null): boolean {
  const t = normalizeInstruction(text);
  if (!t || isProcessOnlyInstruction(t) || isOrdinaryQuestion(t)) return false;
  if (SUBSTANTIVE.test(t)) return true;
  if (SUBSTANTIVE_ACTION.test(t) && t.length >= 80) return true;
  return t.length >= 160 && /\b(should|must|need to|so that|in order to)\b/i.test(t);
}

export function isLegacyChatBackfill(story: DevelopmentStoryEvidenceInput): boolean {
  const key = (story.sourceStoryKey ?? '').toLowerCase();
  const source = (story.source ?? story.sourceType ?? '').toLowerCase();
  return key.startsWith('chat:') || source === 'chat';
}

export function classifiedDomainForDevelopmentStory(story: DevelopmentStoryEvidenceInput): string | null {
  const area = typeof story.area === 'string' ? story.area.trim() : '';
  if (CLASSIFIED_DOMAIN_IDS.has(area)) return area;
  const metaDomain = metaString(story.metadata ?? null, 'domain');
  if (metaDomain && CLASSIFIED_DOMAIN_IDS.has(metaDomain)) return metaDomain;
  return null;
}

export function inferDevelopmentContributionRoles(
  story: DevelopmentStoryEvidenceInput,
  instruction: string,
): DevelopmentContributionRole[] {
  if (Array.isArray(story.roles) && story.roles.length > 0) return [...new Set(story.roles)];
  const fromMeta = story.metadata?.roles;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) {
    return [...new Set(fromMeta as DevelopmentContributionRole[])];
  }
  const assisted =
    story.implementationAssisted === true || metaBool(story.metadata, 'implementationAssisted');
  if (!assisted && !isSubstantiveInstruction(instruction)) return [];
  const paths = Array.isArray(story.metadata?.affectedPaths)
    ? story.metadata.affectedPaths.filter((path): path is string => typeof path === 'string')
    : [];
  return inferHumanContributionRolesFromText(instruction, { assisted, paths });
}

function metaBool(metadata: Record<string, unknown> | null | undefined, key: string): boolean {
  return metadata?.[key] === true;
}

function metaString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function outcomeKey(story: DevelopmentStoryEvidenceInput): string | null {
  const fromStory = typeof story.outcomeRootId === 'string' ? story.outcomeRootId.trim() : '';
  if (fromStory) return `outcome:${fromStory}`;
  const fromMeta = metaString(story.metadata ?? null, 'outcomeRootId');
  if (fromMeta) return `outcome:${fromMeta}`;
  if (typeof story.prNumber === 'number' && Number.isFinite(story.prNumber)) return `pr:${story.prNumber}`;
  return null;
}

function hasRealCommit(story: DevelopmentStoryEvidenceInput): boolean {
  const sha = (story.commitSha ?? '').trim();
  return sha.length >= 7 && !/^placeholder$/i.test(sha);
}

function isFailedOrUnshipped(story: DevelopmentStoryEvidenceInput): boolean {
  const status = (story.status ?? '').toLowerCase();
  return (
    status === 'failed' || status === 'unshipped' || status === 'draft' ||
    story.testsPassed === false || story.metadata?.testsPassed === false ||
    story.metadata?.unshipped === true
  );
}

function hasSystemVerificationChain(story: DevelopmentStoryEvidenceInput, features: string[]): boolean {
  const testsPassed = story.testsPassed === true || metaBool(story.metadata, 'testsPassed');
  const artifacts = features.length > 0 && !isFailedOrUnshipped(story) &&
    (hasRealCommit(story) || story.prNumber != null);
  if (!artifacts) return false;
  if (testsPassed) return true;
  return metaBool(story.metadata, 'historicalReconstruction') && metaBool(story.metadata, 'survivingImplementation');
}

function ineligible(
  eligibility: 'journal_only' | 'provenance_only',
  story: DevelopmentStoryEvidenceInput,
  instruction: string,
  features: string[],
  reasons: string[],
  substantiveInstruction: boolean,
): DevelopmentEvidenceEvaluation {
  return {
    eligibility,
    qualifiesAsContribution: false,
    verified: false,
    independentValidation: false,
    outcomeValidated: false,
    provenanceOnly: eligibility === 'provenance_only',
    substantiveInstruction,
    evidenceRootId: null,
    groupingKey: outcomeKey(story),
    realFeatures: features,
    roles: inferDevelopmentContributionRoles(story, instruction),
    implementationAssisted:
      story.implementationAssisted === true || metaBool(story.metadata, 'implementationAssisted'),
    reasons,
  };
}

export function evaluateDevelopmentContributionEvidence(
  story: DevelopmentStoryEvidenceInput,
): DevelopmentEvidenceEvaluation {
  const instruction = story.originalInstruction || story.rephrasedDescription || story.title || '';
  const features = realCreatedFeatures(story.createdFeatures);
  const substantive = isSubstantiveInstruction(instruction);
  const processOnly = isProcessOnlyInstruction(instruction);
  const ordinary = isOrdinaryQuestion(instruction);
  const reviewed = Boolean(story.reviewedBy) || Boolean(metaString(story.metadata, 'reviewedBy'));
  const testsPassed = story.testsPassed === true || metaBool(story.metadata, 'testsPassed');
  const published = story.published === true || metaBool(story.metadata, 'published');
  const implementationAssisted =
    story.implementationAssisted === true || metaBool(story.metadata, 'implementationAssisted');
  const roles = inferDevelopmentContributionRoles(story, instruction);
  const grouping = outcomeKey(story);
  const chain = hasSystemVerificationChain(story, features);

  if ((story.status ?? '').toLowerCase() === 'archived') {
    return ineligible('journal_only', story, instruction, features, ['archived_journal'], substantive);
  }
  if (isFailedOrUnshipped(story)) {
    return ineligible(
      substantive ? 'provenance_only' : 'journal_only',
      story,
      instruction,
      features,
      ['failed_or_unshipped'],
      substantive,
    );
  }
  if ((processOnly || ordinary) && !chain) {
    return ineligible(
      'journal_only',
      story,
      instruction,
      features,
      [processOnly ? 'process_only' : ordinary ? 'ordinary_question' : 'no_substantive_signal'],
      false,
    );
  }
  if (!chain) {
    return ineligible(
      substantive ? 'provenance_only' : 'journal_only',
      story,
      instruction,
      features,
      [substantive ? 'substantive_provenance_without_outcome' : 'placeholder_or_commit_only'],
      substantive,
    );
  }
  const paths = Array.isArray(story.metadata?.affectedPaths)
    ? story.metadata.affectedPaths.filter((path): path is string => typeof path === 'string')
    : [];
  if (
    !metaBool(story.metadata, 'historicalReconstruction') &&
    isTrivialCosmeticHumanInput({ instruction, affectedPaths: paths, features })
  ) {
    return ineligible('provenance_only', story, instruction, features, ['trivial_human_input'], false);
  }

  const groupingKey =
    grouping ||
    (hasRealCommit(story) ? `git:${(story.commitSha ?? '').trim()}` : null) ||
    (story.id ? `story:${story.id}` : story.sourceStoryKey ? `key:${story.sourceStoryKey}` : null);
  let eligibility: DevelopmentEvidenceEligibility = 'system_verified';
  if (published) eligibility = 'outcome_validated';
  if (reviewed) eligibility = 'independently_validated';
  const reasons = ['traceable_outcome'];
  if (testsPassed) reasons.push('tests_passed');
  else if (metaBool(story.metadata, 'historicalReconstruction')) reasons.push('historical_surviving_implementation');
  if (reviewed) reasons.push('independent_review');
  if (published) reasons.push('published_outcome');
  return {
    eligibility,
    qualifiesAsContribution: groupingKey != null,
    verified: groupingKey != null,
    independentValidation: reviewed,
    outcomeValidated: published,
    provenanceOnly: false,
    substantiveInstruction: substantive,
    evidenceRootId: groupingKey,
    groupingKey,
    realFeatures: features,
    roles,
    implementationAssisted,
    reasons,
  };
}

export function storyFromDevelopmentRow(row: Record<string, unknown>): DevelopmentStoryEvidenceInput {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const features = Array.isArray(row.created_features)
    ? row.created_features.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    id: typeof row.id === 'string' ? row.id : null,
    sourceStoryKey: typeof row.source_story_key === 'string' ? row.source_story_key : null,
    source: typeof row.source === 'string' ? row.source : null,
    sourceType: typeof row.source_type === 'string' ? row.source_type : null,
    status: typeof row.status === 'string' ? row.status : null,
    title: typeof row.title === 'string' ? row.title : null,
    originalInstruction: typeof row.original_instruction === 'string' ? row.original_instruction : null,
    rephrasedDescription: typeof row.rephrased_description === 'string' ? row.rephrased_description : null,
    createdFeatures: features,
    area: typeof row.area === 'string' ? row.area : null,
    commitSha: typeof row.commit_sha === 'string' ? row.commit_sha : null,
    prNumber: typeof row.pr_number === 'number' ? row.pr_number : null,
    reviewedBy: typeof row.reviewed_by === 'string' ? row.reviewed_by : null,
    chatId: typeof row.chat_id === 'string' ? row.chat_id : null,
    requestedAt: typeof row.requested_at === 'string' ? row.requested_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    metadata,
    outcomeRootId: typeof metadata.outcomeRootId === 'string' ? metadata.outcomeRootId : null,
    testsPassed: metadata.testsPassed === true,
    published: metadata.published === true,
    roles: Array.isArray(metadata.roles) ? (metadata.roles as DevelopmentContributionRole[]) : null,
    implementationAssisted: metadata.implementationAssisted === true,
  };
}

export function groupDevelopmentStoriesToContributions(
  stories: DevelopmentStoryEvidenceInput[],
): EligibleDevelopmentContribution[] {
  const evaluated = stories.map((story) => ({
    story,
    evaluation: evaluateDevelopmentContributionEvidence(story),
  }));
  const groups = new Map<string, DevelopmentStoryEvidenceInput[]>();

  for (const { story, evaluation } of evaluated) {
    if (!evaluation.qualifiesAsContribution || !evaluation.groupingKey) continue;
    const list = groups.get(evaluation.groupingKey) ?? [];
    list.push(story);
    groups.set(evaluation.groupingKey, list);
  }

  for (const { story, evaluation } of evaluated) {
    const key = evaluation.groupingKey;
    if (!key || !groups.has(key)) continue;
    const list = groups.get(key)!;
    if (!list.includes(story)) list.push(story);
  }

  const contributions: EligibleDevelopmentContribution[] = [];
  for (const [groupingKey, members] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const memberEval = new Map(
      members.map((story) => [story, evaluateDevelopmentContributionEvidence(story)]),
    );
    const primary = [...members].sort((a, b) => {
      const qual = Number(memberEval.get(b)?.qualifiesAsContribution) - Number(memberEval.get(a)?.qualifiesAsContribution);
      if (qual) return qual;
      const commit = Number(hasRealCommit(b)) - Number(hasRealCommit(a));
      if (commit) return commit;
      return normalizeInstruction(b.originalInstruction).length - normalizeInstruction(a.originalInstruction).length;
    })[0] ?? members[0];
    const independentValidation = members.some((item) => Boolean(item.reviewedBy) || memberEval.get(item)?.independentValidation);
    const outcomeValidated = members.some((item) => memberEval.get(item)?.outcomeValidated);
    const eligibility: DevelopmentEvidenceEligibility = independentValidation
      ? 'independently_validated' : outcomeValidated ? 'outcome_validated' : 'system_verified';
    const occurredAt = [...members].map((item) => item.requestedAt || item.createdAt || '').filter(Boolean).sort().at(-1) || new Date().toISOString();
    contributions.push({
      groupingKey,
      sourceId: groupingKey,
      title: (primary.title || 'Platform improvement').trim(),
      summary: [eligibility, `${members.length} provenance`].join(' · '),
      verified: true,
      eligibility,
      occurredAt,
      provenanceStoryIds: members.map((item) => item.id || item.sourceStoryKey || '').filter(Boolean),
      commitShas: [...new Set(members.map((item) => (item.commitSha ?? '').trim()).filter((sha) => sha.length >= 7))],
      realFeatures: [...new Set(members.flatMap((item) => realCreatedFeatures(item.createdFeatures)))],
      roles: [...new Set(members.flatMap((item) => memberEval.get(item)?.roles ?? []))],
      implementationAssisted: members.some((item) => memberEval.get(item)?.implementationAssisted),
      instruction: normalizeInstruction(primary.originalInstruction || primary.rephrasedDescription),
      independentValidation,
      outcomeValidated,
      classifiedDomain: members.map((item) => classifiedDomainForDevelopmentStory(item)).find((item) => item != null) ?? null,
      contributionFunction: typeof primary.metadata?.contributionFunction === 'string' ? primary.metadata.contributionFunction : null,
      testsPassed: members.some((item) => item.testsPassed === true),
      affectedPaths: [...new Set(members.flatMap((item) => Array.isArray(item.metadata?.affectedPaths)
        ? item.metadata.affectedPaths.filter((path): path is string => typeof path === 'string') : []))].slice(0, 40),
      reconstructionResult: typeof primary.metadata?.reconstructionResult === 'string' ? primary.metadata.reconstructionResult : null,
      survivingImplementation: typeof primary.metadata?.survivingImplementation === 'boolean' ? primary.metadata.survivingImplementation : null,
      linkedInstructions: members.map((item) => normalizeInstruction(item.originalInstruction || item.rephrasedDescription)).filter(Boolean).slice(0, 12),
    });
  }
  return contributions;
}
