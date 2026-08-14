/** Integrity helpers for reconstruction vs persisted roots. Not a score model. */

import { isSatelliteCommit, jaccard, primaryPaths, termOverlap } from '@/lib/civizen-historical-reconstruction-signals';

export type UnpersistedClusterReason =
  | 'duplicate_representation'
  | 'subordinate_satellite'
  | 'overlapping_cluster'
  | 'superseded_or_reverted'
  | 'attribution_insufficient'
  | 'implementation_insufficient'
  | 'reconstruction_uncertainty'
  | 'genuinely_distinct_qualifying'
  | 'other';

export type ExistingRootSnapshot = {
  sourceId: string;
  title: string;
  affectedPaths: string[];
  commitShas: string[];
};

export type ClusterSnapshot = {
  outcomeRootId: string;
  title: string;
  affectedPaths: string[];
  commitShas: string[];
  result: string;
  contributionEvidenceConfidence: string;
  attributionConfidence?: string;
  survivingImplementation: boolean;
  testsPassed: boolean | null;
};

const SAT_TITLE = /^(Publish|Note|Bump|Release|Promote|chore:|docs:)\b/i;

function pathsOf(item: { affectedPaths: string[] }): string[] {
  return primaryPaths(item.affectedPaths);
}

function bestOverlap(cluster: ClusterSnapshot, existing: ExistingRootSnapshot[]): {
  item: ExistingRootSnapshot;
  pathScore: number;
  terms: string[];
} | null {
  let best: { item: ExistingRootSnapshot; pathScore: number; terms: string[] } | null = null;
  for (const item of existing) {
    const pathScore = jaccard(pathsOf(cluster), pathsOf(item));
    const terms = termOverlap(cluster.title, item.title);
    if (!best || pathScore > best.pathScore || (pathScore === best.pathScore && terms.length > best.terms.length)) {
      best = { item, pathScore, terms };
    }
  }
  return best;
}

export function classifyUnpersistedCluster(
  cluster: ClusterSnapshot,
  existing: ExistingRootSnapshot[],
): { reason: UnpersistedClusterReason; matchedSourceId?: string; matchedTitle?: string } {
  const primary = pathsOf(cluster);
  const sat = SAT_TITLE.test(cluster.title) || isSatelliteCommit({
    sha: cluster.commitShas[0] || '0',
    authoredAt: '',
    subject: cluster.title,
    files: cluster.affectedPaths,
  });
  if (sat) {
    const overlap = bestOverlap(cluster, existing);
    return { reason: 'subordinate_satellite', matchedSourceId: overlap?.item.sourceId, matchedTitle: overlap?.item.title };
  }
  if (!cluster.survivingImplementation || cluster.contributionEvidenceConfidence === 'low' || primary.length === 0) {
    if (cluster.affectedPaths.length > 0 && primary.length === 0) {
      return { reason: 'implementation_insufficient' };
    }
    if (!cluster.survivingImplementation) return { reason: 'superseded_or_reverted' };
    return { reason: 'implementation_insufficient' };
  }
  const overlap = bestOverlap(cluster, existing);
  if (overlap && overlap.pathScore >= 0.6) {
    return { reason: 'duplicate_representation', matchedSourceId: overlap.item.sourceId, matchedTitle: overlap.item.title };
  }
  if (overlap && (overlap.pathScore >= 0.25 || overlap.terms.length >= 2) && primary.some((path) => pathsOf(overlap.item).includes(path))) {
    return { reason: 'overlapping_cluster', matchedSourceId: overlap.item.sourceId, matchedTitle: overlap.item.title };
  }
  if (overlap && overlap.terms.length >= 3) {
    return { reason: 'duplicate_representation', matchedSourceId: overlap.item.sourceId, matchedTitle: overlap.item.title };
  }
  if (cluster.attributionConfidence === 'unknown' || cluster.attributionConfidence === 'low') {
    return { reason: 'attribution_insufficient', matchedSourceId: overlap?.item.sourceId, matchedTitle: overlap?.item.title };
  }
  if (cluster.result === 'reconstructed_with_uncertainty' && overlap && overlap.pathScore > 0) {
    return { reason: 'reconstruction_uncertainty', matchedSourceId: overlap.item.sourceId, matchedTitle: overlap.item.title };
  }
  if (/^template:|^Merge branch\b/i.test(cluster.title)) {
    return { reason: 'other', matchedSourceId: overlap?.item.sourceId, matchedTitle: overlap?.item.title };
  }
  const disjoint = existing.every((item) => jaccard(primary, pathsOf(item)) === 0);
  if (disjoint && primary.length >= 3 && cluster.survivingImplementation) {
    return { reason: 'genuinely_distinct_qualifying' };
  }
  if (overlap && overlap.pathScore > 0) {
    return { reason: 'overlapping_cluster', matchedSourceId: overlap.item.sourceId, matchedTitle: overlap.item.title };
  }
  return { reason: 'other', matchedSourceId: overlap?.item.sourceId, matchedTitle: overlap?.item.title };
}

