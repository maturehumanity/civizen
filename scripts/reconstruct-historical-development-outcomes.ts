#!/usr/bin/env node
/**
 * Reconstruct historical development outcomes from git + development_stories.
 * Does not score journal rows and does not edit Score V2 formulas.
 *
 * Usage:
 *   npx tsx scripts/reconstruct-historical-development-outcomes.ts
 *   npx tsx scripts/reconstruct-historical-development-outcomes.ts --persist
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  groupDevelopmentStoriesToContributions,
  storyFromDevelopmentRow,
  type DevelopmentStoryEvidenceInput,
} from '../src/lib/civizen-development-evidence.ts';
import {
  historicalStoriesForEvaluation,
  qualifyingHistoricalOutcomes,
  reconstructHistoricalDevelopmentOutcomes,
  type HistoricalCommit,
} from '../src/lib/civizen-historical-reconstruction.ts';
import { classifyReconstructionRecall } from '../src/lib/civizen-historical-reconstruction-recall.ts';

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]!]) continue;
      process.env[match[1]!] = match[2]!.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    /* optional */
  }
}

function gitCommits(): HistoricalCommit[] {
  const raw = execSync('git log --pretty=format:%H%x1f%aI%x1f%s%x1e --name-only', { encoding: 'utf8' });
  const commits: HistoricalCommit[] = [];
  let current: HistoricalCommit | null = null;
  for (const line of raw.split('\n')) {
    if (line.includes('\x1f')) {
      const [sha, authoredAt, subject] = line.replace(/\x1e/g, '').split('\x1f');
      current = { sha: sha!, authoredAt: authoredAt!, subject: subject!, files: [] };
      commits.push(current);
    } else if (line.trim() && current) current.files.push(line.trim());
  }
  return commits;
}

function gitSurvivingPaths(): string[] {
  return execSync('git ls-tree -r --name-only HEAD', { encoding: 'utf8' }).split('\n').filter(Boolean);
}

