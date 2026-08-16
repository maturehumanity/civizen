#!/usr/bin/env node
/**
 * Runtime gate: Work Fulfillment Phase 2 connected member walk @390px.
 *
 * Usage: node scripts/verify-work-fulfillment.mjs [baseUrl]
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
  if (/you are struggling|you are a thriving|true calling|you should quit|mental health score/i.test(body)) {
    throw new Error(`Prohibited copy on ${where}:\n${body.slice(0, 800)}`);
  }
  if (/\b\d{1,3}\s*\/\s*100\b/.test(body)) {
    throw new Error(`Numeric /100 scale on ${where}`);
  }
  if (/happiness score/i.test(body) && !/no numeric happiness score|not a happiness score/i.test(body)) {
    throw new Error(`Happiness score language on ${where}:\n${body.slice(0, 800)}`);
  }
  if (/job fit score|work fulfillment score/i.test(body) && !/there is no work fulfillment score/i.test(body)) {
    throw new Error(`Numeric Work/Job Fit score language on ${where}:\n${body.slice(0, 800)}`);
  }
}

const ASSESSMENT = [
  ['Do you generally enjoy the work you spend time doing?', 'Unsettled'],
  ['Does the work use abilities you value and perform well?', 'Flourishing'],
  ['Do you understand and value the result of the work?', 'Flourishing'],
  ['Do you have enough control over methods, priorities, decisions, and schedule?', 'Struggling'],
  ['Does the team, leadership, and setting fit you?', 'Balanced'],
  ['Is the workload sustainable — not constantly overwhelming or underusing you?', 'Balanced'],
  ['Does the work fit the rest of your life?', 'Balanced'],
  ['Does the work offer appropriate challenge and learning?', 'Balanced'],
  ['Do you feel your contribution is respected and treated fairly?', 'Balanced'],
  ['Does the work provide an acceptable level of sustainability and security for you?', 'Balanced'],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

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
  await page.getByRole('link', { name: 'Work Fulfillment' }).first().click();
  await page.waitForURL(/\/happiness\/work/, { timeout: 15000 });
  await page.getByRole('heading', { name: 'Work Fulfillment' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: /this is private to you/i }).waitFor({ state: 'visible', timeout: 5000 });

  const tabLabels = ['Overview', 'Current', 'Joy', 'Fit', 'Improve'];
  for (const label of tabLabels) {
    const tab = page.getByRole('tab', { name: label, exact: true });
    await tab.waitFor({ state: 'attached', timeout: 5000 });
    await tab.scrollIntoViewIfNeeded();
    const box = await tab.boundingBox();
    if (!box) throw new Error(`Work Fulfillment tab "${label}" has no bounding box at 390px`);
    if (box.x < -1 || box.x + box.width > 390 + 1) {
      throw new Error(`Work Fulfillment tab "${label}" is clipped at 390px (${JSON.stringify(box)})`);
    }
  }
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'work overview');

  await page.getByRole('tab', { name: 'Current', exact: true }).click();
  const employedTitle = `Facilitator ${Date.now()}`;
  const role = page.getByLabel('Role or title');
  await role.waitFor({ state: 'visible', timeout: 10000 });
  await role.click();
  await role.fill(employedTitle);
  await page.getByRole('button', { name: 'Save work context' }).click();
  await page.getByText(employedTitle).first().waitFor({ state: 'visible', timeout: 15000 });

  const volunteerTitle = `Neighborhood mentor ${Date.now()}`;
  await role.click();
  await role.fill(volunteerTitle);
  await page.getByRole('group', { name: 'Kind of work' }).getByRole('button', { name: 'Volunteer / contributor' }).click();
  const primaryToggle = page.getByRole('button', { name: 'This is my primary work right now' });
  if ((await primaryToggle.getAttribute('aria-pressed')) === 'true' || (await primaryToggle.getAttribute('data-state')) === 'on') {
    await primaryToggle.click();
  } else {
    const classes = (await primaryToggle.getAttribute('class')) ?? '';
    if (/bg-primary|border-primary/.test(classes)) await primaryToggle.click();
  }
  await page.getByRole('button', { name: 'Save work context' }).click();
  await page.getByText(volunteerTitle).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: `Make ${volunteerTitle} primary` }).click();
  await page.getByRole('button', { name: `Make ${volunteerTitle} primary` }).waitFor({ state: 'hidden', timeout: 15000 });
  await page.getByLabel('Role or title').waitFor({ state: 'visible', timeout: 20000 });
  await page.getByText(/action recorded|saved/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  for (const [prompt, level] of ASSESSMENT) {
    const group = page.getByRole('group', { name: prompt });
    await group.scrollIntoViewIfNeeded();
    await group.getByRole('button', { name: level, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Save assessment' }).click();
  await page.getByText(/review saved|saved/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

  await page.getByRole('tab', { name: 'Joy', exact: true }).click();

  async function recordTeachingJoy(activityText) {
    await page.getByRole('button', { name: 'Energizing', exact: true }).click();
    const doingField = page.getByLabel('What were you doing?');
    await doingField.waitFor({ state: 'visible', timeout: 8000 });
    await doingField.fill(activityText);
    const teaching = page.getByRole('button', { name: 'Teaching', exact: true });
    await teaching.click();
    const saveJoy = page.getByRole('button', { name: 'Save Work Joy' });
    await saveJoy.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === 'Save Work Joy');
      return Boolean(button && !button.disabled);
    }, null, { timeout: 15000 });
    await saveJoy.click();
    await page.getByText('Work Joy saved.').first().waitFor({ state: 'visible', timeout: 20000 });
    await saveJoy.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  await recordTeachingJoy('mentoring');
  await page.getByText('A few more Work Joy entries are needed before patterns appear.').waitFor({
    state: 'visible',
    timeout: 5000,
  });

  for (let index = 0; index < 4; index += 1) {
    await recordTeachingJoy(`mentoring ${index + 2}`);
  }
  await page.getByText(/your recent entries suggest teaching|you often report higher enjoyment when this involves teaching/i).waitFor({
    state: 'visible',
    timeout: 8000,
  });
  await page.getByText('These are patterns to consider, not a claim about what you are meant to do.').waitFor({
    state: 'visible',
    timeout: 5000,
  });

  await page.getByRole('tab', { name: 'Fit', exact: true }).click();
  await page.getByRole('button', { name: 'Learning', exact: true }).click();
  await page.getByRole('group', { name: 'Working with others' }).getByRole('button', { name: 'Mostly individual' }).click();
  await page.getByRole('group', { name: 'How you do the work' }).getByRole('button', { name: 'A lot' }).click();
  const lifestyle = page.getByLabel('Schedule or lifestyle notes (optional)');
  await lifestyle.fill('School pickup at 15:00');
  const approve = page.getByRole('button', { name: 'Use these preferences when looking at Opportunities' });
  const approveClass = (await approve.getAttribute('class')) ?? '';
  if (!/bg-primary/.test(approveClass)) await approve.click();
  await page.getByText(/opportunity fit uses only these approved preferences/i).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Open Skills and Contributions' }).waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('tab', { name: 'Improve', exact: true }).click();
  await page.getByText(/what may be affecting your work fulfillment/i).waitFor({ state: 'visible', timeout: 10000 });
  const improveBody = await page.locator('body').innerText();
  if (!/task mix|autonomy|workload|environment|purpose|occupation/i.test(improveBody)) {
    throw new Error('Improve did not distinguish work-fulfillment sources');
  }
  await page.getByRole('button', { name: 'Record this action' }).first().click();
  await page.getByText(/action recorded/i).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Planned').first().waitFor({ state: 'visible', timeout: 10000 });
  if (await page.getByText('Did this change improve your work experience?').isVisible().catch(() => false)) {
    throw new Error('Follow-up appeared before the action was completed');
  }
  await page.getByRole('button', { name: 'Start' }).first().click();
  await page.getByRole('button', { name: 'Mark complete' }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Mark complete' }).first().click();
  await page.getByText(/did this change improve your work experience/i).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'A little', exact: true }).click();
  await page.getByRole('button', { name: 'Enjoyable', exact: true }).click();
  await page.getByRole('button', { name: 'Save follow-up' }).click();
  await page.getByText(/recorded outcome|follow-up saved|saved\. thank you/i).first().waitFor({ state: 'visible', timeout: 15000 });

  await page.getByRole('link', { name: 'Try this kind of work' }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('link', { name: 'See related learning' }).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('link', { name: 'Look for a job' }).first().waitFor({ state: 'visible', timeout: 5000 });
  const jobs = await page.getByRole('link', { name: 'Look for a job' }).first().getAttribute('href');
  if (!jobs || !jobs.includes('section=jobs')) {
    throw new Error(`Employment path should be Marketplace Jobs, got ${jobs}`);
  }
  const contribute = page.getByRole('link', { name: 'Try this kind of work' }).first();
  const href = await contribute.getAttribute('href');
  if (!href || !href.startsWith('/contribute')) {
    throw new Error(`Contribute trial path was ${href}`);
  }
  const study = await page.getByRole('link', { name: 'See related learning' }).first().getAttribute('href');
  if (!study || !study.startsWith('/study')) {
    throw new Error(`Study path was ${study}`);
  }
  await page.getByText('Why it may fit').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Things to explore').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/skills and contributions/i).first().waitFor({ state: 'visible', timeout: 5000 });
  const alignment = await page.locator('body').innerText();
  if (!/Strong alignment|Some alignment|Worth exploring|Limited alignment/.test(alignment)) {
    throw new Error('Human-readable Opportunity/role alignment labels were missing');
  }
  if (/\b\d{1,3}%\s*fit\b/i.test(alignment)) {
    throw new Error('Numeric fit percent was shown');
  }

  await page.getByPlaceholder('Role or work type').fill('Learning Facilitator');
  await page.getByRole('button', { name: 'Save path' }).click();

  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.getByText(/going well|needs attention|current level|balanced|flourishing|unsettled|struggling/i).first().waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await page.getByText(/recorded outcome/i).first().waitFor({ state: 'visible', timeout: 8000 });
  assertNoProhibitedCopy(await page.locator('body').innerText(), 'work overview after walk');

  if (pageErrors.length) throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  console.log('verify:work-fulfillment OK (390px connected member walk)');
} catch (error) {
  console.error(`verify:work-fulfillment FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
