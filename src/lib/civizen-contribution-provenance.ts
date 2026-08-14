/** Contextual human-contribution provenance. Labels are evidence, not score. */

import {
  isOrdinaryQuestion,
  isProcessOnlyInstruction,
  normalizeInstruction,
  type DevelopmentContributionRole,
  type DevelopmentStoryEvidenceInput,
} from '@/lib/civizen-development-evidence';
import {
  inferSurvivingPaths,
  primaryPaths,
  stampMs,
  termOverlap,
} from '@/lib/civizen-historical-reconstruction-signals';

export const CONTRIBUTION_PROVENANCE_VERSION = 'contribution-provenance-v1';

export type ProvenanceFunction =
  | 'process_only' | 'ordinary_information_request' | 'problem_identification' | 'defect_identification'
  | 'requirement' | 'specification' | 'product_design' | 'ux_design' | 'system_architecture' | 'model_design'
  | 'governance_design' | 'decision' | 'correction' | 'revision_direction' | 'review' | 'quality_control'
  | 'test_feedback' | 'validation' | 'acceptance' | 'research_input' | 'documentation_direction' | 'other_substantive';

export type ProvenanceDisposition = 'process_casual' | 'information_only' | 'contribution_bearing' | 'ambiguous';

export type HumanInvolvementEvidence = {
  substantiveInteractions: number;
  revisionCycles: number;
  spanDays: number | null;
  promptCountUsedForScore: false;
};

export type ProvenanceClassification = {
  version: typeof CONTRIBUTION_PROVENANCE_VERSION;
  functions: ProvenanceFunction[];
  roles: DevelopmentContributionRole[];
  disposition: ProvenanceDisposition;
  contributionBearing: boolean;
  reasons: string[];
};

const NON_BEARING = new Set<ProvenanceFunction>(['process_only', 'ordinary_information_request']);
const GENERIC_HOWTO = /^(how does|what is|what are|can you explain|could you explain)\b/i;
const PRODUCT_SURFACE =
  /\b(user|users|member|agreement|party|calendar|document|form|button|screen|mobile|workflow|score|ring|nav|composer|template|signature|role|visible|viewport|login|signup|lockout|auth)\b/i;
const DEFECT =
  /\b(doesn't work|does not work|still broken|outside the|overflow|inaccessib|wrong|bug|broken|goes outside|not visible|can't see|cannot see|cutoff|clipped)\b/i;
const UX_PRINCIPLE =
  /\b(document(?:-first)?|not a form|behave like|look like|party roles?|visible in the|mobile ux|calendar)\b/i;
const PROBLEM_WHY =
  /\b(why (are|is|do|does)|required to .{0,40} twice|already know|asking .{0,30} again)\b/i;
