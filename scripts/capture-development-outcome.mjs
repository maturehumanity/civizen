#!/usr/bin/env node
/**
 * Record a completed development outcome through the capture planner.
 * Does not write scores. Persist via ingest_development_story / recordDevelopmentOutcome
 * when a signed-in client or restricted ops path is available.
 *
 * Usage: node scripts/capture-development-outcome.mjs --print <payload.json>
 */
import { readFileSync } from 'node:fs';

const print = process.argv.includes('--print');
const file = process.argv.filter((arg) => !arg.startsWith('--') && !arg.endsWith('.mjs')).at(-1);

if (!file) {
  console.error('Usage: node scripts/capture-development-outcome.mjs --print <payload.json>');
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, 'utf8'));
const required = ['outcomeRootId', 'title', 'instruction'];
for (const key of required) {
  if (!payload[key] || String(payload[key]).trim() === '') {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

if (print) {
  console.log(JSON.stringify({
    sourceStoryKey: `outcome:${payload.outcomeRootId}:implementation`,
    metadata: {
      outcomeRootId: payload.outcomeRootId,
      testsPassed: payload.testsPassed ?? null,
      published: payload.published ?? null,
      unshipped: payload.unshipped === true,
      roles: payload.roles ?? [],
      implementationAssisted: payload.implementationAssisted === true,
      affectedPaths: payload.affectedPaths ?? [],
      captureVersion: 'development-outcome-v1',
    },
    createdFeatures: payload.createdFeatures ?? [],
    commitSha: payload.commitSha ?? null,
  }, null, 2));
}
