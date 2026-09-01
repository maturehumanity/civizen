#!/usr/bin/env node
/**
 * Matter Resolution / Outcome walks (Phase 3) at 390px and 1280px — 13 dedicated states.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matters-resolution-detail';
mkdirSync(outDir, { recursive: true });

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp(`^${key}=["']?([^"'\n]+)`, 'm'))?.[1]?.trim();
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

function applySql(sql) {
  const file = '/tmp/civizen-matters-resolution-detail-seed.sql';
  writeFileSync(file, sql);
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'SQL apply failed');
  }
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

async function issueReady(member, citizen, title, description) {
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
  const { error: startError } = await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: id });
  if (startError) throw new Error(startError.message);
  const { error: completeError } = await citizen.client.rpc('complete_matter_collaborative_work', { p_matter_id: id });
  if (completeError) throw new Error(completeError.message);
  return id;
}

async function proposeResolution(client, matterId, summary) {
  const { error } = await client.rpc('propose_matter_resolution', {
    payload: {
      matter_id: matterId,
      resolution_kind: 'resolved',
      summary,
      actions_taken: 'Verification fixture actions.',
    },
  });
  if (error) throw new Error(error.message);
}

async function reviewResolution(client, matterId, action, opts = {}) {
  const row = await getMatter(client, matterId);
  const item = pending(row, 'review_resolution');
  if (!item?.id) throw new Error(`missing review_resolution for ${action}`);
  const { error } = await client.rpc('perform_resolution_review', {
    p_action_id: item.id,
    p_action: action,
    p_message: opts.message ?? null,
    p_follow_up_choice: opts.followUpChoice ?? null,
    p_follow_up_title: opts.followUpTitle ?? null,
    p_follow_up_description: opts.followUpDescription ?? null,
  });
  if (error) throw new Error(error.message);
}

const env = loadEnv();
if (!env.url || !env.anon || !env.memberEmail || !env.citizenEmail) {
  throw new Error('Missing credentials for verify:matters-resolution-detail');
}

const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);

const PREFIX = '[verify-matters-resolution]';

// 1–2. Resolution proposed / initiator reviewing
const proposed = await issueReady(member, citizen, `${PREFIX} Resolution proposed`, 'Responsible Lead proposed a Resolution.');
await proposeResolution(citizen.client, proposed, 'We updated the assessment workflow copy and tooltips.');

// 3. Not resolved — work continues
const notResolved = await issueReady(member, citizen, `${PREFIX} Not resolved`, 'Initiator rejected the proposal; work continues.');
await proposeResolution(citizen.client, notResolved, 'First attempt did not fully fix the issue.');
await reviewResolution(member.client, notResolved, 'confirm_not_resolved', { message: 'Still confusing after the change.' });

// 4. Partial resolution — continue Matter
const partialContinue = await issueReady(member, citizen, `${PREFIX} Partial resolution`, 'Initiator accepted partial progress and continued the Matter.');
await proposeResolution(citizen.client, partialContinue, 'Mobile layout improved but desktop still needs work.');
await reviewResolution(member.client, partialContinue, 'confirm_partially_resolved', {
  message: 'Better on mobile; desktop still unclear.',
  followUpChoice: 'continue',
});

// 5. Multiple Resolution attempts
const multipleAttempts = await issueReady(member, citizen, `${PREFIX} Multiple attempts`, 'Three Resolution cycles are on record.');
await proposeResolution(citizen.client, multipleAttempts, 'Attempt one summary.');
await reviewResolution(member.client, multipleAttempts, 'confirm_not_resolved', { message: 'Not enough yet.' });
await proposeResolution(citizen.client, multipleAttempts, 'Attempt two summary.');
await reviewResolution(member.client, multipleAttempts, 'confirm_partially_resolved', {
  message: 'Partly improved.',
  followUpChoice: 'continue',
});
await proposeResolution(citizen.client, multipleAttempts, 'Attempt three summary.');

// 6. Confirmed Resolution
const confirmed = await issueReady(member, citizen, `${PREFIX} Confirmed resolution`, 'Initiator confirmed the proposed Resolution.');
await proposeResolution(citizen.client, confirmed, 'Assessment workflow is now understandable.');
await reviewResolution(member.client, confirmed, 'confirm_resolved', { message: 'Resolved / satisfied' });

// 7. Auto-closed (no initiator response)
const autoClosed = await issueReady(member, citizen, `${PREFIX} Auto-closed`, 'Initiator did not review within the period.');
await proposeResolution(citizen.client, autoClosed, 'We believe this is fixed.');

// 8. Reopened after auto-close
const reopened = await issueReady(member, citizen, `${PREFIX} Reopened`, 'Previously auto-closed, then reopened.');
await proposeResolution(citizen.client, reopened, 'Initial proposal before auto-close.');

// 9–10. Escalation overdue / performed (Question respond action)
const escalationOverdue = await createMatter(member.client, {
  title: `${PREFIX} Escalation overdue`,
  description: 'Responsible party has not responded.',
  matter_type: 'question',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});

const escalationPerformed = await createMatter(member.client, {
  title: `${PREFIX} Escalation performed`,
  description: 'Escalation steps should have executed.',
  matter_type: 'issue',
  initiator_kind: 'person',
  initiator_profile_id: member.profileId,
  addressee_kind: 'person',
  addressee_profile_id: citizen.profileId,
  visibility: 'participants',
  submit: true,
});

// 11. Evaluations on closed Matter
const evaluations = confirmed;

// 12. Scheduled outcome follow-up
const outcomeScheduled = await issueReady(member, citizen, `${PREFIX} Outcome scheduled`, 'Outcome follow-up is scheduled.');
await proposeResolution(citizen.client, outcomeScheduled, 'Crossing paint refreshed.');
await reviewResolution(member.client, outcomeScheduled, 'confirm_resolved', { message: 'Looks good for now.' });
await member.client.rpc('schedule_matter_outcome_followup', {
  payload: {
    matter_id: outcomeScheduled,
    days_until_review: 30,
    outcome_question: 'Did the crossing feel safer after 30 days?',
  },
});

// 13. Completed outcome follow-up
const outcomeCompleted = await issueReady(member, citizen, `${PREFIX} Outcome completed`, 'Outcome follow-up recorded.');
await proposeResolution(citizen.client, outcomeCompleted, 'Safety improvements installed.');
await reviewResolution(member.client, outcomeCompleted, 'confirm_resolved', { message: 'Confirmed at the time.' });
const { data: followupId, error: scheduleError } = await member.client.rpc('schedule_matter_outcome_followup', {
  payload: {
    matter_id: outcomeCompleted,
    days_until_review: 1,
    outcome_question: 'Did conditions improve?',
  },
});
if (scheduleError) throw new Error(scheduleError.message);

applySql(`
UPDATE public.matter_action_requirements a
SET due_at = now() - interval '8 days',
    reminder_at = now() - interval '9 days',
    status = CASE WHEN a.status = 'pending' THEN 'overdue' ELSE a.status END
FROM public.matters m
WHERE a.matter_id = m.id
  AND m.title IN (
    '${PREFIX} Auto-closed',
    '${PREFIX} Reopened'
  )
  AND a.action_type = 'review_resolution';

UPDATE public.matter_action_requirements a
SET due_at = now() - interval '6 hours',
    reminder_at = now() - interval '12 hours'
FROM public.matters m
WHERE a.matter_id = m.id
  AND m.title = '${PREFIX} Escalation overdue'
  AND a.action_type = 'respond';

UPDATE public.matter_action_requirements a
SET due_at = now() - interval '80 hours',
    reminder_at = now() - interval '90 hours',
    status = 'overdue'
FROM public.matters m
WHERE a.matter_id = m.id
  AND m.title = '${PREFIX} Escalation performed'
  AND a.action_type = 'responsibility_response';

UPDATE public.matter_outcome_followups f
SET review_due_at = now() - interval '1 hour'
FROM public.matters m
WHERE f.matter_id = m.id
  AND m.title = '${PREFIX} Outcome completed';

SELECT public.process_matter_action_timeouts();
`);

await act(member.client, reopened, 'reopen', 'Issue returned after auto-close.');

// Complete outcome after activation
{
  const row = await getMatter(member.client, outcomeCompleted);
  const outcomeAction = pending(row, 'outcome_followup', member.profileId);
  if (outcomeAction?.id) {
    const { error } = await member.client.rpc('perform_outcome_followup', {
      p_action_id: outcomeAction.id,
      p_result: 'no_change',
      p_notes: 'Still feels unsafe at rush hour.',
    });
    if (error) throw new Error(error.message);
  }
}

// Submit evaluation on confirmed matter
await member.client.rpc('submit_matter_evaluation', {
  payload: {
    matter_id: evaluations,
    evaluator_role: 'initiator',
    dimension: 'resolution_quality',
    rating: 'adequate',
    comment: 'Clear enough for verify fixture.',
  },
});

const fixtures = [
  {
    id: proposed,
    slug: '01-resolution-proposed',
    as: 'citizen',
    title: `${PREFIX} Resolution proposed`,
    expect: [/proposed/i, /Attempt 1/i],
    forbid: /Resolved \/ satisfied|Automatically closed/i,
  },
  {
    id: proposed,
    slug: '02-initiator-reviewing',
    as: 'member',
    title: `${PREFIX} Resolution proposed`,
    expect: [/Review proposed resolution|Review the proposed Resolution/i, /Partially resolved|Not resolved/i],
    forbid: /Automatically closed/i,
  },
  {
    id: notResolved,
    slug: '03-not-resolved',
    as: 'citizen',
    title: `${PREFIX} Not resolved`,
    expect: [/rejected|Not resolved|Address this Matter|further action/i],
    forbid: /Resolved and confirmed|Automatically closed/i,
  },
  {
    id: partialContinue,
    slug: '04-partial-resolution',
    as: 'member',
    title: `${PREFIX} Partial resolution`,
    expect: [/partially_accepted|Partially resolved|partial/i],
    forbid: /Resolved and confirmed|Automatically closed/i,
  },
  {
    id: multipleAttempts,
    slug: '05-multiple-attempts',
    as: 'member',
    title: `${PREFIX} Multiple attempts`,
    expect: [/Attempt 1/i, /Attempt 2/i, /Attempt 3/i],
  },
  {
    id: confirmed,
    slug: '06-confirmed-resolution',
    as: 'member',
    title: `${PREFIX} Confirmed resolution`,
    expect: [/confirmed|Resolved/i],
    forbid: /Automatically closed|no response from the initiator/i,
  },
  {
    id: autoClosed,
    slug: '07-auto-closed',
    as: 'member',
    title: `${PREFIX} Auto-closed`,
    expect: [/Automatically closed|no response from the initiator|auto_closed/i],
    forbid: /Resolved \/ satisfied|Initiator confirmed resolution/i,
  },
  {
    id: reopened,
    slug: '08-reopened',
    as: 'citizen',
    title: `${PREFIX} Reopened`,
    expect: [/Previous closure remains|reopened|Action required/i],
  },
  {
    id: escalationOverdue,
    slug: '09-escalation-overdue',
    as: 'citizen',
    title: `${PREFIX} Escalation overdue`,
    expect: [/Overdue|Action required|Provide a final answer/i],
  },
  {
    id: escalationPerformed,
    slug: '10-escalation-performed',
    as: 'member',
    title: `${PREFIX} Escalation performed`,
    expect: [/Accept responsibility|unresponsive|Responsible Lead|Overdue/i],
  },
  {
    id: evaluations,
    slug: '11-evaluations',
    as: 'member',
    section: 'resolution',
    title: `${PREFIX} Confirmed resolution`,
    expect: [/Evaluation|resolution quality|adequate/i],
    forbid: /Score|reputation/i,
  },
  {
    id: outcomeScheduled,
    slug: '12-outcome-scheduled',
    as: 'member',
    section: 'resolution',
    title: `${PREFIX} Outcome scheduled`,
    expect: [/Outcome follow-up|scheduled|safer after 30 days/i],
    forbid: /no_change|worsened/i,
  },
  {
    id: outcomeCompleted,
    slug: '13-outcome-completed',
    as: 'member',
    section: 'outcome',
    title: `${PREFIX} Outcome completed`,
    expect: [/no change|Outcome|Did conditions improve/i],
    forbid: /Matter reopened|not resolved/i,
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
    const memberContext = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const citizenContext = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const memberPage = await memberContext.newPage();
    const citizenPage = await citizenContext.newPage();
    await login(memberPage, env.memberEmail, env.memberPassword);
    await login(citizenPage, env.citizenEmail, env.citizenPassword);

    const memberErrors = [];
    const citizenErrors = [];
    memberPage.on('pageerror', (error) => memberErrors.push(error.message));
    citizenPage.on('pageerror', (error) => citizenErrors.push(error.message));

    // Action queue context badges
    await memberPage.goto(`${baseUrl}/contribute/matters`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptTermsIfPresent(memberPage);
    try {
      await memberPage.getByText('Resolution', { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 });
    } catch (error) {
      await memberPage.screenshot({ path: `${outDir}/FAIL-queue-context-${width}.png`, fullPage: true });
      throw new Error(`queue context badge missing @${width}`, { cause: error });
    }
    await memberPage.screenshot({ path: `${outDir}/queue-context-${width}.png`, fullPage: true });

    for (const fixture of fixtures) {
      const page = fixture.as === 'member' ? memberPage : citizenPage;
      const url = fixture.section
        ? `${baseUrl}/contribute/matters/${fixture.id}?section=${fixture.section}`
        : `${baseUrl}/contribute/matters/${fixture.id}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await acceptTermsIfPresent(page);
      try {
        await page.getByText(fixture.title).first().waitFor({ state: 'visible', timeout: 20000 });
        const expects = Array.isArray(fixture.expect) ? fixture.expect : [fixture.expect];
        for (const pattern of expects) {
          await page.getByText(pattern).first().waitFor({ state: 'visible', timeout: 15000 });
        }
        if (fixture.forbid) {
          const forbidden = Array.isArray(fixture.forbid) ? fixture.forbid : [fixture.forbid];
          for (const pattern of forbidden) {
            if ((await page.getByText(pattern).count()) > 0) {
              throw new Error(`${fixture.slug} unexpectedly showed forbidden copy: ${pattern}`);
            }
          }
        }
        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth > root.clientWidth + 2;
        });
        if (overflow && width === 390) {
          throw new Error(`${fixture.slug} horizontal overflow @390px`);
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

console.log(`verify:matters-resolution-detail OK ${baseUrl} (screenshots in ${outDir})`);
