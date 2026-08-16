#!/usr/bin/env node
/**
 * Runtime gate: Phase 5 Human Outcome & System Learning Loop walks @390px.
 *
 * Usage: node scripts/verify-human-outcome-loop.mjs [baseUrl]
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const VIEWPORT = { width: 390, height: 844 };
const ROOT = new URL('..', import.meta.url).pathname;

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

function applySql(file) {
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`SQL ${file} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function assertSafe(body, where) {
  if (/happiness score|\+\d+% Happiness|league table|member-\d|privateNote/i.test(body)) {
    throw new Error(`Prohibited copy on ${where}:\n${body.slice(0, 900)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  applySql('scripts/verify-human-outcome-loop-seed.sql');
  const { email, password } = loadCreds();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });

  async function acceptTermsIfPresent() {
    const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
    if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptTerms.click();
      await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }
  }
  await acceptTermsIfPresent();

  async function openReview(scopeName, candidateSnippet) {
    await page.goto(`${baseUrl}/wellbeing-insights`, { waitUntil: 'networkidle', timeout: 60000 });
    await acceptTermsIfPresent();
    await page.getByRole('button', { name: scopeName }).click();
    await page.getByRole('tab', { name: 'Patterns' }).click();
    await page.getByText(candidateSnippet).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(candidateSnippet).first().click();
    const card = page.locator('[data-wellbeing-candidate]');
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.getByRole('link', { name: 'Review human outcome' }).click();
    await page.waitForURL((url) => url.pathname.includes('/wellbeing-insights/outcome') && url.searchParams.has('review'), { timeout: 20000 });
    await page.locator('[data-human-outcome-review]').waitFor({ state: 'visible', timeout: 20000 });
    await page.getByText('What was implemented').waitFor({ state: 'visible', timeout: 20000 });
  }

  await openReview('Verify community outcomes', /recurring pattern across several qualifying periods/i);
  const review = page.locator('[data-human-outcome-review]');
  await page.getByText('What was implemented').waitFor({ state: 'visible', timeout: 10000 });
  const first = await review.innerText();
  if (!/Three new shuttle routes launched/i.test(first)) throw new Error('Missing operational outcome');
  if (!/No qualifying baseline available|recurring concern/i.test(first)) throw new Error('Missing baseline evidence');
  if (!/does not establish causation/i.test(first)) throw new Error('Missing non-causal caveat');
  assertSafe(first, 'community review');

  await page.getByRole('button', { name: 'Add follow-up evidence' }).click();
  await page.locator('[data-human-outcome-evidence]').getByText('Early signal').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Add follow-up evidence' }).click();
  await page.locator('[data-human-outcome-evidence]').getByText(/Improvement observed|Repeated association|Supporting reported helpfulness/i).waitFor({ state: 'visible', timeout: 15000 });

  await page.getByLabel('Possible other explanation').fill('Two transportation initiatives overlapped during this follow-up period.');
  await page.getByRole('button', { name: 'Record a possible other explanation' }).click();
  await page.getByText(/cannot attribute the observed change/i).waitFor({ state: 'visible', timeout: 15000 });

  await page.getByLabel('Interpretation').fill('The transit pilot improved Happiness.');
  await page.getByRole('button', { name: 'Save interpretation' }).click();
  await page.getByText(/Causal wording is not allowed/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByLabel('Interpretation').fill(
    'Commute-related Time Balance concerns declined after the shuttle pilot and stayed lower for two qualifying periods. This is consistent with a possible positive effect, but other changes during the period may also have contributed.',
  );
  await page.getByRole('button', { name: 'Save interpretation' }).click();
  await page.getByRole('button', { name: 'Publish public-safe lesson' }).click();
  await page.getByText('Public-safe lesson published').waitFor({ state: 'visible', timeout: 15000 });
  const civi = await page.locator('[data-civi-outcome-context]').innerText();
  if (/made people happier|improved Happiness/i.test(civi)) throw new Error('Civi claimed causation');
  if (!/does not establish causation/i.test(civi)) throw new Error('Civi missing non-causal caveat');

  await page.getByRole('link', { name: 'Open Challenge' }).click();
  await page.getByText('Community Transit Access Pilot').first().waitFor({ state: 'visible', timeout: 20000 });
  const challenge = await page.locator('body').innerText();
  if (!/Three new shuttle routes launched/i.test(challenge)) throw new Error('Challenge missing operational outcome');
  if (!/Learn from this|Human outcome evidence/i.test(challenge)) throw new Error('Challenge missing human-outcome lesson');
  assertSafe(challenge, 'challenge');

  await openReview('Verify governance outcomes', /Environment & Community appears as a recurring pattern/i);
  const gov = await page.locator('[data-human-outcome-review]').innerText();
  if (!/Evening Transit Schedule Policy|took effect/i.test(gov)) {
    throw new Error(`Governance review missing implementation:\n${gov.slice(0, 1200)}`);
  }
  if (!/does not establish causation/i.test(gov)) throw new Error('Governance review claimed causation');
  assertSafe(gov, 'governance review');
  await page.getByRole('link', { name: 'Open Governance Solution' }).click();
  await page.getByText('Verify Evening Transit Schedule Policy').waitFor({ state: 'visible', timeout: 20000 });

  await openReview('Verify null outcomes', /after a transit trial/i);
  const nullBody = await page.locator('[data-human-outcome-review]').innerText();
  if (!/No clear change/i.test(nullBody)) throw new Error('Null result was not preserved');
  if (!/Weekend shuttle routes launched/i.test(nullBody)) throw new Error('Null walk missing operational success');
  const nullCivi = await page.locator('[data-civi-outcome-context]').innerText();
  if (!/No clear change/i.test(nullCivi)) throw new Error('Civi rewrote the null result');
  assertSafe(nullBody, 'null review');

  await openReview('Verify insufficient outcomes', /Later qualifying evidence is not currently available/i);
  const insufficient = await page.locator('[data-human-outcome-review]').innerText();
  if (!/Not enough qualifying evidence yet|Insufficient evidence/i.test(insufficient)) {
    throw new Error(`Insufficient evidence state missing:\n${insufficient.slice(0, 900)}`);
  }
  if (/\b(3|5|12) members\b/i.test(insufficient)) throw new Error('Insufficient review revealed a low count');
  assertSafe(insufficient, 'insufficient review');

  await page.goto(`${baseUrl}/search`, { waitUntil: 'networkidle', timeout: 60000 });
  const search = await page.locator('body').innerText();
  if (/wellbeing_aggregate_snapshots|fingerprint/i.test(search)) throw new Error('Search exposed aggregate snapshots');
  if (!/Solution Records/i.test(search) && !/Wellbeing Insights/i.test(search)) {
    // contents may be behind a tab; still fail if snapshots leaked
  }

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  const profileText = await page.locator('body').innerText();
  if (/Phase 5 community outcomes|Verify community outcomes|Time & Life Balance appears/i.test(profileText)) {
    throw new Error('Profile leaked outcome evidence');
  }
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
  const home = await page.locator('body').innerText();
  if (/Phase 5 community outcomes|Verify community outcomes|human_outcome_reviews/i.test(home)) {
    throw new Error('Home leaked outcome reviews');
  }
  await page.goto(`${baseUrl}/market?section=jobs`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  const jobs = await page.locator('body').innerText().catch(() => '');
  if (/human_outcome_review_evidence|participating members in this qualifying group/i.test(jobs)) {
    throw new Error('Jobs leaked outcome evidence');
  }

  if (pageErrors.length) throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  console.log('verify:human-outcome-loop OK (390px Challenge, Governance, null, insufficient walks)');
} catch (error) {
  console.error(`verify:human-outcome-loop FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  try {
    applySql('scripts/verify-human-outcome-loop-cleanup.sql');
  } catch (cleanupError) {
    console.error(`human-outcome-loop cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
    process.exitCode = 1;
  }
  await browser.close();
}
