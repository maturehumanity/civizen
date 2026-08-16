#!/usr/bin/env node
/**
 * Runtime gate: Home Score card Happiness shortcut @390px.
 *
 * Compact icon only (no extra Happiness wording on the card), independent of
 * Civizen Score / tier, tappable to /happiness, desktop hover tooltip.
 *
 * Usage: node scripts/verify-home-happiness-shortcut.mjs [baseUrl]
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

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptTerms.click();
    await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }
}

async function signIn(page) {
  const { email, password } = loadCreds();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(page);
}

async function openHome(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent(page);
  const allTab = page.getByRole('option', { name: /^All$/i }).first();
  if (await allTab.count()) {
    await allTab.click().catch(() => {});
  }
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await signIn(page);
  await openHome(page);

  const heading = page.getByRole('heading', { name: /your civizen score/i });
  await heading.waitFor({ state: 'visible', timeout: 30000 });

  const shortcut = page.locator('[data-home-happiness-shortcut]');
  await shortcut.waitFor({ state: 'visible', timeout: 15000 });
  let hit = await shortcut.boundingBox();
  for (let i = 0; i < 30 && (!hit || hit.width < 27 || hit.height < 27); i += 1) {
    await page.waitForTimeout(50);
    hit = await shortcut.boundingBox();
  }
  if (!hit || hit.width < 27 || hit.height < 27) {
    throw new Error(`Happiness shortcut hit area too small: ${JSON.stringify(hit)}`);
  }

  const card = heading.locator('xpath=ancestor::div[contains(@class,"p-5")][1]');
  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error('Score card has no bounding box');
  if (cardBox.x + cardBox.width > 390 + 2) {
    throw new Error(`Score card overflows 390px viewport (right edge ${cardBox.x + cardBox.width})`);
  }

  const cardText = await card.innerText();
  if (/happiness & fulfillment|current happiness|wellbeing/i.test(cardText)) {
    throw new Error(`Score card shows extra Happiness wording:\n${cardText}`);
  }
  if (/happiness score/i.test(cardText)) {
    throw new Error('Score card shows a Happiness score');
  }

  const shortcutLabel = (await shortcut.getAttribute('aria-label')) ?? '';
  if (!/Open Happiness & Fulfillment/i.test(shortcutLabel)) {
    throw new Error(`Missing accessible name on Happiness shortcut: ${shortcutLabel}`);
  }
  if (!/Current level:|not established yet/i.test(shortcutLabel)) {
    throw new Error(`Accessible name does not describe Happiness state: ${shortcutLabel}`);
  }

  const shortcutText = await shortcut.innerText();
  if (/\d/.test(shortcutText)) {
    throw new Error(`Happiness shortcut visible text includes a number: "${shortcutText}"`);
  }

  const tier = card.getByText(/^(explorer|builder|contributor|catalyst|steward)$/i);
  if (await tier.isVisible().catch(() => false)) {
    const tierBox = await tier.boundingBox();
    if (tierBox) {
      if (hit.x + 4 < tierBox.x + tierBox.width) {
        throw new Error('Happiness icon appears to prefix or sit inside the Score tier label');
      }
      const gap = hit.x - (tierBox.x + tierBox.width);
      if (gap > 14) {
        throw new Error(`Happiness icon is too far from the Score tier (${Math.round(gap)}px)`);
      }
      const iconMid = hit.y + hit.height / 2;
      const tierMid = tierBox.y + tierBox.height / 2;
      if (Math.abs(iconMid - tierMid) > 22) {
        throw new Error('Happiness icon is not on the same row as the Score tier');
      }
    }
  }

  await shortcut.click();
  await page.waitForURL((url) => url.pathname.startsWith('/happiness'), { timeout: 15000 });
  if (pageErrors.length) {
    throw new Error(`Home Happiness shortcut caused page errors: ${pageErrors.join('; ')}`);
  }

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await signIn(desktop);
  await openHome(desktop);
  const desktopShortcut = desktop.locator('[data-home-happiness-shortcut]');
  await desktopShortcut.waitFor({ state: 'visible', timeout: 20000 });
  await desktopShortcut.hover();
  const tooltip = desktop.locator('[data-home-happiness-tooltip]');
  await tooltip.waitFor({ state: 'visible', timeout: 5000 });
  const tooltipText = await tooltip.innerText();
  if (!/Happiness & Fulfillment/i.test(tooltipText)) {
    throw new Error(`Desktop tooltip missing title: ${tooltipText}`);
  }
  if (/Current level:|Complete a review/i.test(tooltipText)) {
    throw new Error(`Desktop tooltip is too verbose: ${tooltipText}`);
  }
  if (!/Not assessed yet|Struggling|Unsettled|Balanced|Flourishing|Thriving/i.test(tooltipText)) {
    throw new Error(`Desktop tooltip missing compact level copy: ${tooltipText}`);
  }
  const tipBox = await tooltip.boundingBox();
  if (!tipBox) throw new Error('Desktop tooltip has no bounding box');
  if (tipBox.height > 52) {
    throw new Error(`Desktop tooltip is too tall (${Math.round(tipBox.height)}px)`);
  }
  await desktop.close();

  console.log('verify:home-happiness-shortcut OK (390px Home icon + desktop tooltip)');
} catch (error) {
  console.error(`verify:home-happiness-shortcut FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
