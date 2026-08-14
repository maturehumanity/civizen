#!/usr/bin/env node
/**
 * Ensures agent context files exist and AGENTS.md references them.
 * Usage: node scripts/verify-agent-context.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const REQUIRED = [
  'memory-bank/activeContext.md',
  'memory-bank/systemPatterns.md',
  'memory-bank/projectbrief.md',
  'docs/04-operations/dev/nav-secondary-carousel.md',
  '.cursor/rules/civizen-project.mdc',
];

const AGENTS = 'docs/04-operations/dev/AGENTS.md';

function fail(msg) {
  console.error(`verify:agent-context FAIL: ${msg}`);
  process.exit(1);
}

for (const path of REQUIRED) {
  if (!existsSync(path)) {
    fail(`missing ${path}`);
  }
}

const agents = readFileSync(AGENTS, 'utf8');
if (!agents.includes('nav-secondary-carousel.md')) {
  fail('AGENTS.md must reference docs/04-operations/dev/nav-secondary-carousel.md');
}
if (!agents.includes('00-foundation/recognized-planetary-citizenship-pathway.md')) {
  fail('AGENTS.md must reference docs/00-foundation/recognized-planetary-citizenship-pathway.md');
}
if (!existsSync('docs/00-foundation/philosophy-of-mature-humanity.md')) {
  fail('missing docs/00-foundation/philosophy-of-mature-humanity.md');
}
if (!existsSync('docs/institutional/institutional-blueprint.md')) {
  fail('missing docs/institutional/institutional-blueprint.md');
}
if (!existsSync('docs/institutional/governance-framework.md')) {
  fail('missing docs/institutional/governance-framework.md');
}
if (!existsSync('docs/institutional/stakeholder-partnership-framework.md')) {
  fail('missing docs/institutional/stakeholder-partnership-framework.md');
}
if (!existsSync('docs/institutional/pilot-framework.md')) {
  fail('missing docs/institutional/pilot-framework.md');
}
if (!existsSync('docs/institutional/founder-transition-succession-framework.md')) {
  fail('missing docs/institutional/founder-transition-succession-framework.md');
}
if (!existsSync('docs/institutional/contributor-framework.md')) {
  fail('missing docs/institutional/contributor-framework.md');
}
if (!existsSync('docs/institutional/areas-domains-participation-framework.md')) {
  fail('missing docs/institutional/areas-domains-participation-framework.md');
}
if (!existsSync('docs/03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md')) {
  fail('missing docs/03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md');
}
if (!existsSync('docs/03-platform/model-evolution/shared-classification-registry-v1.md')) {
  fail('missing docs/03-platform/model-evolution/shared-classification-registry-v1.md');
}
if (!existsSync('docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md')) {
  fail('missing docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md');
}
if (!agents.includes('institutional/institutional-blueprint.md')) {
  fail('AGENTS.md must reference docs/institutional/institutional-blueprint.md');
}
if (!agents.includes('institutional/governance-framework.md')) {
  fail('AGENTS.md must reference docs/institutional/governance-framework.md');
}
if (!agents.includes('institutional/stakeholder-partnership-framework.md')) {
  fail('AGENTS.md must reference docs/institutional/stakeholder-partnership-framework.md');
}
if (!agents.includes('institutional/pilot-framework.md')) {
  fail('AGENTS.md must reference docs/institutional/pilot-framework.md');
}
if (!agents.includes('institutional/founder-transition-succession-framework.md')) {
  fail('AGENTS.md must reference docs/institutional/founder-transition-succession-framework.md');
}
if (!agents.includes('institutional/contributor-framework.md')) {
  fail('AGENTS.md must reference docs/institutional/contributor-framework.md');
}
if (!agents.includes('institutional/areas-domains-participation-framework.md')) {
  fail('AGENTS.md must reference docs/institutional/areas-domains-participation-framework.md');
}
if (!agents.includes('model-evolution/shared-classification-and-model-evolution-architecture.md')) {
  fail('AGENTS.md must reference docs/03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md');
}
if (!agents.includes('areas-and-initiatives/public-areas-initiatives-v1.md')) {
  fail('AGENTS.md must reference docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md');
}
if (!agents.includes('memory-bank/activeContext.md')) {
  fail('AGENTS.md must reference memory-bank/activeContext.md');
}
if (!agents.includes('verify:agent-context')) {
  fail('AGENTS.md must reference verify:agent-context in post-dev sequence');
}
if (!agents.includes('verify:ci')) {
  fail('AGENTS.md must reference verify:ci after push');
}
if (!existsSync('scripts/verify-ci.mjs')) {
  fail('missing scripts/verify-ci.mjs');
}
if (!existsSync('scripts/verify-home-post-composer.mjs')) {
  fail('missing scripts/verify-home-post-composer.mjs');
}
if (!agents.includes('verify:home-post-composer')) {
  fail('AGENTS.md must reference verify:home-post-composer in post-dev / interaction gates');
}
if (!existsSync('scripts/verify-profile-score-dial.mjs')) {
  fail('missing scripts/verify-profile-score-dial.mjs');
}
if (!agents.includes('verify:profile-score-dial')) {
  fail('AGENTS.md must reference verify:profile-score-dial in post-dev / Score dial gates');
}

const cursorRule = readFileSync('.cursor/rules/civizen-project.mdc', 'utf8');
if (!cursorRule.includes('verify:ci')) {
  fail('.cursor/rules/civizen-project.mdc must require verify:ci after push');
}
if (!cursorRule.includes('verify:home-post-composer')) {
  fail('.cursor/rules/civizen-project.mdc must require verify:home-post-composer after UI work');
}
if (!cursorRule.includes('verify:profile-score-dial')) {
  fail('.cursor/rules/civizen-project.mdc must require verify:profile-score-dial after UI work');
}

if (!existsSync('docs/04-operations/dev/phase-1-pilot-operating-model.md')) {
  fail('missing docs/04-operations/dev/phase-1-pilot-operating-model.md');
}
if (!agents.includes('phase-1-pilot-operating-model.md')) {
  fail('AGENTS.md must reference docs/04-operations/dev/phase-1-pilot-operating-model.md');
}
if (!existsSync('docs/04-operations/dev/agreements.md')) {
  fail('missing docs/04-operations/dev/agreements.md');
}
if (!agents.includes('agreements.md')) {
  fail('AGENTS.md must reference docs/04-operations/dev/agreements.md');
}
if (!existsSync('docs/assistant/civizen-assistant-cheatsheet.md')) {
  fail('missing docs/assistant/civizen-assistant-cheatsheet.md');
}
if (!existsSync('docs/assistant/civizen-identity.md')) {
  fail('missing docs/assistant/civizen-identity.md');
}
if (!agents.includes('civizen-identity.md')) {
  fail('AGENTS.md must reference docs/assistant/civizen-identity.md');
}
if (!existsSync('src/lib/assistant/catalog.ts')) {
  fail('missing src/lib/assistant/catalog.ts');
}
if (!existsSync('src/lib/assistant/generated/knowledge-pack.ts')) {
  fail('missing generated assistant knowledge pack');
}
if (!existsSync('supabase/functions/messaging-agent-reply/nela-bundle.js')) {
  fail('missing Civi knowledge bundle; run npm run assistant:knowledge');
}
if (!agents.includes('assistant:knowledge')) {
  fail('AGENTS.md must reference npm run assistant:knowledge');
}

const spec = readFileSync('docs/04-operations/dev/nav-secondary-carousel.md', 'utf8');
if (!spec.includes('Sell') || !spec.includes('Jobs') || !spec.includes('390px')) {
  fail('nav-secondary-carousel.md missing key acceptance criteria');
}

console.log('verify:agent-context OK');
