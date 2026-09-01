#!/usr/bin/env node
/**
 * Collaborative Work Matter walks at 390px and 1280px (spec §32).
 */
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matters-work-detail';
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

async function getMatter(client, matterId) {
  const { data, error } = await client.rpc('get_matter', { p_matter_id: matterId });
  if (error) throw new Error(error.message);
  return data;
}

function pending(row, actionType, profileId) {
  return (row?.pending_actions ?? []).find(
    (item) => item.action_type === actionType && (!profileId || item.assigned_profile_id === profileId),
  );
}

async function collab(client, actionId, action, extra = {}) {
  const { error } = await client.rpc('perform_collaboration_action', {
    p_action_id: actionId,
    p_action: action,
    p_message: extra.message ?? null,
    p_target_kind: extra.targetKind ?? null,
    p_target_profile_id: extra.targetProfileId ?? null,
  });
  if (error) throw new Error(`${action}: ${error.message}`);
}

async function createTask(client, payload) {
  const { data, error } = await client.rpc('create_collaboration_task', { payload });
  if (error || typeof data !== 'string') throw new Error(error?.message || 'create_collaboration_task failed');
  return data;
}

const env = loadEnv();
if (!env.url || !env.anon || !env.memberEmail || !env.citizenEmail) {
  throw new Error('Missing credentials for verify:matters-work-detail');
}

const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);

async function issue(title, description) {
  const id = await createMatter(member.client, {
    title,
    description,
    matter_type: 'issue',
    initiator_kind: 'person',
    initiator_profile_id: member.profileId,
    addressee_kind: 'person',
    addressee_profile_id: citizen.profileId,
    visibility: 'participants',
    submit: true,
  });
  await act(citizen.client, id, 'accept_responsibility');
  return id;
}

const noWork = await createMatter(member.client, {
  title: '[verify-matters-work] No collaborative work',
  description: 'A simple Question that can be answered in conversation.',
  matter_type: 'question',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});

const justStarted = await issue(
  '[verify-matters-work] Work just started',
  'Collaborative work is enabled with no Tasks yet.',
);
{
  const { error: startWork } = await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: justStarted });
  if (startWork) throw new Error(startWork.message);
}

const outstanding = await issue(
  '[verify-matters-work] Outstanding tasks',
  'Required Tasks are still in progress, so ordinary completion is unavailable.',
);
{
  const { error } = await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: outstanding });
  if (error) throw new Error(error.message);
  await createTask(citizen.client, {
    matter_id: outstanding,
    title: 'UX investigation still in progress',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
  });
  const row = await getMatter(member.client, outstanding);
  const accept = pending(row, 'accept_task', member.profileId);
  if (!accept?.id) throw new Error('outstanding fixture missing accept_task');
  await collab(member.client, accept.id, 'accept');
}

const sharedRequest = await issue(
  '[verify-matters-work] Shared responsibility requested',
  'The intended collaborator must accept shared responsibility.',
);
{
  const { error: startError } = await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: sharedRequest });
  if (startError) throw new Error(startError.message);
  const { error: inviteError } = await citizen.client.rpc('invite_matter_participant', {
    p_matter_id: sharedRequest,
    p_role: 'contributor',
    p_kind: 'person',
    p_profile_id: member.profileId,
  });
  if (inviteError) throw new Error(inviteError.message);
  const { error: requestError } = await citizen.client.rpc('invite_matter_participant', {
    p_matter_id: sharedRequest,
    p_role: 'responsible_collaborator',
    p_kind: 'person',
    p_profile_id: member.profileId,
  });
  if (requestError) throw new Error(requestError.message);
}

const concurrent = await issue(
  '[verify-matters-work] Concurrent tasks',
  'UX and technical investigations can proceed together.',
);
{
  const { error } = await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: concurrent });
  if (error) throw new Error(error.message);
  await createTask(citizen.client, {
    matter_id: concurrent,
    title: 'UX investigation',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
  });
  await createTask(citizen.client, {
    matter_id: concurrent,
    title: 'Technical investigation',
    assignee_kind: 'person',
    assignee_profile_id: citizen.profileId,
  });
}

const acceptAction = await issue(
  '[verify-matters-work] Task acceptance',
  'Assignee must accept or decline this Task.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: acceptAction });
  await createTask(citizen.client, {
    matter_id: acceptAction,
    title: 'Review mobile accessibility',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
  });
}