export function unmatchedPersistedRoots(
  existing: ExistingRootSnapshot[],
  reconstructedSourceIds: string[],
): ExistingRootSnapshot[] {
  const have = new Set(reconstructedSourceIds);
  return existing.filter((item) => !have.has(item.sourceId));
}

function productImplementationPaths(files: string[]): string[] {
  return primaryPaths(files).filter((file) => /^(src\/|supabase\/)/.test(file));
}

function sharedProductPaths(cluster: ClusterSnapshot, match: ExistingRootSnapshot): string[] {
  const right = new Set(productImplementationPaths(match.affectedPaths));
  return productImplementationPaths(cluster.affectedPaths).filter((path) => right.has(path));
}

export function strongSameOutcomeIdentity(cluster: ClusterSnapshot, match: ExistingRootSnapshot): boolean {
  const product = sharedProductPaths(cluster, match);
  const pathScore = jaccard(productImplementationPaths(cluster.affectedPaths), productImplementationPaths(match.affectedPaths));
  const primaryScore = jaccard(pathsOf(cluster), pathsOf(match));
  const terms = termOverlap(cluster.title, match.title);
  if (primaryScore >= 0.6) return true;
  if (product.length >= 2 && pathScore >= 0.45 && terms.length >= 1) return true;
  if (product.length >= 3 && pathScore >= 0.5) return true;
  return false;
}

export function canInheritCanonicalProvenance(
  classified: ReturnType<typeof classifyUnpersistedCluster>,
  cluster: ClusterSnapshot,
  existing: ExistingRootSnapshot[],
): boolean {
  const match = existing.find((item) => item.sourceId === classified.matchedSourceId);
  if (!match) return false;
  if (classified.reason === 'duplicate_representation') return strongSameOutcomeIdentity(cluster, match) || jaccard(pathsOf(cluster), pathsOf(match)) >= 0.6;
  if (classified.reason === 'overlapping_cluster' || classified.reason === 'subordinate_satellite') {
    return strongSameOutcomeIdentity(cluster, match);
  }
  return false;
}

export type CanonicalInheritanceMove = {
  storyId: string;
  fromRootId: string;
  toSourceId: string;
  clusterReason: UnpersistedClusterReason;
  identityEstablished: boolean;
  action: 'merge_into_canonical' | 'remain_on_cluster' | 'journal_only';
};

export function inheritCanonicalProvenance(
  outcomes: Array<{
    outcomeRootId: string;
    title: string;
    affectedPaths: string[];
    commitShas: string[];
    storyIds: string[];
    linkReasons: string[];
    result?: string;
    contributionEvidenceConfidence?: string;
    attributionConfidence?: string;
    survivingImplementation?: boolean;
    testsPassed?: boolean | null;
  }>,
  existing: ExistingRootSnapshot[],
  humanStoryIds: Set<string>,
): CanonicalInheritanceMove[] {
  const persisted = new Set(existing.map((item) => item.sourceId));
  const bySource = new Map(outcomes.map((item) => [`outcome:${item.outcomeRootId}`, item]));
  const moves: CanonicalInheritanceMove[] = [];
  for (const cluster of outcomes) {
    const clusterSource = `outcome:${cluster.outcomeRootId}`;
    if (persisted.has(clusterSource)) continue;
    const snapshot: ClusterSnapshot = {
      outcomeRootId: cluster.outcomeRootId,
      title: cluster.title,
      affectedPaths: cluster.affectedPaths,
      commitShas: cluster.commitShas,
      result: cluster.result || 'reconstructed',
      contributionEvidenceConfidence: cluster.contributionEvidenceConfidence || 'moderate',
      attributionConfidence: cluster.attributionConfidence,
      survivingImplementation: cluster.survivingImplementation !== false,
      testsPassed: cluster.testsPassed ?? null,
    };
    const classified = classifyUnpersistedCluster(snapshot, existing);
    const inherit = canInheritCanonicalProvenance(classified, snapshot, existing);
    const target = classified.matchedSourceId ? bySource.get(classified.matchedSourceId) : undefined;
    if (!inherit || !target || !classified.matchedSourceId) {
      const action = classified.reason === 'other' ? 'journal_only' : 'remain_on_cluster';
      for (const id of cluster.storyIds.filter((item) => humanStoryIds.has(item))) {
        moves.push({
          storyId: id,
          fromRootId: cluster.outcomeRootId,
          toSourceId: classified.matchedSourceId || '',
          clusterReason: classified.reason,
          identityEstablished: inherit,
          action,
        });
      }
      continue;
    }
    const keep: string[] = [];
    for (const id of cluster.storyIds) {
      if (!humanStoryIds.has(id)) {
        keep.push(id);
        continue;
      }
      if (!target.storyIds.includes(id)) {
        target.storyIds.push(id);
        target.linkReasons.push('canonical_provenance_inheritance');
      }
      moves.push({
        storyId: id,
        fromRootId: cluster.outcomeRootId,
        toSourceId: classified.matchedSourceId,
        clusterReason: classified.reason,
        identityEstablished: true,
        action: 'merge_into_canonical',
      });
    }
    cluster.storyIds = keep;
  }
  return moves;
}

