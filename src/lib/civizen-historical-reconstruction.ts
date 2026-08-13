/** Reconstruct coherent historical development outcomes from git + journal provenance. */

import {
  evaluateDevelopmentContributionEvidence,
  isSubstantiveInstruction,
  type DevelopmentStoryEvidenceInput,
} from './civizen-development-evidence';
import { evaluateDevelopmentSignificance } from './civizen-development-significance';
import {
  distinctiveTerms,
  HISTORICAL_SHA_RE,
  HISTORICAL_TEST_PATH,
  hoursBetween,
  inferSurvivingPaths,
  isSatelliteCommit,
  isSnapshotCommit,
  primaryPaths,
  shouldMergeProductCommits,
  splitEnumeratedCommit,
  stampMs,
  termOverlap,
  versionOf,
  type HistoricalCommit,
} from './civizen-historical-reconstruction-signals';

export type { HistoricalCommit };
export { distinctiveTerms, isSatelliteCommit, shouldMergeProductCommits, isSnapshotCommit };
export const HISTORICAL_RECONSTRUCTION_VERSION = 'historical-reconstruction-v1';

export type ReconstructionResultKind =
  | 'reconstructed'
  | 'reconstructed_with_uncertainty'
  | 'unreconstructed';
export type ReconstructionConfidence = 'high' | 'moderate' | 'low';
export type ContributionEvidenceConfidence = 'high' | 'moderate' | 'low' | 'unknown';

export type HistoricalReconstructedOutcome = {
  result: ReconstructionResultKind;
  reconstructionConfidence: ReconstructionConfidence;
  contributionEvidenceConfidence: ContributionEvidenceConfidence;
  attributionConfidence: ReconstructionConfidence | 'unknown';
  outcomeRootId: string;
  title: string;
  instruction: string;
  createdFeatures: string[];
  affectedPaths: string[];
  survivingPaths: string[];
  commitShas: string[];
  storyIds: string[];
  linkReasons: string[];
  testsPassed: boolean | null;
  survivingImplementation: boolean;
  implementationStory: DevelopmentStoryEvidenceInput;
};

type Cluster = { commits: HistoricalCommit[]; reasons: string[]; satellites: HistoricalCommit[] };

function clusterProductCommits(product: HistoricalCommit[]): Cluster[] {
  const ordered = [...product].sort((a, b) => stampMs(a.authoredAt) - stampMs(b.authoredAt));
  const clusters: Cluster[] = [];
  for (const commit of ordered) {
    let attached = false;
    for (let i = clusters.length - 1; i >= 0; i -= 1) {
      const last = clusters[i]!.commits[clusters[i]!.commits.length - 1]!;
      if (hoursBetween(last.authoredAt, commit.authoredAt) > 36) break;
      const decision = shouldMergeProductCommits(last, commit);
      if (decision.merge) {
        clusters[i]!.commits.push(commit);
        clusters[i]!.reasons.push(decision.reason);
        attached = true;
        break;
      }
    }
    if (!attached) clusters.push({ commits: [commit], reasons: ['single_landed_change'], satellites: [] });
  }
  return clusters;
}

function attachSatellites(clusters: Cluster[], satellites: HistoricalCommit[]): HistoricalCommit[] {
  const unused: HistoricalCommit[] = [];
  for (const sat of satellites) {
    const version = versionOf(sat.subject);
    let best: Cluster | null = null;
    let bestGap = Infinity;
    for (const cluster of clusters) {
      const nearest = Math.min(...cluster.commits.map((item) => hoursBetween(item.authoredAt, sat.authoredAt)));
      const versionHit = version != null && cluster.commits.some((item) => versionOf(item.subject) === version);
      if (versionHit && nearest <= 24) {
        best = cluster;
        break;
      }
      if (nearest < bestGap && nearest <= 4) {
        best = cluster;
        bestGap = nearest;
      }
    }
    if (best) {
      best.satellites.push(sat);
      best.reasons.push(version ? 'satellite_version_link' : 'satellite_time_proximity');
    } else unused.push(sat);
  }
  return unused;
}