const execution = await issue(
  '[verify-matters-work] Task execution',
  'Assignee has accepted and must complete the work.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: execution });
  await createTask(citizen.client, {
    matter_id: execution,
    title: 'Complete technical investigation',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
  });
  const row = await getMatter(member.client, execution);
  const action = pending(row, 'accept_task', member.profileId);
  if (!action?.id) throw new Error('execution fixture missing accept_task');
  await collab(member.client, action.id, 'accept');
}

const blocked = await issue(
  '[verify-matters-work] Blocked dependency',
  'Implementation waits on investigation.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: blocked });
  const first = await createTask(citizen.client, {
    matter_id: blocked,
    title: 'UX investigation',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
  });
  await createTask(citizen.client, {
    matter_id: blocked,
    title: 'Implementation',
    assignee_kind: 'person',
    assignee_profile_id: citizen.profileId,
    depends_on: [first],
  });
}

const review = await issue(
  '[verify-matters-work] Submitted for review',
  'Submitted work waits for reviewer approval.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: review });
  await createTask(citizen.client, {
    matter_id: review,
    title: 'UX findings',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
    review_required: true,
  });
  const row = await getMatter(member.client, review);
  const accept = pending(row, 'accept_task', member.profileId);
  await collab(member.client, accept.id, 'accept');
  const after = await getMatter(member.client, review);
  const complete = pending(after, 'complete_task', member.profileId);
  await collab(member.client, complete.id, 'submit');
}

const changes = await issue(
  '[verify-matters-work] Changes requested',
  'Reviewer returned submitted work.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: changes });
  await createTask(citizen.client, {
    matter_id: changes,
    title: 'UX findings',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
    review_required: true,
  });
  const row = await getMatter(member.client, changes);
  await collab(member.client, pending(row, 'accept_task', member.profileId).id, 'accept');
  const after = await getMatter(member.client, changes);
  await collab(member.client, pending(after, 'complete_task', member.profileId).id, 'submit');
  const submitted = await getMatter(citizen.client, changes);
  await collab(citizen.client, pending(submitted, 'review_task').id, 'request_changes', {
    message: 'Please add keyboard notes.',
  });
}

const decided = await issue(
  '[verify-matters-work] Decision recorded',
  'A Decision was recorded during work.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: decided });
  const { error } = await citizen.client.rpc('propose_matter_decision', {
    payload: {
      matter_id: decided,
      title: 'Use option B',
      statement: 'Implement revised assessment explanation and interaction flow.',
      rationale: 'Meets accessibility requirements without changing navigation structure.',
    },
  });
  if (error) throw new Error(error.message);
}

const finalResponse = await issue(
  '[verify-matters-work] Final response pending',
  'All work is complete; the Responsible Lead must respond.',
);
{
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: finalResponse });
  await createTask(citizen.client, {
    matter_id: finalResponse,
    title: 'Verify corrected behavior',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
  });
  const row = await getMatter(member.client, finalResponse);
  await collab(member.client, pending(row, 'accept_task', member.profileId).id, 'accept');
  const after = await getMatter(member.client, finalResponse);
  await collab(member.client, pending(after, 'complete_task', member.profileId).id, 'complete');
  const { error } = await citizen.client.rpc('complete_matter_collaborative_work', { p_matter_id: finalResponse });
  if (error) throw new Error(error.message);
}

