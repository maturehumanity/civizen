/** Bounded evidence-graph signals for historical development reconstruction. */

export type HistoricalCommit = {
  sha: string;
  authoredAt: string;
  subject: string;
  body?: string;
  files: string[];
};

const STOP = new Set([
  'with', 'from', 'that', 'this', 'testing', 'publish', 'note', 'bump', 'release',
  'files', 'update', 'added', 'into', 'when', 'after', 'before', 'live', 'production',
  'channel', 'manifest', 'manifests', 'metadata', 'version', 'count', 'instead',
  'level', 'empty', 'field', 'rules', 'process', 'highest', 'entry', 'job',
]);
const SAT_PATH = /^(public\/updates\/|src\/lib\/app-release\.ts$|package(-lock)?\.json$|android\/)/;
const SAT_SUBJECT = /^(Publish|Note|Bump|Release|Promote)\b/i;
const HUB_PATH = /(i18n\.(base|runtime)|package(-lock)?\.json$|app-release\.ts$|AGENTS\.md$|activeContext\.md$|memory-bank\/)/;
export const HISTORICAL_TEST_PATH = /\.(test|spec)\.(ts|tsx)$|^scripts\/verify-/;
const VERSION_RE = /v?\d+\.\d+\.\d+/i;
export const HISTORICAL_SHA_RE = /\b[0-9a-f]{7,40}\b/gi;

export function distinctiveTerms(text: string): string[] {
  return [...new Set(
    text.toLowerCase().replace(/[^a-z0-9./-]+/g, ' ').split(/\s+/)
      .filter((token) => token.length >= 4 && !STOP.has(token) && !/^\d+$/.test(token)),
  )];
}

export function isSatelliteCommit(commit: HistoricalCommit): boolean {
  if (/^(Note|Bump)\b/i.test(commit.subject)) return true;
  if (!SAT_SUBJECT.test(commit.subject)) return false;
  if (commit.files.length === 0) return true;
  return commit.files.filter((file) => SAT_PATH.test(file)).length / commit.files.length >= 0.5;
}

export function stampMs(iso: string): number {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

export function hoursBetween(a: string, b: string): number {
  return Math.abs(stampMs(a) - stampMs(b)) / 3_600_000;
}

export function primaryPaths(files: string[]): string[] {
  return files.filter((file) => !HUB_PATH.test(file) && !SAT_PATH.test(file));
}

export function jaccard(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size === 0 && right.size === 0) return 0;
  let inter = 0;
  for (const item of left) if (right.has(item)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

export function termOverlap(a: string, b: string): string[] {
  const right = new Set(distinctiveTerms(b));
  return distinctiveTerms(a).filter((term) => right.has(term));
}

export function versionOf(text: string): string | null {
  const match = text.match(VERSION_RE);
  return match ? match[0].toLowerCase() : null;
}

export function inferSurvivingPaths(title: string, surviving: string[]): string[] {
  const terms = distinctiveTerms(title).filter((term) => term.length >= 5);
  if (terms.length === 0) return [];
  return surviving.filter((file) => {
    const lower = file.toLowerCase();
    const hits = terms.filter((term) => lower.includes(term));
    if (hits.length === 0) return false;
    if (hits.length === 1 && (hits[0] === 'docs' || hits[0] === 'chore')) return false;
    return true;
  }).slice(0, 40);
}

export function isSnapshotCommit(commit: HistoricalCommit): boolean {
  return commit.files.length >= 400 || /snapshot under sole author/i.test(commit.subject);
}

export function isSupportiveChange(files: string[]): boolean {
  const primary = primaryPaths(files);
  const product = primary.filter((file) => file.startsWith('src/') && !HISTORICAL_TEST_PATH.test(file));
  return product.length === 0 && primary.length > 0;
}

export function shouldMergeProductCommits(
  earlier: HistoricalCommit,
  later: HistoricalCommit,
): { merge: boolean; reason: string } {
  const gap = hoursBetween(earlier.authoredAt, later.authoredAt);
  if (gap > 36) return { merge: false, reason: 'time_gap' };
  const pathsA = primaryPaths(earlier.files);
  const pathsB = primaryPaths(later.files);
  const overlap = jaccard(pathsA, pathsB);
  const terms = termOverlap(earlier.subject, later.subject);
  if (gap > 8 && overlap < 0.5) return { merge: false, reason: 'stale_weak_overlap' };
  if (overlap >= 0.35) return { merge: true, reason: 'overlapping_primary_paths' };
  const sharedFile = pathsA.some((file) => pathsB.includes(file));
  const supporting = isSupportiveChange(earlier.files) !== isSupportiveChange(later.files);
  const journalOnly = pathsA.length === 0 && pathsB.length === 0;
  if (terms.length >= 2 && gap <= 8 && (sharedFile || supporting || overlap >= 0.2 || journalOnly)) {
    return { merge: true, reason: 'successive_named_change' };
  }
  if (terms.length >= 2 && overlap >= 0.2) return { merge: true, reason: 'named_and_path_overlap' };
  return { merge: false, reason: 'distinct_work' };
}

export function splitEnumeratedCommit(
  commit: HistoricalCommit,
): Array<{ clause: string; files: string[] }> | null {
  if (commit.files.length < 40) return null;
  const stripped = commit.subject.replace(/^(Ship|Add|Fix|Polish|docs:)\s+/i, '').replace(/\.$/, '');
  const clauses = stripped.split(/\s*,\s*|\s+and\s+/i).map((part) => part.trim()).filter((part) => part.length > 8);
  if (clauses.length < 2) return null;
  const groups = clauses.map((clause) => ({
    clause,
    files: commit.files.filter((file) => {
      const keys = [...distinctiveTerms(clause), ...clause.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4)];
      return keys.some((key) => file.toLowerCase().includes(key));
    }),
  }));
  const strong = groups.filter((group) => group.files.length >= 8);
  if (strong.length < 2) return null;
  for (let i = 0; i < strong.length; i += 1) {
    for (let j = i + 1; j < strong.length; j += 1) {
      if (jaccard(strong[i]!.files, strong[j]!.files) >= 0.35) return null;
    }
  }
  const assigned = new Set(strong.flatMap((group) => group.files));
  const leftover = commit.files.filter((file) => !assigned.has(file));
  if (leftover.length) strong[0]!.files = [...strong[0]!.files, ...leftover];
  return strong;
}