function shaLinked(clusterShas: Set<string>, value: string): boolean {
  const sha = value.trim().toLowerCase();
  if (sha.length < 7) return false;
  return [...clusterShas].some((item) => item.startsWith(sha) || sha.startsWith(item.slice(0, sha.length)));
}

function attachStories(
  clusterShas: Set<string>,
  files: string[],
  title: string,
  span: { start: string; end: string },
  stories: DevelopmentStoryEvidenceInput[],
): { ids: string[]; reasons: string[]; attribution: ReconstructionConfidence | 'unknown' } {
  const ids: string[] = [];
  const reasons: string[] = [];
  let attribution: ReconstructionConfidence | 'unknown' = 'unknown';
  const names = new Set(files.map((file) => file.split('/').pop()?.toLowerCase()).filter(Boolean) as string[]);
  const titleTerms = distinctiveTerms(title);
  for (const story of stories) {
    const id = story.id || story.sourceStoryKey || '';
    if (shaLinked(clusterShas, story.commitSha ?? '')) {
      ids.push(id); reasons.push('explicit_commit_sha'); attribution = 'high';
      continue;
    }
    const text = `${story.originalInstruction ?? ''} ${story.title ?? ''}`;
    if ([...(text.match(HISTORICAL_SHA_RE) ?? [])].some((item) => shaLinked(clusterShas, item))) {
      ids.push(id); reasons.push('instruction_sha_reference'); attribution = 'high';
      continue;
    }
    const stamp = story.requestedAt || story.createdAt || '';
    if (!stamp) continue;
    const at = stampMs(stamp);
    if (at < stampMs(span.start) - 43_200_000 || at > stampMs(span.end) + 43_200_000) continue;
    const terms = termOverlap(text, title).filter((term) => titleTerms.includes(term));
    const fileHit = [...names].some((name) => name.length >= 8 && text.toLowerCase().includes(name));
    if (terms.length >= 2 || fileHit) {
      ids.push(id);
      reasons.push(fileHit ? 'filename_and_time_window' : 'terminology_and_time_window');
      if (attribution === 'unknown') attribution = 'moderate';
    }
  }
  return { ids: ids.filter(Boolean), reasons, attribution };
}

function buildStory(outcome: Omit<HistoricalReconstructedOutcome, 'implementationStory'>): DevelopmentStoryEvidenceInput {
  const significance = evaluateDevelopmentSignificance({
    affectedPaths: outcome.affectedPaths,
    testsPassed: outcome.testsPassed,
  });
  return {
    id: `outcome:${outcome.outcomeRootId}:implementation`,
    sourceStoryKey: `outcome:${outcome.outcomeRootId}:implementation`,
    source: 'historical_reconstruction',
    sourceType: 'outcome',
    status: 'published',
    title: outcome.title,
    originalInstruction: outcome.instruction,
    createdFeatures: outcome.createdFeatures,
    commitSha: outcome.commitShas[outcome.commitShas.length - 1] ?? null,
    metadata: {
      outcomeRootId: outcome.outcomeRootId,
      historicalReconstruction: true,
      survivingImplementation: outcome.survivingImplementation,
      testsPassed: outcome.testsPassed,
      reconstructionConfidence: outcome.reconstructionConfidence,
      contributionEvidenceConfidence: outcome.contributionEvidenceConfidence,
      attributionConfidence: outcome.attributionConfidence,
      reconstructionResult: outcome.result,
      linkReasons: outcome.linkReasons,
      commitShas: outcome.commitShas,
      provenanceStoryIds: outcome.storyIds,
      affectedPaths: outcome.affectedPaths.slice(0, 40),
      contributionFunction: significance.contributionFunction,
      significance,
      roles: ['founder', 'product_direction', 'review'],
      implementationAssisted: true,
      captureVersion: HISTORICAL_RECONSTRUCTION_VERSION,
    },
    outcomeRootId: outcome.outcomeRootId,
    testsPassed: outcome.testsPassed,
    roles: ['founder', 'product_direction', 'review'],
    implementationAssisted: true,
  };
}

