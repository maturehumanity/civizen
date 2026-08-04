#!/usr/bin/env node
/**
 * Wait for GitHub Actions CI on the current HEAD commit and fail if it is red.
 * Usage: npm run verify:ci
 * Optional: VERIFY_CI_TIMEOUT_MS=900000 npm run verify:ci
 */
import { execFileSync, spawnSync } from 'node:child_process';

const WORKFLOW = process.env.VERIFY_CI_WORKFLOW || 'CI';
const TIMEOUT_MS = Number(process.env.VERIFY_CI_TIMEOUT_MS || 15 * 60 * 1000);
const POLL_MS = Number(process.env.VERIFY_CI_POLL_MS || 5000);

function fail(msg) {
  console.error(`verify:ci FAIL: ${msg}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr?.toString?.()?.trim?.() || '';
    const stdout = error?.stdout?.toString?.()?.trim?.() || '';
    fail(`${cmd} ${args.join(' ')} failed${stderr ? `: ${stderr}` : stdout ? `: ${stdout}` : ''}`);
  }
}

function which(bin) {
  const result = spawnSync('which', [bin], { encoding: 'utf8' });
  return result.status === 0;
}

async function main() {
  if (!which('gh')) {
    fail('gh CLI is required (https://cli.github.com/)');
  }
  if (!which('git')) {
    fail('git is required');
  }

  const sha = run('git', ['rev-parse', 'HEAD']);
  const shortSha = sha.slice(0, 7);
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

  console.log(`verify:ci: waiting for workflow "${WORKFLOW}" on ${branch}@${shortSha}`);

  const started = Date.now();
  let runUrl = null;
  let runId = null;

  while (Date.now() - started < TIMEOUT_MS) {
    const raw = run('gh', [
      'run',
      'list',
      '--workflow',
      WORKFLOW,
      '--commit',
      sha,
      '--limit',
      '5',
      '--json',
      'databaseId,status,conclusion,url,displayTitle,createdAt',
    ]);

    let runs = [];
    try {
      runs = JSON.parse(raw || '[]');
    } catch {
      fail(`could not parse gh run list JSON: ${raw.slice(0, 200)}`);
    }

    if (runs.length > 0) {
      runs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const latest = runs[0];
      runId = latest.databaseId;
      runUrl = latest.url;

      if (latest.status === 'completed') {
        if (latest.conclusion === 'success') {
          console.log(`verify:ci OK: ${WORKFLOW} succeeded for ${shortSha}`);
          console.log(runUrl);
          process.exit(0);
        }
        const failedLog = spawnSync(
          'gh',
          ['run', 'view', String(runId), '--log-failed'],
          { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
        );
        const snippet = (failedLog.stdout || failedLog.stderr || '')
          .split('\n')
          .slice(-40)
          .join('\n')
          .trim();
        if (snippet) {
          console.error(snippet);
        }
        fail(`${WORKFLOW} concluded ${latest.conclusion} for ${shortSha}\n${runUrl}`);
      }

      console.log(`verify:ci: run ${runId} status=${latest.status} …`);
    } else {
      console.log(`verify:ci: no ${WORKFLOW} run for ${shortSha} yet …`);
    }

    await sleep(POLL_MS);
  }

  fail(
    `timed out after ${Math.round(TIMEOUT_MS / 1000)}s waiting for ${WORKFLOW} on ${shortSha}` +
      (runUrl ? `\nLast seen: ${runUrl}` : ''),
  );
}

main().catch((error) => {
  fail(error?.message || String(error));
});
