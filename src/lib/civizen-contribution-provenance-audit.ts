/** Audit human journal provenance. Counts are evidence, not score targets. */

import {
  classifyHumanProvenanceText,
  isChatProvenance,
  type ProvenanceDisposition,
} from '@/lib/civizen-contribution-provenance';
import {
  isOrdinaryQuestion,
  isProcessOnlyInstruction,
  isSubstantiveInstruction,
  type DevelopmentStoryEvidenceInput,
} from '@/lib/civizen-development-evidence';
import type { CanonicalInheritanceMove } from '@/lib/civizen-contribution-integrity';
import type { HistoricalReconstructedOutcome } from '@/lib/civizen-historical-reconstruction';

export type HumanProvenanceAudit = {
  humanChat: number;
  oldSubstantiveClassifier: number;
  processCasual: number;
  informationOnly: number;
  contributionBearing: number;
  ambiguous: number;
  previouslyOtherNonSubstantive: number;
  previousOtherNowProcess: number;
  previousOtherNowInformation: number;
  previousOtherNowBearing: number;
  previousOtherNowAmbiguous: number;
  previousOtherLinkedExisting: number;
  oldSubstantiveStillBearing: number;
  oldSubstantiveAttached: number;
  linkedExisting: number;
  linkedDistinct: number;
  journalOnly: number;
  noOutcomeEvidence: number;
  existingRootsEnriched: number;
};

function dispositionOf(instruction: string): ProvenanceDisposition {
  return classifyHumanProvenanceText(instruction).disposition;
}

function wasPreviousOther(instruction: string): boolean {
  return !isSubstantiveInstruction(instruction)
    && !isProcessOnlyInstruction(instruction)
    && !isOrdinaryQuestion(instruction);
}

export function auditHumanJournalProvenance(args: {
  stories: DevelopmentStoryEvidenceInput[];
  outcomes: HistoricalReconstructedOutcome[];
  existingRootIds?: string[];
}): HumanProvenanceAudit {
  const chats = args.stories.filter((story) => isChatProvenance(story) || (story.source ?? story.sourceType) === 'chat');
  const existing = new Set(args.existingRootIds ?? args.outcomes
    .filter((item) => !item.outcomeRootId.startsWith('historical:recall:'))
    .map((item) => item.outcomeRootId));
  const attached = new Map<string, string>();
  for (const outcome of args.outcomes) {
    for (const id of outcome.storyIds) attached.set(id, outcome.outcomeRootId);
  }
  const counts: HumanProvenanceAudit = {
    humanChat: chats.length,
    oldSubstantiveClassifier: 0,
    processCasual: 0,
    informationOnly: 0,
    contributionBearing: 0,
    ambiguous: 0,
    previouslyOtherNonSubstantive: 0,
    previousOtherNowProcess: 0,
    previousOtherNowInformation: 0,
    previousOtherNowBearing: 0,
    previousOtherNowAmbiguous: 0,
    previousOtherLinkedExisting: 0,
    oldSubstantiveStillBearing: 0,
    oldSubstantiveAttached: 0,
    linkedExisting: 0,
    linkedDistinct: 0,
    journalOnly: 0,
    noOutcomeEvidence: 0,
    existingRootsEnriched: 0,
  };
  const enriched = new Set<string>();
  for (const story of chats) {
    const instruction = story.originalInstruction || story.title || '';
    const disposition = dispositionOf(instruction);
    if (isSubstantiveInstruction(instruction)) counts.oldSubstantiveClassifier += 1;
    if (disposition === 'process_casual') counts.processCasual += 1;
    else if (disposition === 'information_only') counts.informationOnly += 1;
    else if (disposition === 'contribution_bearing') counts.contributionBearing += 1;
    else counts.ambiguous += 1;
    if (wasPreviousOther(instruction)) {
      counts.previouslyOtherNonSubstantive += 1;
      if (disposition === 'process_casual') counts.previousOtherNowProcess += 1;
      else if (disposition === 'information_only') counts.previousOtherNowInformation += 1;
      else if (disposition === 'contribution_bearing') counts.previousOtherNowBearing += 1;
      else counts.previousOtherNowAmbiguous += 1;
    }
    if (isSubstantiveInstruction(instruction) && disposition === 'contribution_bearing') {
      counts.oldSubstantiveStillBearing += 1;
    }
    const id = story.id || story.sourceStoryKey || '';
    const root = attached.get(id);
    if (root && existing.has(root)) {
      counts.linkedExisting += 1;
      if (disposition === 'contribution_bearing' || disposition === 'ambiguous') enriched.add(root);
      if (wasPreviousOther(instruction)) counts.previousOtherLinkedExisting += 1;
      if (isSubstantiveInstruction(instruction)) counts.oldSubstantiveAttached += 1;
    } else if (root) {
      counts.linkedDistinct += 1;
    } else {
      counts.journalOnly += 1;
      if (disposition === 'contribution_bearing') counts.noOutcomeEvidence += 1;
    }
  }
  counts.existingRootsEnriched = enriched.size;
  return counts;
}