function outcomeFromCluster(
  cluster: Cluster,
  files: string[],
  title: string,
  suffix: string | null,
  surviving: Set<string>,
  stories: DevelopmentStoryEvidenceInput[],
  extraReasons: string[],
): HistoricalReconstructedOutcome {
  const shas = cluster.commits.map((item) => item.sha.toLowerCase());
  const stamps = cluster.commits.map((item) => item.authoredAt).sort();
  const resolvedFiles = files.length > 0 ? files : inferSurvivingPaths(title, [...surviving]);
  const inferred = files.length === 0 && resolvedFiles.length > 0;
  const survived = primaryPaths(resolvedFiles).filter((file) => surviving.has(file));
  const testsPassed = resolvedFiles.some((file) => HISTORICAL_TEST_PATH.test(file) && surviving.has(file)) ? true : null;
  const recon: ReconstructionConfidence = suffix
    ? 'moderate'
    : cluster.reasons.some((reason) => reason === 'overlapping_primary_paths' || reason === 'successive_named_change') ||
        (cluster.commits.length === 1 && cluster.reasons.includes('single_landed_change'))
      ? 'high'
      : 'moderate';
  const attached = attachStories(new Set(shas), resolvedFiles, title, { start: stamps[0]!, end: stamps.at(-1)! }, stories);
  const survivingImplementation = survived.length > 0;
  const contributionEvidenceConfidence: ContributionEvidenceConfidence = !survivingImplementation
    ? 'low'
    : testsPassed === true
      ? 'high'
      : survived.length >= 3
        ? 'moderate'
        : 'low';
  const result: ReconstructionResultKind = survivingImplementation && recon === 'high'
    ? 'reconstructed'
    : 'reconstructed_with_uncertainty';
  const base = {
    result,
    reconstructionConfidence: recon,
    contributionEvidenceConfidence,
    attributionConfidence: attached.attribution,
    outcomeRootId: `historical:${cluster.commits[0]!.sha.slice(0, 12)}${suffix ? `:${suffix}` : ''}`,
    title,
    instruction: cluster.commits.map((item) => item.subject).join(' '),
    createdFeatures: [title, ...survived.slice(0, 5)],
    affectedPaths: resolvedFiles.slice(0, 80),
    survivingPaths: survived,
    commitShas: shas,
    storyIds: attached.ids,
    linkReasons: [...new Set([...cluster.reasons, ...extraReasons, ...(inferred ? ['inferred_surviving_paths'] : []), ...attached.reasons])],
    testsPassed,
    survivingImplementation,
  };
  const implementationStory = buildStory(base);
  implementationStory.requestedAt = stamps.at(-1)!;
  return { ...base, implementationStory };
}

function gitJournalCommits(
  stories: DevelopmentStoryEvidenceInput[],
  headShas: Set<string>,
): HistoricalCommit[] {
  const commits: HistoricalCommit[] = [];
  for (const story of stories) {
    const sha = (story.commitSha ?? '').trim().toLowerCase();
    const key = (story.sourceStoryKey ?? '').toLowerCase();
    if (sha.length < 7) continue;
    if ([...headShas].some((item) => item.startsWith(sha) || sha.startsWith(item.slice(0, sha.length)))) continue;
    if (!(key.startsWith('git:') || story.source === 'git' || story.sourceType === 'git')) continue;
    commits.push({
      sha,
      authoredAt: story.requestedAt || story.createdAt || '',
      subject: (story.title || story.originalInstruction || 'Historical change').replace(/\.$/, '').slice(0, 180),
      files: [],
    });
  }
  return commits;
}

