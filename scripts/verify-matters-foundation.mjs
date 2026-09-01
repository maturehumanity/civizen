#!/usr/bin/env node
/**
 * Runtime gate: Contribute > Questions, Issues & Ideas paints at 390px and desktop.
 * Usage: node scripts/verify-matters-foundation.mjs [baseUrl]
 */
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matters-verify';
mkdirSync(outDir, { recursive: true });

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptTerms.click();
    await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }
}

async function login(page) {
  const { email, password } = loadCreds();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(page);
}

async function walk(page, suffix) {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/contribute`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent(page);
  await page.getByText('Questions, Issues & Ideas').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Suggest Improvements').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(/Opens a Suggestion addressed to Civizen|Suggest an improvement to Civizen itself/i).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: `${outDir}/contribute-hub-${suffix}.png`, fullPage: true });

  await page.getByText('Questions, Issues & Ideas').first().click();
  await page.waitForURL(/\/contribute\/matters/, { timeout: 15000 });
  await page.getByText('Needs your action').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByLabel('New Matter').waitFor({ state: 'visible', timeout: 10000 });
  await page
    .getByText(/Nothing needs your action right now|Could not load Matters/i)
    .or(page.locator('a[href^="/contribute/matters/"]'))
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });
  await page.screenshot({ path: `${outDir}/matters-list-${suffix}.png`, fullPage: true });

  await page.getByLabel('New Matter').click();
  await page.waitForURL(/\/contribute\/matters\/new/, { timeout: 15000 });
  await page.getByLabel('Title').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByLabel('Description').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByLabel('Intended party').waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: `${outDir}/matters-new-${suffix}.png`, fullPage: true });

  await page.goto(`${baseUrl}/contribute/improvements`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForURL(/\/contribute\/matters\/new\?intent=improvement/, { timeout: 15000 });
  await page.getByText(/This starts a Suggestion to Civizen/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: `${outDir}/improvements-shortcut-${suffix}.png`, fullPage: true });

  if (pageErrors.length) {
    throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(mobile);
  await walk(mobile, '390');
  await mobile.close();

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await login(desktop);
  await walk(desktop, '1280');
  await desktop.close();

  console.log(`verify:matters-foundation OK ${baseUrl} (screenshots in ${outDir})`);
} finally {
  await browser.close();
}
