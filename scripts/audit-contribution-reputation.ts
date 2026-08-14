#!/usr/bin/env node
/**
 * Audit Contributions reputation derivation. Does not change Score V2.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { auditContributionReputation } from '../src/lib/civizen-contribution-audit.ts';
import { summarizeContributionEvidenceConfidence } from '../src/lib/civizen-contribution-confidence.ts';
import { scoreContributionsFromEvents } from '../src/lib/civizen-contribution-score.ts';
import type { ContributionEvent } from '../src/lib/civizen-contributions.ts';

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

function remotePsql(sql: string): string {
  const host = process.env.REMOTE_DB_HOST;
  const dir = process.env.REMOTE_DOCKER_DIR;
  const db = process.env.REMOTE_DB_NAME || 'postgres';
  const user = process.env.REMOTE_DB_USER || 'postgres';
  if (!host || !dir) throw new Error('REMOTE_DB_HOST and REMOTE_DOCKER_DIR are required');
  return execSync(
    `ssh -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 ${host} "cd ${dir} && sudo docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${user} -d ${db} -t -A"`,
    { input: sql, encoding: 'utf8', maxBuffer: 20_000_000 },
  ).trim();
}

function main() {
  loadEnv();
  const profileId = process.env.STORY_AUTHOR_ID || process.env.RECONSTRUCT_PROFILE_ID;
  const filter = profileId ? `WHERE profile_id = '${profileId.replace(/'/g, "''")}'` : '';
  const raw = remotePsql(`
    SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
    FROM (
      SELECT profile_id, source_table, source_id, event_type, title, summary,
             capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
             verified, occurred_at, raw_meta
      FROM public.profile_contribution_events
      ${filter}
      ORDER BY occurred_at DESC
    ) e;
  `);
  const rows = JSON.parse(raw) as Array<Record<string, unknown>>;
  const events: ContributionEvent[] = rows.map((row) => ({
    profileId: String(row.profile_id),
    sourceTable: String(row.source_table),
    sourceId: String(row.source_id),
    eventType: row.event_type as ContributionEvent['eventType'],
    title: String(row.title ?? ''),
    summary: typeof row.summary === 'string' ? row.summary : null,
    capacityEstimate: Number(row.capacity_estimate ?? 0),
    impactEstimate: Number(row.impact_estimate ?? 0),
    collaborationEstimate: Number(row.collaboration_estimate ?? 0),
    beneficiaryEstimate: Number(row.beneficiary_estimate ?? 0),
    verified: row.verified === true,
    occurredAt: String(row.occurred_at ?? ''),
    rawMeta: (row.raw_meta && typeof row.raw_meta === 'object' ? row.raw_meta : {}) as Record<string, unknown>,
  }));
  const scored = scoreContributionsFromEvents(events);
  const audit = auditContributionReputation(events);
  const confidence = summarizeContributionEvidenceConfidence(events);
  console.log(JSON.stringify({ score: scored?.score, confidence: confidence.overall, reason: confidence.reason, factors: confidence.factors, audit }, null, 2));
}

main();