function outcomesFromCommits(
  commits: HistoricalCommit[],
  surviving: Set<string>,
  stories: DevelopmentStoryEvidenceInput[],
  usedStory: Set<string>,
): { outcomes: HistoricalReconstructedOutcome[]; unusedSat: HistoricalCommit[] } {
  const clusters = clusterProductCommits(commits.filter((commit) => !isSatelliteCommit(commit)));
  const unusedSat = attachSatellites(clusters, commits.filter((commit) => isSatelliteCommit(commit)));
  const outcomes: HistoricalReconstructedOutcome[] = [];
  for (const cluster of clusters) {
    const primary = cluster.commits.reduce((best, item) => (item.files.length > best.files.length ? item : best));
    const split = cluster.commits.length === 1 ? splitEnumeratedCommit(primary) : null;
    const built = split
      ? split.map((part) =>
          outcomeFromCluster(
            cluster, part.files, part.clause.replace(/^./, (ch) => ch.toUpperCase()),
            distinctiveTerms(part.clause)[0] ?? 'part', surviving, stories, ['enumerated_capability_split'],
          ),
        )
      : [outcomeFromCluster(
          cluster, [...new Set(cluster.commits.flatMap((item) => item.files))],
          primary.subject.replace(/\.$/, ''), null, surviving, stories, [],
        )];
    for (const outcome of built) {
      outcome.storyIds = outcome.storyIds.filter((id) => {
        if (usedStory.has(id)) return false;
        usedStory.add(id);
        return true;
      });
      outcomes.push(outcome);
    }
  }
  return { outcomes, unusedSat };
}

export function reconstructHistoricalDevelopmentOutcomes(input: {
  commits: HistoricalCommit[];
  stories?: DevelopmentStoryEvidenceInput[];
  survivingPaths: string[];
}): {
  outcomes: HistoricalReconstructedOutcome[];
  unreconstructed: Array<{ kind: 'commit' | 'story'; id: string; reason: string }>;
} {
  const surviving = new Set(input.survivingPaths);
  const stories = input.stories ?? [];
  const headShas = new Set(input.commits.map((commit) => commit.sha.toLowerCase()));
  const usedStory = new Set<string>();
  const live = outcomesFromCommits(input.commits.filter((commit) => !isSnapshotCommit(commit)), surviving, stories, usedStory);
  const orphaned = outcomesFromCommits(gitJournalCommits(stories, headShas), surviving, stories, usedStory);
  const outcomes = [...live.outcomes, ...orphaned.outcomes];
  return {
    outcomes,
    unreconstructed: [
      ...live.unusedSat.concat(orphaned.unusedSat).map((commit) => ({
        kind: 'commit' as const, id: commit.sha, reason: 'satellite_without_product_parent',
      })),
      ...stories.filter((story) => {
        const id = story.id || story.sourceStoryKey || '';
        return Boolean(id) && !usedStory.has(id);
      }).map((story) => ({
        kind: 'story' as const,
        id: story.id || story.sourceStoryKey || '',
        reason: isSubstantiveInstruction(story.originalInstruction) ? 'no_explainable_outcome_link' : 'journal_without_outcome',
      })),
    ],
  };
}

export function historicalStoriesForEvaluation(
  outcomes: HistoricalReconstructedOutcome[],
  journal: DevelopmentStoryEvidenceInput[] = [],
): DevelopmentStoryEvidenceInput[] {
  const stamped = journal.map((story) => {
    const id = story.id || story.sourceStoryKey || '';
    const match = outcomes.find((item) => item.storyIds.includes(id));
    if (!match) return story;
    return { ...story, outcomeRootId: match.outcomeRootId, metadata: { ...(story.metadata ?? {}), outcomeRootId: match.outcomeRootId } };
  });
  return [...stamped, ...outcomes.map((item) => item.implementationStory)];
}

export function qualifyingHistoricalOutcomes(
  outcomes: HistoricalReconstructedOutcome[],
): HistoricalReconstructedOutcome[] {
  return outcomes.filter((item) => evaluateDevelopmentContributionEvidence(item.implementationStory).qualifiesAsContribution);
}
