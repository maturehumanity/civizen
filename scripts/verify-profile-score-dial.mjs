#!/usr/bin/env node
/**
 * Runtime gate: /profile Score dial must render after loading.
 *
 * Process root cause this blocks (2026-08-13):
 * Score-ring geometry was extracted to civizen-score-dial-geometry.ts, but
 * Profile.tsx still referenced CONTENT_RADIUS after that import was removed.
 * page-smoke / verify:post-dev unmounted while Profile was still on Loading,
 * so the ReferenceError never ran. Live /profile crashed with
 * "CONTENT_RADIUS is not defined".
 *
 * Usage: node scripts/verify-profile-score-dial.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

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
  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent();

  const startup = page.getByText(/Civizen hit a startup issue/i);
  if (await startup.isVisible().catch(() => false)) {
    const detail = await page.locator('body').innerText();
    throw new Error(`Profile showed startup recovery UI:\n${detail.slice(0, 800)}`);
  }

  const dial = page.getByRole('group', { name: 'Score categories' });
  await dial.waitFor({ state: 'visible', timeout: 30000 });

  for (const name of ['Learning', 'Skills', 'Performance', 'Contributions', 'Experience']) {
    const button = dial.getByRole('button', { name: new RegExp(`^${name},`) });
    await button.waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.getByText('Civizen Score').first().waitFor({ state: 'visible', timeout: 5000 });

  const body = await page.locator('body').innerText();
  if (/CONTENT_RADIUS is not defined/i.test(body)) {
    throw new Error('Profile body still contains CONTENT_RADIUS is not defined');
  }

  const ringLabels = await page.evaluate(() =>
    [...document.querySelectorAll('[role="group"][aria-label="Score categories"] text')].map((node) =>
      (node.textContent || '').trim(),
    ),
  );
  if (ringLabels.some((label) => /^\d+\.\d+%$/.test(label))) {
    throw new Error(`Center score showed decimals with % (${ringLabels.filter((label) => /^\d+\.\d+%$/.test(label)).join(', ')})`);
  }

  const learning = dial.getByRole('button', { name: /^Learning,/ });
  await learning.click();
  const pressed = await learning.getAttribute('aria-pressed');
  if (pressed !== 'true') {
    throw new Error(`Learning category click did not set aria-pressed (got=${pressed})`);
  }

  if (pageErrors.length) {
    throw new Error(`Profile pageerror: ${pageErrors.join(' | ')}`);
  }

  console.log('PASS: Profile Score dial rendered @390px');
} finally {
  await browser.close();
}
