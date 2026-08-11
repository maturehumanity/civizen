#!/usr/bin/env node
/**
 * Runtime gate: Home empty post composer must accept a chrome click → focus → type.
 *
 * Process root cause this blocks (2026-08-03 / Testing v0.1.128 / 737086f):
 * An agent replaced a working <textarea> with floated contentEditable for wraparound
 * aesthetics and shipped after layout-looking checks only. Empty-field taps on
 * placeholder/padding/avatar no longer focused the editor. verify:post-dev did not
 * exercise click→focus→type, so the regression stayed live until reported.
 *
 * Usage: node scripts/verify-home-post-composer.mjs [baseUrl]
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
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent();

  // Ensure All tab (composer only shows there).
  const allTab = page.getByRole('option', { name: /^All$/i }).first();
  if (await allTab.count()) {
    await allTab.click().catch(() => {});
  }

  const chrome = page.locator('[data-home-post-composer]').first();
  await chrome.waitFor({ state: 'visible', timeout: 30000 });

  const editor = page.getByRole('textbox', {
    name: /Share an idea, update, or opportunity/i,
  });
  await editor.waitFor({ state: 'visible', timeout: 15000 });

  // Click chrome padding / placeholder region — not a direct editor.click().
  // That is the regression path from the wraparound contentEditable swap.
  const box = await chrome.boundingBox();
  if (!box) throw new Error('Home post composer chrome has no bounding box');
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.5);

  const focused = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active) return null;
    return {
      role: active.getAttribute('role'),
      label: active.getAttribute('aria-label') || '',
      contentEditable: active.getAttribute('contenteditable'),
    };
  });

  if (
    !focused ||
    focused.role !== 'textbox' ||
    !/Share an idea, update, or opportunity/i.test(focused.label) ||
    focused.contentEditable !== 'true'
  ) {
    throw new Error(
      `Empty Home composer chrome click did not focus the editor (active=${JSON.stringify(focused)})`,
    );
  }

  const probe = `composer-verify-${Date.now()}`;
  await page.keyboard.type(probe, { delay: 5 });

  const text = await editor.innerText();
  if (!text.includes(probe)) {
    throw new Error(`Home composer accepted focus but did not receive typed text (got=${JSON.stringify(text)})`);
  }

  // Discard so we do not leave a draft behind for the shared test member.
  const cancel = page.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click();
  } else {
    await page.evaluate(() => {
      const el = document.querySelector('[data-home-post-composer] [role="textbox"]');
      if (el instanceof HTMLElement) {
        el.textContent = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  console.log('PASS: Home post composer click → focus → type @390px');
} finally {
  await browser.close();
}
