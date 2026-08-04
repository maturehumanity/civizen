#!/usr/bin/env node
/**
 * CI npm audit gate with an explicit allowlist for advisories that do not
 * apply to Civizen's runtime (SPA BrowserRouter, no unstable RSC APIs).
 *
 * Keep the allowlist tiny and documented. Prefer upgrading when a patched
 * version is compatible with our React major.
 */
import { spawnSync } from 'node:child_process';

/** Advisories accepted until a compatible patched release is adoptable. */
const ALLOWLIST = new Map([
  [
    'GHSA-QWWW-VCR4-C8H2',
    'React Router unstable RSC CSRF only; Civizen uses SPA BrowserRouter, not RSC. Upgrade to 8.3+ requires React 19.',
  ],
]);

const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

const stdout = result.stdout || '';
let report;
try {
  report = JSON.parse(stdout);
} catch {
  console.error('npm audit did not return JSON:');
  console.error(stdout || result.stderr);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const allowlistedPackages = new Set();

for (const [name, entry] of Object.entries(vulnerabilities)) {
  const via = Array.isArray(entry.via) ? entry.via : [];
  const advisoryIds = via
    .map((item) => (typeof item === 'object' && item?.url ? String(item.url) : null))
    .filter(Boolean)
    .map((text) => {
      const match = text.match(/GHSA-[a-z0-9-]+/i);
      return match ? match[0].toUpperCase() : null;
    })
    .filter(Boolean);

  if (advisoryIds.length > 0 && advisoryIds.every((id) => ALLOWLIST.has(id))) {
    allowlistedPackages.add(name);
    for (const id of advisoryIds) {
      console.log(`allowlisted ${id} via ${name}: ${ALLOWLIST.get(id)}`);
    }
  }
}

const blockers = [];

for (const [name, entry] of Object.entries(vulnerabilities)) {
  if (allowlistedPackages.has(name)) continue;

  const via = Array.isArray(entry.via) ? entry.via : [];
  const onlyAllowlistedDeps =
    via.length > 0 &&
    via.every((item) => typeof item === 'string' && allowlistedPackages.has(item));

  if (onlyAllowlistedDeps) {
    console.log(`allowlisted dependency chain ${name} → ${via.join(', ')}`);
    continue;
  }

  const advisoryIds = via
    .map((item) => (typeof item === 'object' && item?.url ? String(item.url) : null))
    .filter(Boolean)
    .map((text) => {
      const match = text.match(/GHSA-[a-z0-9-]+/i);
      return match ? match[0].toUpperCase() : null;
    })
    .filter(Boolean);

  blockers.push({
    name,
    severity: entry.severity,
    range: entry.range,
    ids: advisoryIds.length > 0 ? advisoryIds : via.map(String),
  });
}

if (blockers.length > 0) {
  console.error('npm audit failed with non-allowlisted vulnerabilities:');
  for (const blocker of blockers) {
    console.error(`- ${blocker.name} [${blocker.severity}] ${blocker.ids.join(', ')} (${blocker.range || 'n/a'})`);
  }
  process.exit(1);
}

console.log('audit-ci OK');
process.exit(0);