const fixtures = [
  {
    id: noWork,
    slug: 'no-work',
    as: 'member',
    title: '[verify-matters-work] No collaborative work',
    expect: /Action required from you|Provide a final answer|Waiting on/i,
    forbid: /Add a Task|Needs attention/i,
  },
  {
    id: justStarted,
    slug: 'work-started',
    as: 'citizen',
    title: '[verify-matters-work] Work just started',
    expect: [/Work in progress|Add a Task/i, /Invite to collaborate/i, /Request shared responsibility/i],
  },
  {
    id: outstanding,
    slug: 'outstanding',
    as: 'citizen',
    title: '[verify-matters-work] Outstanding tasks',
    expect: [
      /Collaborative work has outstanding Tasks/i,
      /cannot be marked complete in the ordinary way/i,
      /Complete with outstanding work/i,
    ],
    forbid: /Review completed work and provide final response/i,
  },
  {
    id: sharedRequest,
    slug: 'shared-request',
    as: 'member',
    title: '[verify-matters-work] Shared responsibility requested',
    expect: [/Respond to this shared responsibility request|Accept responsibility/i],
  },
  {
    id: sharedRequest,
    slug: 'shared-vs-invite',
    as: 'citizen',
    title: '[verify-matters-work] Shared responsibility requested',
    expect: [/Invited to collaborate/i, /Shared responsibility requested/i],
  },
  {
    id: concurrent,
    slug: 'concurrent',
    as: 'citizen',
    title: '[verify-matters-work] Concurrent tasks',
    expect: /UX investigation|Technical investigation/i,
  },
  {
    id: acceptAction,
    slug: 'acceptance',
    as: 'member',
    title: '[verify-matters-work] Task acceptance',
    expect: /Accept or decline this Task|Review mobile accessibility/i,
  },
  {
    id: execution,
    slug: 'execution',
    as: 'member',
    title: '[verify-matters-work] Task execution',
    expect: /Complete the assigned work|Mark Task complete|Complete technical investigation/i,
  },
  {
    id: blocked,
    slug: 'blocked',
    as: 'citizen',
    title: '[verify-matters-work] Blocked dependency',
    expect: /Blocked by|Implementation/i,
  },
  {
    id: review,
    slug: 'review',
    as: 'citizen',
    title: '[verify-matters-work] Submitted for review',
    expect: /Review the submitted work|Accept completion|Under review/i,
  },
  {
    id: changes,
    slug: 'changes',
    as: 'member',
    title: '[verify-matters-work] Changes requested',
    expect: /Submit work|Complete the assigned work|Changes requested/i,
  },
  {
    id: decided,
    slug: 'decision',
    as: 'citizen',
    title: '[verify-matters-work] Decision recorded',
    expect: /Implement revised assessment explanation/i,
  },
  {
    id: finalResponse,
    slug: 'final-response',
    as: 'citizen',
    title: '[verify-matters-work] Final response pending',
    expect: /Work complete|awaiting final response|Provide a final|Mark addressed|Address this Matter/i,
  },
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

    const memberErrors = [];
    const citizenErrors = [];
    memberPage.on('pageerror', (error) => memberErrors.push(error.message));
    citizenPage.on('pageerror', (error) => citizenErrors.push(error.message));

    await memberPage.goto(`${baseUrl}/contribute/matters`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptTermsIfPresent(memberPage);
    try {
      await memberPage.getByText('[verify-matters-work] Task acceptance').first().waitFor({ state: 'visible', timeout: 20000 });
      await memberPage.getByText(/Task: Review mobile accessibility/i).first().waitFor({ state: 'visible', timeout: 15000 });
    } catch (error) {
      await memberPage.screenshot({ path: `${outDir}/FAIL-queue-${width}.png`, fullPage: true });
      throw new Error(`queue @${width} missing Task context`, { cause: error });
    }

    for (const fixture of fixtures) {
      const page = fixture.as === 'member' ? memberPage : citizenPage;
      await page.goto(`${baseUrl}/contribute/matters/${fixture.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await acceptTermsIfPresent(page);
      try {
        await page.getByText(fixture.title).first().waitFor({ state: 'visible', timeout: 20000 });
        const expects = Array.isArray(fixture.expect) ? fixture.expect : [fixture.expect];
        for (const pattern of expects) {
          await page.getByText(pattern).first().waitFor({ state: 'visible', timeout: 15000 });
        }
        if (fixture.forbid && (await page.getByText(fixture.forbid).count()) > 0) {
          throw new Error(`${fixture.slug} unexpectedly showed forbidden copy`);
        }
      } catch (error) {
        await page.screenshot({ path: `${outDir}/FAIL-${fixture.slug}-${width}.png`, fullPage: true });
        const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 800);
        throw new Error(`${fixture.slug} @${width} url=${page.url()} body=${body}`, { cause: error });
      }
      await page.screenshot({ path: `${outDir}/${fixture.slug}-${width}.png`, fullPage: true });
    }

    if (memberErrors.length) throw new Error(`member pageerror @${width}: ${memberErrors.join('\n')}`);
    if (citizenErrors.length) throw new Error(`citizen pageerror @${width}: ${citizenErrors.join('\n')}`);
    await memberPage.close();
    await citizenPage.close();
    await memberContext.close();
    await citizenContext.close();
  }
} finally {
  await browser.close();
}

console.log(`verify:matters-work-detail OK ${baseUrl} (screenshots in ${outDir})`);