function remotePsql(sql: string): string {
  const host = process.env.REMOTE_DB_HOST;
  const dir = process.env.REMOTE_DOCKER_DIR;
  const db = process.env.REMOTE_DB_NAME || 'postgres';
  const user = process.env.REMOTE_DB_USER || 'postgres';
  if (!host || !dir) throw new Error('REMOTE_DB_HOST and REMOTE_DOCKER_DIR are required');
  return execSync(
    `ssh -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 ${host} "cd ${dir} && sudo docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${user} -d ${db} -t -A"`,
    { input: sql, encoding: 'utf8', maxBuffer: 80_000_000 },
  ).trim();
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function summarize(label: string, value: unknown) {
  console.log(`${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}

function loadJournal(): { rows: Record<string, unknown>[]; stories: DevelopmentStoryEvidenceInput[] } {
  const raw = remotePsql(`
    SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
    FROM (
      SELECT id, source_story_key, source, source_type, status, title, original_instruction,
             rephrased_description, created_features, area, commit_sha, pr_number, reviewed_by,
             chat_id, requested_at, created_at, metadata, author_id
      FROM public.development_stories
      WHERE source IN ('git','chat') OR source_type IN ('git','chat')
      ORDER BY requested_at NULLS LAST
    ) s;
  `);
  const rows = JSON.parse(raw) as Record<string, unknown>[];
  return { rows, stories: rows.map((row) => storyFromDevelopmentRow(row)) };
}

function persistSql(
  profileId: string,
  qualifying: ReturnType<typeof qualifyingHistoricalOutcomes>,
  grouped: ReturnType<typeof groupDevelopmentStoriesToContributions>,
  journalRows: Record<string, unknown>[],
): string {
  const statements: string[] = ['BEGIN;'];
  for (const outcome of qualifying) {
    const story = outcome.implementationStory;
    statements.push(`
INSERT INTO public.development_stories (
  source_story_key, author_id, title, original_instruction, rephrased_description,
  section, area, created_features, expected_behavior, source, source_type,
  requested_at, story_kind, status, visibility, commit_sha, metadata, published_at
) VALUES (
  ${sqlLiteral(story.sourceStoryKey || '')},
  ${sqlLiteral(profileId)}::uuid,
  ${sqlLiteral((story.title || 'Platform improvement').slice(0, 200))},
  ${sqlLiteral(story.originalInstruction || story.title || 'Historical development outcome')},
  ${sqlLiteral(story.originalInstruction || story.title || 'Historical development outcome')},
  'Platform', 'General',
  ARRAY[${(story.createdFeatures ?? []).map((item) => sqlLiteral(item)).join(', ')}]::text[],
  'The reconstructed historical outcome should remain visible in current product behavior.',
  'historical_reconstruction', 'outcome',
  ${sqlLiteral(story.requestedAt || new Date().toISOString())}::timestamptz,
  'development', 'published', 'public',
  ${story.commitSha ? sqlLiteral(story.commitSha) : 'NULL'},
  ${sqlLiteral(JSON.stringify(story.metadata ?? {}))}::jsonb,
  now()
)
ON CONFLICT (source_story_key) DO UPDATE SET
  title = EXCLUDED.title,
  original_instruction = EXCLUDED.original_instruction,
  rephrased_description = EXCLUDED.rephrased_description,
  created_features = EXCLUDED.created_features,
  commit_sha = COALESCE(EXCLUDED.commit_sha, public.development_stories.commit_sha),
  metadata = COALESCE(public.development_stories.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  status = 'published';`);
  }

  for (const outcome of qualifying) {
    const ids = new Set(outcome.storyIds);
    for (const row of journalRows) {
      const id = String(row.id ?? '');
      const key = String(row.source_story_key ?? '');
      if (!ids.has(id) && !ids.has(key)) continue;
      statements.push(`
UPDATE public.development_stories
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('outcomeRootId', ${sqlLiteral(outcome.outcomeRootId)})
WHERE id = ${sqlLiteral(id)}::uuid;`);
    }
  }

  const eligible = grouped.map((item) => sqlLiteral(item.sourceId)).join(', ');
  statements.push(`
DELETE FROM public.profile_contribution_events
WHERE profile_id = ${sqlLiteral(profileId)}::uuid
  AND source_table = 'development_stories'
  AND source_id NOT IN (${eligible || sqlLiteral('__none__')});`);

  for (const item of grouped) {
    // capacity/impact/collaboration columns are NOT NULL placeholders only.
    // contribution-evaluation-v2 ignores them and evaluates from verified evidence on read.
    statements.push(`
INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta, updated_at
) VALUES (
  ${sqlLiteral(profileId)}::uuid,
  'development_stories',
  ${sqlLiteral(item.sourceId)},
  'development_story',
  ${sqlLiteral(item.title.slice(0, 120))},
  ${sqlLiteral(item.summary)},
  78, 78, 35, 75, true,
  ${sqlLiteral(item.occurredAt)}::timestamptz,
  ${sqlLiteral(JSON.stringify({
    eligibility: item.eligibility,
    provenanceCount: item.provenanceStoryIds.length,
    reconstruction: true,
    testsPassed: item.testsPassed,
    contributionFunction: item.contributionFunction,
    affectedPaths: item.affectedPaths.slice(0, 20),
    reconstructionResult: item.reconstructionResult,
    survivingImplementation: item.survivingImplementation,
    contributionRoles: item.roles,
    implementationAssisted: item.implementationAssisted,
    independentValidation: item.independentValidation,
    outcomeValidated: item.outcomeValidated,
    commitShas: item.commitShas.slice(0, 8),
  }))}::jsonb,
  now()
)
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  verified = true,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();`);
  }
  statements.push('COMMIT;');
  return statements.join('\n');
}

async function main() {
  loadEnv();
  const persist = process.argv.includes('--persist');
  const commits = gitCommits();
  const survivingPaths = gitSurvivingPaths();
  let journalRows: Record<string, unknown>[] = [];
  let journal: DevelopmentStoryEvidenceInput[] = [];
  try {
    const loaded = loadJournal();
    journalRows = loaded.rows;
    journal = loaded.stories;
  } catch (error) {
    console.warn(`Journal load skipped: ${(error as Error).message}`);
  }

  const reconstructed = reconstructHistoricalDevelopmentOutcomes({ commits, stories: journal, survivingPaths });
  const qualifying = qualifyingHistoricalOutcomes(reconstructed.outcomes);
  const stories = historicalStoriesForEvaluation(qualifying, journal);
  const grouped = groupDevelopmentStoriesToContributions(stories);

  summarize('commits', commits.length);
  summarize('journal_rows', journal.length);
  summarize('reconstructed_outcomes', reconstructed.outcomes.length);
  summarize('reconstructed', reconstructed.outcomes.filter((item) => item.result === 'reconstructed').length);
  summarize('reconstructed_with_uncertainty', reconstructed.outcomes.filter((item) => item.result === 'reconstructed_with_uncertainty').length);
  summarize('unreconstructed', reconstructed.unreconstructed.length);
  summarize('qualifying_contribution_roots', grouped.length);
  summarize('reconstruction_confidence', {
    high: reconstructed.outcomes.filter((item) => item.reconstructionConfidence === 'high').length,
    moderate: reconstructed.outcomes.filter((item) => item.reconstructionConfidence === 'moderate').length,
  });
  summarize('contribution_evidence_confidence', {
    high: reconstructed.outcomes.filter((item) => item.contributionEvidenceConfidence === 'high').length,
    moderate: reconstructed.outcomes.filter((item) => item.contributionEvidenceConfidence === 'moderate').length,
    low: reconstructed.outcomes.filter((item) => item.contributionEvidenceConfidence === 'low').length,
  });
  summarize('sample_titles', qualifying.slice(0, 15).map((item) => item.title));
  const recall = classifyReconstructionRecall({
    stories: journal,
    outcomes: reconstructed.outcomes,
    survivingPaths,
  });
  summarize('recall_buckets', {
    attached_to_outcome: recall.filter((item) => item.bucket === 'attached_to_outcome').length,
    provenance_only: recall.filter((item) => item.bucket === 'provenance_only').length,
    unreconstructed_with_surviving_implementation: recall.filter((item) => item.bucket === 'unreconstructed_with_surviving_implementation').length,
    process_or_non_contributory: recall.filter((item) => item.bucket === 'process_or_non_contributory').length,
    recovered_now: reconstructed.outcomes.filter((item) => item.outcomeRootId.startsWith('historical:recall:')).length,
  });
  summarize('recall_recoveries', reconstructed.outcomes.filter((item) => item.outcomeRootId.startsWith('historical:recall:')).map((item) => ({
    title: item.title,
    result: item.result,
    reconstructionConfidence: item.reconstructionConfidence,
    testsPassed: item.testsPassed,
    pathCount: item.affectedPaths.length,
    storyIds: item.storyIds,
  })));

  if (!persist) {
    console.log('DRY RUN. Pass --persist to write reconstructed outcomes, or --persist --recall-only for recall recoveries only.');
    return;
  }
  const recallOnly = process.argv.includes('--recall-only');
  const recallOutcomes = qualifying.filter((item) => item.outcomeRootId.startsWith('historical:recall:'));
  const persistOutcomes = recallOnly ? recallOutcomes : qualifying;
  const persistStories = historicalStoriesForEvaluation(persistOutcomes, journal);
  const persistGrouped = groupDevelopmentStoriesToContributions(persistStories);
  if (!persistGrouped.length) throw new Error('No qualifying historical outcomes to persist');
  const profileId = process.env.STORY_AUTHOR_ID || process.env.RECONSTRUCT_PROFILE_ID ||
    String(journalRows[0]?.author_id ?? '');
  if (!profileId) throw new Error('Could not resolve profile/author id for persist');
  if (recallOnly) {
    remotePsql(persistSql(profileId, persistOutcomes, persistGrouped, journalRows).replace(
      /DELETE FROM public\.profile_contribution_events[\s\S]*?;/,
      '-- recall-only: do not prune existing contribution roots',
    ));
    summarize('persisted_recall_roots', persistGrouped.length);
  } else {
    remotePsql(persistSql(profileId, persistOutcomes, persistGrouped, journalRows));
    summarize('persisted_roots', persistGrouped.length);
  }
  summarize('profile_id_set', true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
