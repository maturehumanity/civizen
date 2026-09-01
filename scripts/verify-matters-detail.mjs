#!/usr/bin/env node
/**
 * Real Matter detail walks at 390px and 1280px for the Phase 1 states.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matters-detail';
mkdirSync(outDir, { recursive: true });

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'))?.[1]?.trim();
  const getLocal = (key) => local.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
  const url = get(root, 'VITE_SUPABASE_URL');
  const anon = get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  return {
    url,
    anon,
    memberEmail: getLocal('TEST_USER_ROLE_MEMBER_EMAIL'),
    memberPassword: getLocal('TEST_USER_ROLE_MEMBER_PASSWORD'),
    citizenEmail: getLocal('TEST_USER_ROLE_CITIZEN_EMAIL'),
    citizenPassword: getLocal('TEST_USER_ROLE_CITIZEN_PASSWORD'),
  };
}

async function session(url, anon, email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`auth failed: ${error.message}`);
  const { data: userData } = await client.auth.getUser();
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();
  if (profileError || !profile?.id) throw new Error('profile missing');
  return { client, profileId: profile.id, email, password };
}

async function createMatter(client, payload) {
  const { data, error } = await client.rpc('create_matter', { payload });
  if (error || typeof data !== 'string') throw new Error(error?.message || 'create_matter failed');
  return data;
}

async function act(client, matterId, action, message) {
  const { error } = await client.rpc('perform_matter_formal_action', {
    p_matter_id: matterId,
    p_action: action,
    p_message: message ?? null,
  });
  if (error) throw new Error(`${action}: ${error.message}`);
}

async function comment(client, matterId, body) {
  const { error } = await client.rpc('add_matter_comment', { p_matter_id: matterId, p_body: body });
  if (error) throw new Error(`comment: ${error.message}`);
}

function applySql(sql) {
  const file = '/tmp/civizen-matters-detail-seed.sql';
  writeFileSync(file, sql);
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'SQL apply failed');
  }
}

const env = loadEnv();
if (!env.url || !env.anon || !env.memberEmail || !env.citizenEmail) {
  throw new Error('Missing credentials for verify:matters-detail');
}

applySql("DELETE FROM public.matters WHERE title LIKE '[verify-matters]%';");

const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);

const qWaiting = await createMatter(member.client, {
  title: '[verify-matters] Question waiting',
  description: 'Please explain how public Areas work.',
  matter_type: 'question',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});

const qDiscussion = await createMatter(member.client, {
  title: '[verify-matters] Question discussion',
  description: 'Can we talk through this before a final answer?',
  matter_type: 'question',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});
await comment(citizen.client, qDiscussion, 'We are reviewing this. This comment is not the final answer.');
await comment(member.client, qDiscussion, 'Thanks — I can wait while we discuss.');

const qClarify = await createMatter(member.client, {
  title: '[verify-matters] Clarification needed',
  description: 'The streetlight is out.',
  matter_type: 'issue',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});
await act(citizen.client, qClarify, 'request_clarification', 'Which corner?');

const issueWaiting = await createMatter(member.client, {
  title: '[verify-matters] Issue waiting',
  description: 'Members cannot sign in after a profile miss.',
  matter_type: 'issue',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});

const issueConfirm = await createMatter(member.client, {
  title: '[verify-matters] Issue confirmation',
  description: 'Login lockout still needs a final check from the initiator.',
  matter_type: 'issue',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});
await act(citizen.client, issueConfirm, 'accept_responsibility');
await act(citizen.client, issueConfirm, 'mark_addressed', 'Fixed the wait-for-profile spinner.');

const overdue = await createMatter(member.client, {
  title: '[verify-matters] Overdue action',
  description: 'This Question is past due and still pending.',
  matter_type: 'question',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});

const autoClosed = await createMatter(member.client, {
  title: '[verify-matters] Automatically closed',
  description: 'Initiator did not confirm within the review period.',
  matter_type: 'issue',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});
await act(citizen.client, autoClosed, 'accept_responsibility');
await act(citizen.client, autoClosed, 'mark_addressed', 'Addressed with a final response.');

const reopenSource = await createMatter(member.client, {
  title: '[verify-matters] Reopened matter',
  description: 'This Issue was auto-closed, then reopened because it returned.',
  matter_type: 'issue',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});
await act(citizen.client, reopenSource, 'accept_responsibility');
await act(citizen.client, reopenSource, 'mark_addressed', 'Addressed with a final response.');

applySql(`
UPDATE public.matter_action_requirements a
SET due_at = now() - interval '6 hours',
    reminder_at = now() - interval '12 hours'
FROM public.matters m
WHERE a.id = m.current_action_id
  AND m.title IN (
    '[verify-matters] Overdue action',
    '[verify-matters] Automatically closed',
    '[verify-matters] Reopened matter'
  );
SELECT public.process_matter_action_timeouts();
`);

await act(member.client, reopenSource, 'reopen', 'The Issue returned.');

const fixtures = [
  { id: qWaiting, slug: 'question-waiting', as: 'citizen', title: '[verify-matters] Question waiting', expect: /Action required from you|Provide a final answer|Provide final answer/i },
  { id: qDiscussion, slug: 'question-discussion', as: 'citizen', title: '[verify-matters] Question discussion', expect: /Discussion only|We are reviewing this/i },
  { id: qClarify, slug: 'clarification', as: 'member', title: '[verify-matters] Clarification needed', expect: /Action required from you|clarification|Provide the requested clarification/i },
  { id: issueWaiting, slug: 'issue-waiting', as: 'citizen', title: '[verify-matters] Issue waiting', expect: /Accept responsibility|Action required from you/i },
  { id: issueConfirm, slug: 'issue-confirmation', as: 'member', title: '[verify-matters] Issue confirmation', expect: /Confirm whether|Answered \/ satisfied|Resolved \/ satisfied/i },
  { id: overdue, slug: 'overdue', as: 'citizen', title: '[verify-matters] Overdue action', expect: /Overdue/i },
  { id: autoClosed, slug: 'auto-closed', as: 'member', title: '[verify-matters] Automatically closed', expect: /Automatically closed|no response from the initiator/i },
  { id: reopenSource, slug: 'reopened', as: 'citizen', title: '[verify-matters] Reopened matter', expect: /Previous closure remains|Action required from you/i },
];

async function acceptTermsIfPresent(page) {
  const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
  try {
    await acceptTerms.waitFor({ state: 'visible', timeout: 8000 });
    await acceptTerms.click();
    await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 });
  } catch {
    const byText = page.getByText('I accept these Terms', { exact: true });
    if (await byText.isVisible().catch(() => false)) {
      await byText.click();
      await byText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }
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
    await login(memberPage, env.memberEmail, env.memberPassword);
    await login(citizenPage, env.citizenEmail, env.citizenPassword);

    for (const fixture of fixtures) {
      const page = fixture.as === 'member' ? memberPage : citizenPage;
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseUrl}/contribute/matters/${fixture.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await acceptTermsIfPresent(page);
      try {
        await page.getByText(fixture.title).first().waitFor({ state: 'visible', timeout: 20000 });
        await page.getByText(fixture.expect).first().waitFor({ state: 'visible', timeout: 15000 });
      } catch (error) {
        await page.screenshot({ path: `${outDir}/FAIL-${fixture.slug}-${width}.png`, fullPage: true });
        const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 800);
        throw new Error(`${fixture.slug} @${width} url=${page.url()} body=${body}`, { cause: error });
      }
      const plusCount = await page.getByLabel('New Matter').count();
      if (plusCount > 1) throw new Error(`${fixture.slug}: duplicate create controls`);
      await page.screenshot({ path: `${outDir}/${fixture.slug}-${width}.png`, fullPage: true });
      if (errors.length) throw new Error(`${fixture.slug} @${width}: ${errors.join('\n')}`);
    }
    await memberPage.close();
    await citizenPage.close();
    await memberContext.close();
    await citizenContext.close();
  }
} finally {
  await browser.close();
}

console.log(`verify:matters-detail OK ${baseUrl} (screenshots in ${outDir})`);
