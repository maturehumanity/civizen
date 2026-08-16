#!/usr/bin/env node
/**
 * Runtime gate: Phase 4B Wellbeing Insights walks @390px.
 *
 * Usage: node scripts/verify-wellbeing-insights.mjs [baseUrl]
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
  if (/happiness score|organization happiness score|community happiness score|league table|participants\b|member-\d|privateNote/i.test(body)) {
    throw new Error(`Prohibited copy on ${where}:\n${body.slice(0, 900)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  applySql('scripts/verify-wellbeing-insights-seed.sql');
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

  await page.goto(`${baseUrl}/wellbeing-insights`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent();
  await page.getByText('Wellbeing Insights', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  const insightsRoot = page.locator('[data-wellbeing-insights]');
  const orgBtn = page.getByRole('button', { name: 'Verify org insights' });
  try {
    await orgBtn.waitFor({ state: 'visible', timeout: 20000 });
    await orgBtn.click();
  } catch {
    throw new Error(`org scope control missing:\n${await insightsRoot.innerText()}`);
  }
  await page.getByText('Going well', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('How this works').click();
  const orgBody = await page.locator('[data-wellbeing-insights]').innerText();
  if (!/Individual Happiness & Fulfillment records remain private/i.test(orgBody)) {
    throw new Error('Missing privacy explanation');
  }
  if (!/Going well/i.test(orgBody) || !/Needs attention/i.test(orgBody)) {
    throw new Error('Overview missing going well / needs attention');
  }
  assertSafe(orgBody, 'org overview');
  await page.getByText('Time & Life Balance', { exact: true }).click();
  await page.locator('[data-wellbeing-domain]').waitFor({ state: 'visible', timeout: 10000 });
  const domain = await page.locator('[data-wellbeing-domain]').innerText();
  if (!/Needs attention|Declining|Improving|Stable/i.test(domain)) throw new Error('Domain missing condition/trend');
  if (!/do not establish causation/i.test(domain)) throw new Error('Domain missing non-causal caveat');

  await page.getByRole('tab', { name: 'Patterns' }).click();
  await page.getByText(/recurring pattern across several qualifying periods/i).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(/recurring pattern across several qualifying periods/i).first().click();
  const candidate = await page.locator('[data-wellbeing-candidate]').innerText();
  if (/auto-published/i.test(candidate)) throw new Error('Candidate implied auto-publication');
  if (!/Nothing is published automatically/i.test(candidate)) throw new Error('Draft-only copy missing');
  assertSafe(candidate, 'candidate');

  await page.getByRole('tab', { name: 'Action' }).click();
  await page.getByText(/not proof that the action caused/i).waitFor({ state: 'visible', timeout: 15000 });
  const action = await page.locator('[data-wellbeing-insights]').innerText();
  if (!/not proof that the action caused/i.test(action)) throw new Error('Helpfulness caveat missing');
  if (!/Local Transit Access Challenge/i.test(action)) throw new Error('Existing effort missing');
  await page.getByRole('button', { name: 'Investigate further' }).click();
  await page.getByRole('button', { name: 'Explore as Community Challenge' }).click();
  await page.waitForURL((url) => url.pathname.includes('/contribute/challenges/new'), { timeout: 20000 });
  await page.locator('#ch-title').waitFor({ state: 'visible', timeout: 20000 });
  const title = await page.locator('#ch-title').inputValue();
  const problem = await page.locator('#ch-problem').inputValue();
  if (!/Time Life Balance|Time & Life Balance/i.test(title)) throw new Error(`Challenge title not prefilled: ${title}`);
  if (/member-|profile_id|privateNote/i.test(`${title}\n${problem}`)) throw new Error('Challenge handoff leaked private material');
  const challengeBody = await page.locator('body').innerText();
  if (/Publish now|auto-published/i.test(challengeBody) && /published automatically/i.test(challengeBody) === false) {
    // draft form is enough; do not submit
  }

  await page.goto(`${baseUrl}/wellbeing-insights`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('button', { name: 'Verify community insights' }).click();
  await page.getByText('Environment & Community', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Environment & Community', { exact: true }).click();
  const communityDomain = await page.locator('[data-wellbeing-domain]').innerText();
  if (!/community or system condition|Transportation/i.test(communityDomain)) {
    throw new Error('Community domain missing system-factor wording');
  }
  if (/Management is responsible|Employees are suffering/i.test(communityDomain)) {
    throw new Error('Community copy overclaimed causation');
  }
  await page.getByRole('tab', { name: 'Patterns' }).click();
  await page.getByText(/Recurring qualifying evidence is still needed/i).click();
  await page.getByRole('tab', { name: 'Action' }).click();
  await page.getByText(/Investigate further/i).waitFor({ state: 'visible', timeout: 10000 });
  const communityAction = await page.locator('[data-wellbeing-insights]').innerText();
  if (!/Local Transit Access Challenge/i.test(communityAction)) {
    throw new Error(`Community action missing related transit challenge:\n${communityAction}`);
  }
  assertSafe(await page.locator('[data-wellbeing-insights]').innerText(), 'community');

  await page.getByRole('button', { name: 'Verify suppressed insights' }).click();
  await page.getByText('Not enough qualifying information yet').waitFor({ state: 'visible', timeout: 15000 });
  const suppressed = await page.locator('[data-wellbeing-insights]').innerText();
  if (/\b(3|5|12) members\b/i.test(suppressed) || /n\s*=\s*\d+/i.test(suppressed)) {
    throw new Error('Suppression revealed a low count');
  }
  const civi = await page.locator('[data-civi-insight-context]').innerText();
  if (!/unavailable|privacy requirements/i.test(civi)) throw new Error('Civi context did not stay suppressed');
  if (/member-|check-in note/i.test(civi)) throw new Error('Civi reconstructed private records');
  assertSafe(suppressed, 'suppressed');

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  const profileText = await page.locator('body').innerText();
  if (/Phase 4B org insights|Verify org insights|Time & Life Balance appears/i.test(profileText)) {
    throw new Error('Profile leaked wellbeing insights');
  }
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
  const home = await page.locator('body').innerText();
  if (/Phase 4B org insights|Verify org insights|recurring concern among participating members/i.test(home)) {
    throw new Error('Home leaked wellbeing insights');
  }
  await page.goto(`${baseUrl}/market?section=jobs`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  const jobs = await page.locator('body').innerText().catch(() => '');
  if (/wellbeing_insight_actions|participating members in this qualifying group/i.test(jobs)) {
    throw new Error('Jobs leaked wellbeing aggregate insights');
  }

  if (pageErrors.length) throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  console.log('verify:wellbeing-insights OK (390px organization, community, suppression walks)');
} catch (error) {
  console.error(`verify:wellbeing-insights FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  try {
    applySql('scripts/verify-wellbeing-insights-cleanup.sql');
  } catch (cleanupError) {
    console.error(`wellbeing-insights cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
    process.exitCode = 1;
  }
  await browser.close();
}
