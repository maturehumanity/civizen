#!/usr/bin/env node
/**
 * Runtime gate: Phase 4A wellbeing aggregate participation walk @390px.
 *
 * Usage: node scripts/verify-wellbeing-aggregate-privacy.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { resetOwnHappinessRecords } from './verify-happiness-member-reset.mjs';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const VIEWPORT = { width: 390, height: 844 };

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

function assertNoProhibitedCopy(body, where) {
  if (/happiness score|organization happiness score|community happiness score|completely anonymous|low morale employees/i.test(body)) {
    throw new Error(`Prohibited copy on ${where}:\n${body.slice(0, 900)}`);
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

  await page.goto(`${baseUrl}/happiness/privacy`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('Privacy-protected group insights', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  const privacyBody = await page.locator('body').innerText();
  if (!/individual Happiness & Fulfillment information remains private/i.test(privacyBody)) {
    throw new Error('Privacy page missing individual-remains-private copy');
  }
  if (!/Optional sharing/i.test(privacyBody)) {
    throw new Error('Optional sharing control missing; aggregate participation must stay separate');
  }
  assertNoProhibitedCopy(privacyBody, 'happiness privacy');

  const aggregateSwitch = page.getByRole('switch', { name: 'Privacy-protected group insights' });
  await aggregateSwitch.waitFor({ state: 'visible', timeout: 5000 });
  const optionalSwitch = page.getByRole('switch', { name: 'Optional sharing' });
  const optionalBefore = await optionalSwitch.isChecked();
  if (await aggregateSwitch.isChecked()) await aggregateSwitch.click();
  await aggregateSwitch.click();
  await page.waitForTimeout(1200);
  if (!(await aggregateSwitch.isChecked())) throw new Error('Failed to enable aggregate participation');
  await aggregateSwitch.click();
  await page.waitForTimeout(1200);
  if (await aggregateSwitch.isChecked()) throw new Error('Failed to disable aggregate participation');
  if ((await optionalSwitch.isChecked()) !== optionalBefore) {
    throw new Error('Toggling aggregate participation changed optional sharing');
  }

  await page.goto(`${baseUrl}/happiness/privacy`, { waitUntil: 'networkidle', timeout: 30000 });
  const after = await page.locator('body').innerText();
  if (!/Optional sharing/i.test(after) || !/Privacy-protected group insights/i.test(after)) {
    throw new Error('Privacy controls missing after reload');
  }

  await page.goto(`${baseUrl}/happiness/work?tab=fit`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const work = await page.locator('body').innerText().catch(() => '');
  if (/privacy-protected group insights/i.test(work) && /employer can see/i.test(work)) {
    throw new Error('Work Fit must not present aggregate participation as employer sharing');
  }

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  const profileText = await page.locator('body').innerText();
  if (/privacy-protected group insights|happiness level is|struggling|flourishing/i.test(profileText) && /Happiness & Fulfillment/.test(profileText) === false) {
    // Profile may mention Happiness as a nav label; it must not publish the member's level or participation.
  }
  if (/Your current happiness level is|Privacy-protected group insights/i.test(profileText)) {
    throw new Error('Profile exposed Happiness level or aggregate participation');
  }
  assertNoProhibitedCopy(profileText, 'profile');

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
  const home = await page.locator('body').innerText();
  if (/Privacy-protected group insights|Your current happiness level is/i.test(home)) {
    throw new Error('Home exposed Happiness level or aggregate participation');
  }

  if (pageErrors.length) throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  console.log('verify:wellbeing-aggregate-privacy OK (390px member participation walk)');
} catch (error) {
  console.error(`verify:wellbeing-aggregate-privacy FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
