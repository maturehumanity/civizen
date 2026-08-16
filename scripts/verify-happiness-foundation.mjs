#!/usr/bin/env node
/**
 * Runtime gate: Happiness & Fulfillment connected Phase 1 member walk @390px.
 *
 * Covers check-in + cause, full ten-domain review, attention → improve,
 * record action, Did this help?, trends, privacy, Work Fulfillment,
 * and no numeric Happiness Score / identity phrasing.
 *
 * Usage: node scripts/verify-happiness-foundation.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { resetOwnHappinessRecords } from './verify-happiness-member-reset.mjs';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

function assertNoProhibitedCopy(body, where) {
  if (/happiness score|mental health score|you are struggling|you are a thriving|employee happiness ranking/i.test(body)) {
    throw new Error(`Prohibited score/identity language on ${where}:\n${body.slice(0, 800)}`);
  }
  if (/\b\d{1,3}\s*\/\s*100\b/.test(body) && /happiness/i.test(body)) {
    throw new Error(`Numeric /100 happiness scale on ${where}`);
  }
}

const MONTHLY_LEVELS = [
  ['Life Satisfaction', 'Flourishing'],
  ['Emotional Wellbeing', 'Flourishing'],
  ['Meaning & Purpose', 'Balanced'],
  ['Relationships & Belonging', 'Thriving'],
  ['Health & Vitality', 'Flourishing'],
  ['Autonomy & Freedom', 'Balanced'],
  ['Security & Stability', 'Balanced'],
  ['Time & Life Balance', 'Unsettled'],
  ['Environment & Community', 'Flourishing'],
  ['Work / Occupation Fulfillment', 'Struggling'],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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

  if (await page.getByText(/Civizen hit a startup issue/i).isVisible().catch(() => false)) {
    throw new Error('Happiness showed startup recovery UI');
  }

  await page.getByRole('heading', { name: 'Happiness & Fulfillment' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('link', { name: /this is private to you/i }).waitFor({ state: 'visible', timeout: 5000 });
  if (await page.getByRole('button', { name: /^Improve an area$/i }).count()) {
    throw new Error('Overview still shows Improve an area; that action belongs on the Improve tab');
  }
  if (await page.getByRole('link', { name: /^Privacy$/i }).count()) {
    throw new Error('Overview still shows a Privacy text link; the lock should open Privacy');
  }
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'overview');

  const tabLabels = ['Overview', 'Life areas', 'Check-ins', 'Trends', 'Improve'];
  for (const label of tabLabels) {
    const tab = page.getByRole('tab', { name: label, exact: true });
    await tab.waitFor({ state: 'attached', timeout: 5000 });
    await tab.scrollIntoViewIfNeeded();
    const box = await tab.boundingBox();
    if (!box) throw new Error(`Happiness tab "${label}" has no bounding box at 390px`);
    if (box.x < -1 || box.x + box.width > 390 + 1) {
      throw new Error(`Happiness tab "${label}" is clipped at 390px (${JSON.stringify(box)})`);
    }
    const clipped = await tab.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    if (clipped) throw new Error(`Happiness tab "${label}" text is truncated`);
  }
  if (await page.getByRole('tab', { name: 'Improvement', exact: true }).count()) {
    throw new Error('Happiness still shows an Improvement tab label at 390px');
  }

  const checkIn = page.getByRole('button', { name: /^Check in$/i });
  await checkIn.waitFor({ state: 'visible', timeout: 10000 });

  async function completeAdaptiveCheckIn({ feeling, area, polarity, tags, note }) {
    const start = page.getByRole('button', { name: /^Check in$/i });
    await start.waitFor({ state: 'visible', timeout: 10000 });
    await start.click();
    await page.waitForURL(/\/happiness\/check-in/, { timeout: 15000 });
    await page.getByText('How are you feeling today?').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByText("What's affecting this today?").waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: new RegExp(`^${feeling}$`, 'i') }).click();
    await page.getByRole('button', { name: new RegExp(`^${area}$`, 'i') }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.getByRole('button', { name: new RegExp(`^${polarity}$`, 'i') }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    for (const tag of tags) {
      const choice = page.getByRole('button', { name: new RegExp(`^${tag}$`, 'i') });
      await choice.scrollIntoViewIfNeeded();
      await choice.click();
    }
    await page.getByRole('button', { name: /^Next$/i }).click();
    if (note) {
      const field = page.getByLabel('Want to add anything?');
      await field.click();
      await field.fill(note);
    }
    await page.getByRole('button', { name: /Save check-in/i }).click();
    await page.waitForURL(/\/happiness\/?$/, { timeout: 20000 });
    await page.getByRole('heading', { name: 'Happiness & Fulfillment' }).waitFor({ state: 'visible', timeout: 20000 });
  }

  await completeAdaptiveCheckIn({
    feeling: 'Good',
    area: 'Work',
    polarity: 'Making things harder',
    tags: ['Tasks'],
    note: 'verify walk — work is affecting me',
  });
  await completeAdaptiveCheckIn({
    feeling: 'Okay',
    area: 'Work',
    polarity: 'Making things harder',
    tags: ['Tasks', 'Workload'],
    note: null,
  });
  await completeAdaptiveCheckIn({
    feeling: 'Difficult',
    area: 'Work',
    polarity: 'Making things harder',
    tags: ['Workload'],
    note: null,
  });

  const checkInOverview = await page.locator('body').innerText();
  if (!/What's been affecting this/i.test(checkInOverview)) {
    throw new Error('Overview did not explain check-in patterns after several check-ins');
  }
  if (!/Work/i.test(checkInOverview) || !/Tasks/i.test(checkInOverview) || !/making things harder/i.test(checkInOverview)) {
    throw new Error(`Overview still looks like a shallow area label instead of a specific cause:\n${checkInOverview.slice(0, 1200)}`);
  }
  if (/Balanced \+ Work/i.test(checkInOverview)) {
    throw new Error('Overview collapsed to Balanced + Work');
  }
  assertNoProhibitedCopy(checkInOverview, 'overview after check-ins');

  await page.getByRole('button', { name: /Review my wellbeing/i }).click();
  await page.waitForURL(/\/happiness\/review/, { timeout: 15000 });
  await page.getByRole('button', { name: /Full review/i }).click();
  for (const [domain, level] of MONTHLY_LEVELS) {
    const label = page.getByText(domain, { exact: true });
    await label.scrollIntoViewIfNeeded();
    await label.locator('xpath=..').getByRole('button', { name: level, exact: true }).click();
  }
  await page.getByText('I want help improving something.').scrollIntoViewIfNeeded();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Save review/i }).click();
  await page.waitForURL(/\/happiness\/improve/, { timeout: 20000 });

  await page.getByText('Which area do you want to improve?').waitFor({ state: 'visible', timeout: 10000 });
  const workDomain = page.getByRole('button', { name: /Work \/ Occupation Fulfillment/i });
  await workDomain.click();
  await page.getByRole('link', { name: /^Work Fulfillment$/i }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('link', { name: /Look for a job/i }).waitFor({ state: 'visible', timeout: 5000 });
  const jobsHref = await page.getByRole('link', { name: /Look for a job/i }).getAttribute('href');
  if (!jobsHref || !jobsHref.includes('section=jobs')) {
    throw new Error(`Work employment destination should be Marketplace Jobs, got ${jobsHref}`);
  }

  await page.getByRole('button', { name: /Time & Life Balance/i }).click();
  await page.getByText('What is affecting this?').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /^Time$/i }).click();
  await page.getByRole('button', { name: /^Overwork$/i }).click();
  await page.getByPlaceholder('Optional note').fill('too many draining evenings');
  await page.getByPlaceholder(/two evenings each week/i).fill('I want two evenings each week that are actually free.');
  await page.getByRole('button', { name: /I'll try this/i }).first().click();
  await page.waitForURL(/\/happiness\/improve\?plan=/, { timeout: 20000 });
  await page.getByRole('button', { name: /^Start$/i }).first().click();
  await page.getByRole('button', { name: /Mark complete/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /Mark complete/i }).first().click();
  await page.getByText('Did this help?').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /^A little$/i }).first().click();
  await page.getByRole('button', { name: /^Save$/i }).first().click();
  await page.getByText('Saved. Thank you.').waitFor({ state: 'visible', timeout: 15000 });

  await page.goto(`${baseUrl}/happiness?section=areas`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('tab', { name: /Life areas/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Work / Occupation Fulfillment', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  const areasBody = await page.locator('body').innerText();
  if (
    !/Work \/ Occupation Fulfillment[\s\S]{0,160}(Struggling|Unsettled|Balanced|Flourishing|Thriving)/.test(areasBody)
  ) {
    throw new Error(`Work Fulfillment domain should show a five-level state:\n${areasBody.slice(0, 900)}`);
  }
  await page.getByRole('link', { name: /^Work Fulfillment$/i }).first().waitFor({ state: 'visible', timeout: 5000 });

  await page.goto(`${baseUrl}/happiness`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('heading', { name: 'Happiness & Fulfillment' }).waitFor({ state: 'visible', timeout: 15000 });
  const overview = await page.locator('body').innerText();
  if (!/Your current happiness level is /.test(overview)) {
    throw new Error(`Expected five-level state on overview:\n${overview.slice(0, 800)}`);
  }
  if (!/Needs attention/i.test(overview) || !/Going well/i.test(overview)) {
    throw new Error(`Expected Going well / Needs attention on overview:\n${overview.slice(0, 800)}`);
  }
  assertNoProhibitedCopy(overview, 'overview after review');

  await page.goto(`${baseUrl}/happiness?section=trends`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByText(/working guide, not a diagnosis/i).waitFor({ state: 'visible', timeout: 10000 });
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'trends');

  await page.goto(`${baseUrl}/happiness?section=improvement`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByText(/A little/i).first().waitFor({ state: 'visible', timeout: 15000 });

  await page.goto(`${baseUrl}/happiness/work`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('heading', { name: 'Work Fulfillment' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('tab', { name: 'Overview', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'work fulfillment');

  await page.goto(`${baseUrl}/happiness`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('heading', { name: 'Happiness & Fulfillment' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('link', { name: /this is private to you/i }).click();
  await page.waitForURL(/\/happiness\/privacy/, { timeout: 15000 });
  await page.getByText(/private by default/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Civizen Score').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Optional sharing').waitFor({ state: 'visible', timeout: 5000 });

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'profile');

  if (pageErrors.length) {
    throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  }

  console.log('verify:happiness-foundation OK (390px connected member walk)');
} catch (error) {
  console.error(`verify:happiness-foundation FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
