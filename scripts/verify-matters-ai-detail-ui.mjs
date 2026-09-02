#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const bundlePath = process.argv[3] ?? '/tmp/civizen-matters-ai-fixtures.json';
const outDir = '/tmp/civizen-matters-ai-detail';

const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const { fixtures, memberEmail, memberPassword, citizenEmail, citizenPassword } = bundle;

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  try {
    await acceptTerms.waitFor({ state: 'visible', timeout: 8000 });
    await acceptTerms.click();
  } catch {
    // already accepted
  }
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(page);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) {
    const height = width === 390 ? 844 : 900;
    const memberContext = await browser.newContext({ viewport: { width, height } });
    const citizenContext = await browser.newContext({ viewport: { width, height } });
    const memberPage = await memberContext.newPage();
    const citizenPage = await citizenContext.newPage();
    await login(memberPage, memberEmail, memberPassword);
    await login(citizenPage, citizenEmail, citizenPassword);

    for (const fixture of fixtures) {
      const page = fixture.as === 'member' ? memberPage : citizenPage;
      const url = fixture.section
        ? `${baseUrl}/contribute/matters/${fixture.id}?section=${fixture.section}`
        : `${baseUrl}/contribute/matters/${fixture.id}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await acceptTermsIfPresent(page);
      await page.getByText(fixture.title).first().waitFor({ state: 'visible', timeout: 20000 });
      for (const pattern of fixture.expect) {
        await page.getByText(new RegExp(pattern, 'i')).first().waitFor({ state: 'visible', timeout: 15000 });
      }
      if (fixture.forbid && (await page.getByText(new RegExp(fixture.forbid, 'i')).count()) > 0) {
        throw new Error(`${fixture.slug} showed forbidden copy`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      if (overflow && width === 390) {
        throw new Error(`${fixture.slug} horizontal overflow at ${width}px`);
      }
      await page.screenshot({ path: `${outDir}/${fixture.slug}-${width}.png`, fullPage: true });
    }
    await memberPage.close();
    await citizenPage.close();
    await memberContext.close();
    await citizenContext.close();
  }
} finally {
  await browser.close();
}

console.log(`verify:matters-ai-detail UI OK ${baseUrl} (screenshots in ${outDir})`);
