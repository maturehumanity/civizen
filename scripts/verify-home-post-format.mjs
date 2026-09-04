#!/usr/bin/env node
/**
 * Runtime gate: Home post formatting toolbar is usable at phone and desktop widths.
 * Usage: node scripts/verify-home-post-format.mjs [baseUrl]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) =>
    src.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'))?.[1]?.trim();
  const getLocal = (key) =>
    local.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
  const url = get(root, 'VITE_SUPABASE_URL');
  const anon = get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  const email = getLocal('TEST_USER_ROLE_MEMBER_EMAIL');
  const password = getLocal('TEST_USER_ROLE_MEMBER_PASSWORD');
  if (!url || !anon || !email || !password) {
    throw new Error('Missing env for verify:home-post-format');
  }
  return { url, anon, email, password };
}

async function deleteVerificationPosts({ url, anon, email, password }) {
  const client = createClient(url, anon);
  const { error: authErr } = await client.auth.signInWithPassword({ email, password });
  if (authErr) throw new Error(`cleanup auth failed: ${authErr.message}`);
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: profile, error: profileErr } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (profileErr || !profile?.id) throw new Error(`cleanup profile: ${profileErr?.message || 'missing'}`);
  const { data: rows, error } = await client
    .from('posts')
    .select('id, content')
    .eq('author_id', profile.id);
  if (error) throw new Error(`cleanup list: ${error.message}`);
  const ids = (rows || [])
    .filter((row) => /(?:^|\s)fmt-edit-\d+/.test(row.content || '') || String(row.content || '').includes('fmt-edit-'))
    .map((row) => row.id);
  if (!ids.length) return 0;
  const { error: deleteErr } = await client.from('posts').delete().in('id', ids);
  if (deleteErr) throw new Error(`cleanup delete: ${deleteErr.message}`);
  return ids.length;
}

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptTerms.click();
    await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }
}

async function openHomeComposer(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await acceptTermsIfPresent(page);
  const allTab = page.getByRole('option', { name: /^All$/i }).first();
  if (await allTab.count()) {
    await allTab.click().catch(() => {});
  }
  const editor = page.getByRole('textbox', {
    name: /Share an idea, update, or opportunity/i,
  });
  await editor.waitFor({ state: 'visible', timeout: 30000 });
  await editor.click();
  const toolbar = page.getByRole('toolbar', { name: /Text formatting/i });
  await toolbar.waitFor({ state: 'visible', timeout: 10000 });
  for (const name of ['Bold', 'Italic', 'Underline', 'Bulleted list', 'Numbered list', 'Line spacing']) {
    const button = page.getByRole('button', { name });
    if (!(await button.isVisible())) {
      throw new Error(`Missing formatting control: ${name}`);
    }
  }
  await page.getByRole('button', { name: 'Line spacing' }).click();
  for (const name of ['Tight', 'Default', 'Relaxed']) {
    const option = toolbar.getByRole('button', { name, exact: true });
    if (!(await option.isVisible())) {
      throw new Error(`Missing line spacing option: ${name}`);
    }
  }
  await page.getByRole('button', { name: 'Line spacing' }).click();
  if (await page.getByRole('button', { name: /^Font$/i }).count()) {
    throw new Error('Posts must not expose Agreement font controls');
  }
  return editor;
}

async function formatEditAndEditedWalk(page, editor) {
  const marker = `fmt-edit-${Date.now()}`;
  await editor.click();
  await page.keyboard.type(marker, { delay: 8 });
  await page.keyboard.press('ControlOrMeta+A');
  await page.getByRole('button', { name: 'Bold' }).click();
  await page.getByRole('button', { name: /^Post$/i }).click();

  const postCard = page.locator('[data-home-post-id]').filter({ hasText: marker }).first();
  await postCard.waitFor({ state: 'visible', timeout: 20000 });
  if (!(await postCard.locator('b, strong').count())) {
    throw new Error('supported bold formatting did not render on the posted card');
  }

  await postCard.getByTestId('home-post-overflow').click();
  const editItem = page.getByTestId('home-post-edit');
  await editItem.waitFor({ state: 'visible', timeout: 8000 });
  await editItem.click();
  await editItem.waitFor({ state: 'hidden', timeout: 8000 });
  const inline = postCard.locator('[data-home-post-inline-editor]');
  await inline.waitFor({ state: 'visible', timeout: 8000 });
  const toolbar = inline.locator('[data-post-format-toolbar]');
  await toolbar.waitFor({ state: 'visible', timeout: 8000 });
  const formatButtons = toolbar.locator('button');
  await formatButtons.first().waitFor({ state: 'visible', timeout: 8000 });
  if ((await formatButtons.count()) < 6) {
    throw new Error(`Expected 6 in-place formatting controls, got ${await formatButtons.count()}`);
  }
  await inline.getByRole('button', { name: /Save changes/i }).waitFor({ state: 'visible', timeout: 8000 });
  const inlineEditor = postCard.getByRole('textbox', { name: /Edit post/i });
  await inlineEditor.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' updated', { delay: 8 });
  await postCard.getByRole('button', { name: /Save changes/i }).click();
  await postCard.getByText(/Edited/).waitFor({ state: 'visible', timeout: 15000 });
}

const env = loadEnv();
const browser = await chromium.launch({ headless: true });
try {
  await deleteVerificationPosts(env);
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await phone.getByLabel(/email/i).fill(env.email);
  await phone.getByLabel(/password/i).fill(env.password);
  await phone.getByRole('button', { name: /sign in|log in/i }).click();
  await phone.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(phone);
  const phoneEditor = await openHomeComposer(phone);
  await formatEditAndEditedWalk(phone, phoneEditor);
  await phone.close();

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await desktop.getByLabel(/email/i).fill(env.email);
  await desktop.getByLabel(/password/i).fill(env.password);
  await desktop.getByRole('button', { name: /sign in|log in/i }).click();
  await desktop.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
  await acceptTermsIfPresent(desktop);
  await openHomeComposer(desktop);
  await desktop.close();

  console.log('PASS: Home post formatting toolbar @390px and @1280px; in-place edit → Edited @390px');
} finally {
  await browser.close();
  try {
    const removed = await deleteVerificationPosts(env);
    if (removed) console.log(`cleaned ${removed} fmt-edit verification post(s)`);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
