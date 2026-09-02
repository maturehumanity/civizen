#!/usr/bin/env node
/**
 * Local gate that mirrors .github/workflows/ci.yml validate job.
 * Run before git push so audit / assistant knowledge / test / build failures
 * are caught on the workstation instead of in Gmail.
 *
 * Usage: npm run verify:pre-push
 */
import { spawnSync } from 'node:child_process';

const STEPS = [
  { label: 'audit', cmd: 'npm', args: ['run', 'audit:ci'] },
  { label: 'assistant knowledge', cmd: 'npm', args: ['run', 'assistant:knowledge:check'] },
  { label: 'test', cmd: 'npm', args: ['test'] },
  { label: 'build', cmd: 'npm', args: ['run', 'build'] },
];

function fail(step, code) {
  console.error(`verify:pre-push FAIL at ${step} (exit ${code ?? 'unknown'})`);
  process.exit(code || 1);
}

console.log('verify:pre-push: running local CI parity checks …');

for (const step of STEPS) {
  console.log(`verify:pre-push: ${step.label} …`);
  const result = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    fail(step.label, result.status);
  }
}

console.log('verify:pre-push OK');