export type ContributionBearingAttachment = {
  total: number;
  onPersisted: string[];
  onNonPersisted: Array<{ storyId: string; clusterId: string }>;
  noOutcome: string[];
  persistedRootsWithBearing: string[];
};

function attachedRootMap(outcomes: HistoricalReconstructedOutcome[]): Map<string, string> {
  const attached = new Map<string, string>();
  for (const outcome of outcomes) {
    for (const id of outcome.storyIds) attached.set(id, outcome.outcomeRootId);
  }
  return attached;
}

export function contributionBearingAttachment(args: {
  stories: DevelopmentStoryEvidenceInput[];
  outcomes: HistoricalReconstructedOutcome[];
  existingRootIds: string[];
}): ContributionBearingAttachment {
  const chats = args.stories.filter((story) => isChatProvenance(story) || (story.source ?? story.sourceType) === 'chat');
  const persisted = new Set(args.existingRootIds);
  const attached = attachedRootMap(args.outcomes);
  const result: ContributionBearingAttachment = {
    total: 0,
    onPersisted: [],
    onNonPersisted: [],
    noOutcome: [],
    persistedRootsWithBearing: [],
  };
  const roots = new Set<string>();
  for (const story of chats) {
    const instruction = story.originalInstruction || story.title || '';
    if (classifyHumanProvenanceText(instruction).disposition !== 'contribution_bearing') continue;
    result.total += 1;
    const id = story.id || story.sourceStoryKey || '';
    const root = attached.get(id);
    if (root && persisted.has(root)) {
      result.onPersisted.push(id);
      roots.add(root);
    } else if (root) {
      result.onNonPersisted.push({ storyId: id, clusterId: root });
    } else {
      result.noOutcome.push(id);
    }
  }
  result.persistedRootsWithBearing = [...roots];
  return result;
}

export function strandedBearingDisposition(args: {
  stories: DevelopmentStoryEvidenceInput[];
  before: ContributionBearingAttachment;
  moves: CanonicalInheritanceMove[];
}): {
  strandedBefore: number;
  inherited: number;
  remainOnCluster: number;
  journalOnly: number;
  byReason: Record<string, number>;
  byAction: Record<string, number>;
    items: Array<{
      clusterId: string;
      functions: string[];
      clusterReason: string;
      canonicalIdentified: boolean;
      action: string;
    }>;
} {
  const byId = new Map(args.stories.map((story) => [story.id || story.sourceStoryKey || '', story]));
  const moveByStory = new Map(args.moves.map((move) => [move.storyId, move]));
  const byReason: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  const items: Array<{
    clusterId: string;
    functions: string[];
    clusterReason: string;
    canonicalIdentified: boolean;
    action: string;
  }> = [];
  for (const row of args.before.onNonPersisted) {
    const story = byId.get(row.storyId);
    const classified = classifyHumanProvenanceText(story?.originalInstruction || story?.title || '');
    const move = moveByStory.get(row.storyId);
    const action = move?.action || 'remain_on_cluster';
    const reason = move?.clusterReason || 'unknown';
    byReason[reason] = (byReason[reason] ?? 0) + 1;
    byAction[action] = (byAction[action] ?? 0) + 1;
    items.push({
      clusterId: row.clusterId,
      functions: classified.functions,
      clusterReason: reason,
      canonicalIdentified: Boolean(move?.identityEstablished),
      action,
    });
  }
  return {
    strandedBefore: args.before.onNonPersisted.length,
    inherited: byAction.merge_into_canonical ?? 0,
    remainOnCluster: byAction.remain_on_cluster ?? 0,
    journalOnly: byAction.journal_only ?? 0,
    byReason,
    byAction,
    items,
  };
}
