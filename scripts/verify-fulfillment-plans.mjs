#!/usr/bin/env node
/**
 * Runtime gate: Happiness Phase 3 Fulfillment Plan connected member walk @390px.
 *
 * Usage: node scripts/verify-fulfillment-plans.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { resetOwnHappinessRecords } from './verify-happiness-member-reset.mjs';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const VIEWPORT = { width: 390, height: 844 };
const privateMarker = `acceptance-private-${Date.now()}`;

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

function assertNoProhibitedCopy(body, where) {
  if (/happiness score|mental health score|you are struggling|job fit score|fulfillment plan: \d+%|this plan improved your happiness/i.test(body)) {
    throw new Error(`Prohibited copy on ${where}:\n${body.slice(0, 900)}`);
  }
  if (/i know why you're unhappy|the solution is|you need to|diagnos(e|is) depression/i.test(body)) {
    throw new Error(`Diagnostic/authoritative copy on ${where}:\n${body.slice(0, 900)}`);
  }
}

function assertNoClip(box, label) {
  if (!box) throw new Error(`${label} is not visible`);
  if (box.x < -2 || box.x + box.width > VIEWPORT.width + 2) {
    throw new Error(`${label} clips horizontally at 390px (x=${box.x}, w=${box.width})`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });
const pageErrors = [];
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
});

try {
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

  await resetOwnHappinessRecords(page, baseUrl);
  await page.goto(`${baseUrl}/happiness`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent();
  await page.getByRole('heading', { name: 'Happiness & Fulfillment' }).waitFor({ state: 'visible', timeout: 20000 });
  assertNoClip(await page.getByRole('heading', { name: 'Happiness & Fulfillment' }).boundingBox(), 'Happiness title');
  await page.locator('[data-happiness-private-hint]').first().waitFor({ state: 'visible', timeout: 5000 });
  for (const name of ['Overview', 'Life areas', 'Check-ins', 'Trends', 'Improve']) {
    assertNoClip(await page.getByRole('tab', { name, exact: true }).boundingBox(), `${name} tab`);
  }

  await page.getByRole('tab', { name: 'Life areas', exact: true }).click();
  const improveArea = page.getByRole('link', { name: 'Improve this area' }).first();
  if (await improveArea.isVisible().catch(() => false)) {
    await improveArea.click();
  } else {
    await page.goto(`${baseUrl}/happiness/improve?domain=time_life_balance`, { waitUntil: 'networkidle', timeout: 30000 });
  }
  await page.getByText(/Improving /i).first().waitFor({ state: 'visible', timeout: 10000 });
  if (await page.getByText('Which area do you want to improve?').isVisible().catch(() => false)) {
    throw new Error('Known domain still showed the full area picker');
  }
  await page.getByText('What would better look like?').waitFor({ state: 'visible', timeout: 5000 });

  if (!(await page.getByText('Improving Time & Life Balance').isVisible().catch(() => false))) {
    await page.goto(`${baseUrl}/happiness/improve?domain=time_life_balance`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByText('Improving Time & Life Balance').waitFor({ state: 'visible', timeout: 10000 });
  }
  await page.getByRole('button', { name: /^Time$/i }).click();
  await page.getByRole('button', { name: /^Commute$/i }).click();
  await page.getByPlaceholder(/two evenings each week/i).fill(`Fewer drained evenings after a long commute. ${privateMarker}`);
  await page.getByText(/This may be partly a system or community issue/i).first().waitFor({ state: 'visible', timeout: 8000 });
  await page.getByText(/Nothing is published automatically|not published/i).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Not relevant' }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Not now' }).first().waitFor({ state: 'visible', timeout: 2000 });
  await page.getByRole('button', { name: 'Tried before' }).first().waitFor({ state: 'visible', timeout: 2000 });
  await page.getByRole('button', { name: 'Save for later' }).first().waitFor({ state: 'visible', timeout: 2000 });
  const tryCount = async () => page.getByRole('button', { name: /I'll try this/i }).count();
  const before = await tryCount();
  await page.getByRole('button', { name: 'Not relevant' }).first().click();
  await page.getByText('Noted.').first().waitFor({ state: 'visible', timeout: 8000 });
  if ((await tryCount()) >= before) throw new Error('Not relevant did not hide the recommendation');
  if ((await tryCount()) > 1) {
    await page.getByRole('button', { name: 'Save for later' }).first().click();
    await page.getByText('Noted.').first().waitFor({ state: 'visible', timeout: 8000 });
  }
  await page.getByRole('button', { name: /I'll try this/i }).first().click();
  await page.waitForURL(/\/happiness\/improve\?plan=/, { timeout: 20000 });
  await page.getByText('What I want to improve').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(/You said/i).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/One possibility to explore/i).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Why am I seeing this?' }).first().click();
  await page.getByRole('button', { name: /^Start$/i }).first().click();
  await page.getByRole('button', { name: /Mark complete/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /Mark complete/i }).first().click();
  await page.getByText('Did this help?').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /^A lot$/i }).click();
  await page.getByPlaceholder(/What changed/i).fill('Evenings felt a little less drained.');
  await page.getByRole('button', { name: /^Save$/i }).click();
  await page.getByText(/Seeing improvement|Saved\. Thank you/i).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(/This may be easier to work through with another person|A friend or family member/i).first().waitFor({ state: 'visible', timeout: 8000 });
  await page.getByText(/Nothing is published automatically|not published/i).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Governance Solutions').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Ask Civi about this plan').waitFor({ state: 'visible', timeout: 5000 });
  const memberBrief = await page.locator('[data-civi-plan-member]').innerText();
  if (!/What you said|What Civizen observed|Suggestions \(not facts\)/i.test(memberBrief)) {
    throw new Error('Civi brief missing grounded sections');
  }
  if (/Do not diagnose|Do not invent causes/i.test(memberBrief)) {
    throw new Error('Civi brief showed agent instructions to the member');
  }
  const agentBrief = (await page.locator('[data-civi-plan-brief]').textContent()) ?? '';
  if (!/Do not invent prior actions|Do not invent causes/i.test(agentBrief)) {
    throw new Error('Civi brief missing grounding safeguards');
  }
  assertNoProhibitedCopy(memberBrief, 'civi brief');
  await page.getByRole('button', { name: /^Pause$/i }).click();
  await page.getByText(/Pausing is not a failure/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.getByRole('button', { name: /^Pause$/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: /^Complete plan$/i }).click();
  await page.getByText(/not a score/i).waitFor({ state: 'visible', timeout: 10000 });

  await page.goto(`${baseUrl}/happiness/improve?domain=environment_community`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByRole('button', { name: /I'll try this/i }).first().click();
  await page.waitForURL(/\/happiness\/improve\?plan=/, { timeout: 20000 });
  await page.getByRole('button', { name: /Stop — this is no longer needed/i }).click();
  await page.getByText(/Stopping is not a failure/i).waitFor({ state: 'visible', timeout: 10000 });

  await page.goto(`${baseUrl}/happiness/improve?domain=meaning_purpose`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByRole('button', { name: /^Purpose$/i }).click();
  await page.getByRole('button', { name: /Lack of direction|Lack of meaning/i }).first().click();
  await page.getByPlaceholder(/two evenings each week/i).fill('I want work and contribution to feel more meaningful.');
  await page.getByText(/Join one meaningful activity through Contribute/i).waitFor({ state: 'visible', timeout: 8000 });
  const contributeCard = page.locator('.rounded-2xl').filter({ hasText: 'Join one meaningful activity through Contribute' });
  if (await page.getByRole('button', { name: 'Not now' }).count() > 1) {
    await page.getByRole('button', { name: 'Not now' }).nth(1).click();
    await page.getByText('Noted.').first().waitFor({ state: 'visible', timeout: 8000 });
  }
  if (await page.getByRole('button', { name: 'Tried before' }).count() > 0) {
    const other = page.locator('.rounded-2xl').filter({ hasText: /Study|Try this kind of work/i }).first();
    if (await other.getByRole('button', { name: 'Tried before' }).count()) {
      await other.getByRole('button', { name: 'Tried before' }).click();
      await page.getByText('Noted.').first().waitFor({ state: 'visible', timeout: 8000 });
    }
  }
  await contributeCard.getByRole('button', { name: /I'll try this/i }).click();
  await page.waitForURL(/\/happiness\/improve\?plan=/, { timeout: 20000 });
  await page.getByRole('link', { name: /^Contribute$/i }).first().waitFor({ state: 'visible', timeout: 8000 });
  await page.getByRole('button', { name: /^Start$/i }).first().click();
  await page.getByRole('button', { name: /Mark complete/i }).first().click();
  await page.getByText('Did this help?').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /^A lot$/i }).click();
  await page.getByRole('button', { name: /^Save$/i }).click();
  await page.getByText(/Seeing improvement|Saved\. Thank you/i).first().waitFor({ state: 'visible', timeout: 15000 });

  await page.goto(`${baseUrl}/happiness/improve?domain=meaning_purpose`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByText(/This kind of action helped you before/i).first().waitFor({ state: 'visible', timeout: 10000 });
  const laterBody = await page.locator('body').innerText();
  if (/this will work for you/i.test(laterBody)) throw new Error('Prior helpfulness used overconfident copy');

  await page.goto(`${baseUrl}/happiness/improve?domain=autonomy_freedom`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByRole('link', { name: /^Study$/i }).first().waitFor({ state: 'visible', timeout: 8000 });

  await page.goto(`${baseUrl}/happiness/improve?domain=work_fulfillment`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByRole('link', { name: /^Work Fulfillment$/i }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('link', { name: /Look for a job/i }).waitFor({ state: 'visible', timeout: 5000 });
  if (await page.getByText('What would better look like?').isVisible().catch(() => false)) {
    throw new Error('Work domain still showed a generic Fulfillment Plan wizard');
  }

  await page.goto(`${baseUrl}/happiness?section=improvement`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByText('Active').first().waitFor({ state: 'visible', timeout: 10000 });
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'improve tab');

  await page.goto(`${baseUrl}/happiness/privacy`, { waitUntil: 'networkidle', timeout: 20000 });
  const removePlan = page.getByRole('button', { name: 'Remove plan' }).first();
  if (await removePlan.isVisible().catch(() => false)) {
    page.once('dialog', (dialog) => dialog.accept());
    await removePlan.click();
  }

  await page.goto(`${baseUrl}/happiness/work`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.getByRole('heading', { name: /Work Fulfillment/i }).waitFor({ state: 'visible', timeout: 15000 });

  for (const path of ['/profile', '/search', '/market?section=jobs', '/contribute']) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
    const body = await page.locator('body').innerText();
    if (body.includes(privateMarker) || /Fewer drained evenings after a long commute/i.test(body)) {
      throw new Error(`Private Fulfillment Plan data leaked onto ${path}`);
    }
    assertNoProhibitedCopy(body, path);
  }

  if (pageErrors.length) {
    throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  }
  console.log('verify:fulfillment-plans OK (390px connected member walk)');
} catch (error) {
  console.error(`verify:fulfillment-plans FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