const REVIEW_ITER =
  /\b(that still|still doesn't|still does not|try again|fix this|redo|not what I|inspect|look at this)\b/i;
const CORRECTION =
  /\b(instead|change it to|should be|should stay|should behave|correct this|correct the|fix the|keep .{0,24} (visible|inside|in the))\b/i;
const ACCEPT = /\b(that's (correct|right|better)|looks good|accept(ed)?|validated)\b/i;
const TEST_FB = /\b(test(s)? (fail|failed|failing|pass)|verify:|playwright|vitest)\b/i;
const AGENT_PROCESS = /\b(update the application|agents? rule|when I ask you to)\b/i;
const JUDGMENT =
  /\b(too (small|big|wide|narrow)|hard to|confusing|unclear|missing|hidden|overlap|already (have|know)|twice|goes|stay visible)\b/i;

const FUNCTION_ROLES: Array<{ fn: ProvenanceFunction; role: DevelopmentContributionRole }> = [
  { fn: 'system_architecture', role: 'system_architect' }, { fn: 'product_design', role: 'product_architect' },
  { fn: 'ux_design', role: 'ux_design' }, { fn: 'requirement', role: 'requirements' }, { fn: 'specification', role: 'requirements' },
  { fn: 'governance_design', role: 'governance_design' }, { fn: 'model_design', role: 'research' },
  { fn: 'problem_identification', role: 'problem_identification' }, { fn: 'defect_identification', role: 'quality_assurance' },
  { fn: 'quality_control', role: 'quality_assurance' }, { fn: 'review', role: 'review' }, { fn: 'revision_direction', role: 'review' },
  { fn: 'correction', role: 'review' }, { fn: 'validation', role: 'validation' }, { fn: 'acceptance', role: 'validation' },
  { fn: 'test_feedback', role: 'quality_assurance' }, { fn: 'decision', role: 'product_direction' },
  { fn: 'documentation_direction', role: 'documentation' }, { fn: 'research_input', role: 'research' },
];

export const DOMAIN_LEXICON: Array<{ id: string; terms: RegExp; paths: RegExp }> = [
  { id: 'agreements', terms: /\b(agreement|party|calendar|document-first|template|signature|agr-)\b/i, paths: /agreements|Agreement/ },
  { id: 'score', terms: /\b(score|dial|ring|reputation|civizen score)\b/i, paths: /civizen-score|ScorePage|score-ring/ },
  { id: 'nav', terms: /\b(carousel|bottom nav|nav chrome)\b/i, paths: /NavSecondary|nav-secondary/ },
  { id: 'composer', terms: /\b(composer|home post|chat-bar)\b/i, paths: /Home\.tsx|chat-bar/ },
];

function textOf(story: DevelopmentStoryEvidenceInput): string {
  return normalizeInstruction(story.originalInstruction || story.rephrasedDescription || story.title);
}

export function rolesFromProvenanceFunctions(functions: ProvenanceFunction[]): DevelopmentContributionRole[] {
  return [...new Set(FUNCTION_ROLES.filter((item) => functions.includes(item.fn)).map((item) => item.role))];
}

function classified(
  functions: ProvenanceFunction[],
  disposition: ProvenanceDisposition,
  contributionBearing: boolean,
  reasons: string[],
): ProvenanceClassification {
  const unique = [...new Set(functions.filter((item) => !NON_BEARING.has(item)))];
  return {
    version: CONTRIBUTION_PROVENANCE_VERSION,
    functions: unique.length ? unique : functions,
    roles: rolesFromProvenanceFunctions(unique),
    disposition,
    contributionBearing,
    reasons,
  };
}

export function classifyHumanProvenanceText(instruction: string): ProvenanceClassification {
  const text = normalizeInstruction(instruction);
  if (!text || isProcessOnlyInstruction(text) || AGENT_PROCESS.test(text)) {
    return classified(['process_only'], 'process_casual', false, ['process_or_agent_instruction']);
  }
  if (GENERIC_HOWTO.test(text) && !PRODUCT_SURFACE.test(text) && !DEFECT.test(text)) {
    return classified(['ordinary_information_request'], 'information_only', false, ['generic_information_request']);
  }
  const functions: ProvenanceFunction[] = [];
  const reasons: string[] = [];
  if (DEFECT.test(text)) { functions.push('defect_identification', 'quality_control'); reasons.push('defect_language'); }
  if (UX_PRINCIPLE.test(text)) { functions.push('ux_design', 'product_design'); reasons.push('ux_principle'); }
  if (PROBLEM_WHY.test(text) || (isOrdinaryQuestion(text) && PRODUCT_SURFACE.test(text))) {
    functions.push('problem_identification');
    reasons.push('product_problem_question');
  }
  if (REVIEW_ITER.test(text)) { functions.push('review', 'revision_direction'); reasons.push('iterative_review'); }
  if (CORRECTION.test(text)) { functions.push('correction', 'requirement'); reasons.push('correction_or_requirement'); }
  if (ACCEPT.test(text)) { functions.push('validation', 'acceptance'); reasons.push('acceptance'); }
  if (TEST_FB.test(text)) { functions.push('test_feedback'); reasons.push('test_feedback'); }
  if (/\b(architect|architecture|invariant|subsystem)\b/i.test(text)) functions.push('system_architecture', 'specification');
  if (/\b(governance|framework|policy|operating model)\b/i.test(text)) functions.push('governance_design');
  if (/\b(classif|model evolution|registry)\b/i.test(text)) functions.push('model_design');
  if (/\b(document the|readme|spec doc)\b/i.test(text)) functions.push('documentation_direction');
  if (/\b(should|must)\b/i.test(text) && PRODUCT_SURFACE.test(text)) {
    functions.push('requirement', 'decision');
    reasons.push('product_constraint');
  }
  if (functions.filter((item) => !NON_BEARING.has(item)).length === 0 && PRODUCT_SURFACE.test(text) && JUDGMENT.test(text)) {
    functions.push('other_substantive');
    reasons.push('short_product_judgment');
  }
  const unique = [...new Set(functions.filter((item) => !NON_BEARING.has(item)))];
  if (unique.length === 0) {
    if (isOrdinaryQuestion(text)) {
      return classified(['ordinary_information_request'], 'information_only', false, ['question_without_product_surface']);
    }
    return classified([], 'ambiguous', false, ['no_function_match']);
  }
  return classified(unique, 'contribution_bearing', true, reasons);
}

export function classifyHumanProvenance(args: {
  instruction: string;
  previousInstruction?: string | null;
  nextInstruction?: string | null;
  followedByImplementation?: boolean;
  precededByImplementation?: boolean;
  overlappingOutcome?: boolean;
}): ProvenanceClassification {
  const isolated = classifyHumanProvenanceText(args.instruction);
  const influence = args.followedByImplementation === true || args.overlappingOutcome === true;
  if (isolated.contributionBearing) return isolated;
  const iterative = REVIEW_ITER.test(normalizeInstruction(args.instruction))
    || /^that still|^still |^no[,.]?$|^not yet/i.test(normalizeInstruction(args.instruction));
  if (iterative && (args.precededByImplementation || influence)) {
    return classified(['review', 'quality_control', 'revision_direction'], 'contribution_bearing', true, ['contextual_iterative_review']);
  }
  if (isolated.disposition === 'information_only' && influence && PRODUCT_SURFACE.test(args.instruction)) {
    return classified(['problem_identification'], 'contribution_bearing', true, [...isolated.reasons, 'question_linked_to_outcome']);
  }
  if (influence && isolated.disposition === 'ambiguous') {
    return classified(['other_substantive'], 'contribution_bearing', true, ['material_influence']);
  }
  return isolated;
}

export function involvementFromClassifications(
  items: Array<{ at?: string | null; text?: string | null; classification: ProvenanceClassification }>,
): HumanInvolvementEvidence {
  const seen = new Set<string>();
  const unique: typeof items = [];
  for (const item of items) {
    if (!item.classification.contributionBearing) continue;
    const key = normalizeInstruction(item.text || '').toLowerCase();
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    unique.push(item);
  }
  const revisions = unique.filter((item) =>
    item.classification.functions.some((fn) =>
      fn === 'revision_direction' || fn === 'defect_identification' || fn === 'quality_control' || fn === 'correction',
    ),
  ).length;
  const stamps = items.map((item) => stampMs(item.at ?? '')).filter((value) => value > 0).sort((a, b) => a - b);
  const spanDays = stamps.length >= 2
    ? Math.max(1, Math.round((stamps[stamps.length - 1]! - stamps[0]!) / 86_400_000))
    : stamps.length === 1 ? 1 : null;
  return {
    substantiveInteractions: unique.length,
    revisionCycles: revisions,
    spanDays,
    promptCountUsedForScore: false,
  };
}

export function involvementFromStories(stories: DevelopmentStoryEvidenceInput[]): HumanInvolvementEvidence {
  return involvementFromClassifications(stories.map((story) => ({
    at: story.requestedAt || story.createdAt,
    text: textOf(story),
    classification: classifyHumanProvenanceText(textOf(story)),
  })));
}

export function evaluationProvenanceInstructions(instructions: string[]): string[] {
  return instructions.filter((text) => classifyHumanProvenanceText(text).contributionBearing);
}

export type ProvenanceOutcomeLink = {
  outcomeRootId: string;
  title: string;
  affectedPaths: string[];
  commitShas: string[];
  start: string;
  end: string;
};

function domainHits(text: string, paths: string[]): string[] {
  return DOMAIN_LEXICON.filter((item) => item.terms.test(text) || paths.some((path) => item.paths.test(path))).map((item) => item.id);
}

export function scoreProvenanceOutcomeLink(
  story: DevelopmentStoryEvidenceInput,
  outcome: ProvenanceOutcomeLink,
  survivingPaths: string[],
  classification: ProvenanceClassification,
): { score: number; reasons: string[] } {
  const text = textOf(story);
  const reasons: string[] = [];
  let score = 0;
  const at = stampMs(story.requestedAt || story.createdAt || '');
  const start = stampMs(outcome.start);
  const end = stampMs(outcome.end);
  if (at && start && at >= start - 7 * 86_400_000 && at <= end + 2 * 86_400_000) {
    score += 2;
    reasons.push('time_window');
  }
  const terms = termOverlap(text, outcome.title);
  if (terms.length >= 2) { score += 4; reasons.push('title_terms'); }
  else if (terms.length === 1 && classification.contributionBearing) { score += 2; reasons.push('title_term'); }
  const names = outcome.affectedPaths.map((file) => file.split('/').pop()?.toLowerCase() ?? '');
  if (names.some((name) => name.length >= 8 && text.toLowerCase().includes(name))) {
    score += 5;
    reasons.push('filename');
  }
  const inferred = inferSurvivingPaths(text, survivingPaths);
  const overlap = inferred.filter((path) => outcome.affectedPaths.includes(path) || primaryPaths(outcome.affectedPaths).includes(path));
  if (overlap.length >= 2) { score += 4; reasons.push('path_overlap'); }
  else if (overlap.length === 1) { score += 2; reasons.push('path_overlap'); }
  const storyDomains = domainHits(text, inferred);
  const outcomeDomains = domainHits(outcome.title, outcome.affectedPaths);
  if (storyDomains.some((id) => outcomeDomains.includes(id))) {
    score += 3;
    reasons.push('domain_overlap');
  }
  if (classification.contributionBearing) score += 1;
  return { score, reasons };
}

export function bestProvenanceOutcome(
  story: DevelopmentStoryEvidenceInput,
  outcomes: ProvenanceOutcomeLink[],
  survivingPaths: string[],
): { outcomeRootId: string; score: number; reasons: string[]; classification: ProvenanceClassification } | null {
  const isolated = classifyHumanProvenance({ instruction: textOf(story) });
  if (isolated.disposition === 'process_casual') return null;
  let best: { outcomeRootId: string; score: number; reasons: string[]; overlapping: boolean } | null = null;
  for (const outcome of outcomes) {
    const probe = scoreProvenanceOutcomeLink(story, outcome, survivingPaths, isolated);
    const overlapping = probe.reasons.some((reason) => reason === 'path_overlap' || reason === 'filename' || reason === 'title_terms');
    const classification = overlapping
      ? classifyHumanProvenance({
          instruction: textOf(story),
          overlappingOutcome: true,
          followedByImplementation: true,
        })
      : isolated;
    const link = scoreProvenanceOutcomeLink(story, outcome, survivingPaths, classification);
    const weakOutcome = /^(chore:|docs:|publish |note |bump )/i.test(outcome.title);
    const strongLink = link.reasons.some((reason) =>
      reason === 'filename' || reason === 'title_terms' || reason === 'path_overlap' || reason === 'title_term',
    );
    if (weakOutcome && !strongLink) continue;
    const threshold = classification.contributionBearing ? 4 : 6;
    if (link.score < threshold) continue;
    if (!best || link.score > best.score) {
      best = { outcomeRootId: outcome.outcomeRootId, score: link.score, reasons: link.reasons, overlapping };
    }
  }
  if (!best) return null;
  const classification = best.overlapping
    ? classifyHumanProvenance({ instruction: textOf(story), overlappingOutcome: true, followedByImplementation: true })
    : isolated;
  return { outcomeRootId: best.outcomeRootId, score: best.score, reasons: best.reasons, classification };
}

export function isChatProvenance(story: DevelopmentStoryEvidenceInput): boolean {
  const key = (story.sourceStoryKey ?? '').toLowerCase();
  const source = (story.source ?? story.sourceType ?? '').toLowerCase();
  return key.startsWith('chat:') || source === 'chat';
}

export function attachHumanProvenanceToOutcomes(
  outcomes: Array<{
    outcomeRootId: string;
    title: string;
    affectedPaths: string[];
    commitShas: string[];
    storyIds: string[];
    linkReasons: string[];
    implementationStory?: DevelopmentStoryEvidenceInput;
  }>,
  stories: DevelopmentStoryEvidenceInput[],
  survivingPaths: string[],
): void {
  const used = new Set(outcomes.flatMap((item) => item.storyIds));
  const links = outcomes.map((item) => ({
    outcomeRootId: item.outcomeRootId,
    title: item.title,
    affectedPaths: item.affectedPaths,
    commitShas: item.commitShas,
    start: item.implementationStory?.requestedAt || '',
    end: item.implementationStory?.requestedAt || '',
  }));
  for (const story of stories) {
    if (!isChatProvenance(story)) continue;
    const id = story.id || story.sourceStoryKey || '';
    if (!id || used.has(id)) continue;
    const best = bestProvenanceOutcome(story, links, survivingPaths);
    if (!best) continue;
    const outcome = outcomes.find((item) => item.outcomeRootId === best.outcomeRootId);
    if (!outcome) continue;
    outcome.storyIds.push(id);
    outcome.linkReasons.push(`human_provenance:${best.reasons[0] ?? 'link'}`);
    used.add(id);
  }
}
