#!/usr/bin/env node
/**
 * Matter Coding Agent walks (Phase 4B1) at 390px and 1280px — 14 dedicated states.
 * Execution uses the development worktree runner, not the Edge Function.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matters-coding-detail';
mkdirSync(outDir, { recursive: true });

const DIRTY_PROBE = resolve('UNRELATED_DIRTY_PHASE4B1.txt');
const PREFIX = '[verify-matters-coding]';

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp('^' + key + '=["\']?([^"\'\\n]+)', 'm'))?.[1]?.trim();
  const getLocal = (key) => {
    const raw = local.match(new RegExp('^' + key + '=(.+)$', 'm'))?.[1]?.trim();
    return raw?.replace(/^['"]|['"]$/g, '');
  };
  return {
    url: get(root, 'VITE_SUPABASE_URL'),
    anon: get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    memberEmail: getLocal('TEST_USER_ROLE_MEMBER_EMAIL'),
    memberPassword: getLocal('TEST_USER_ROLE_MEMBER_PASSWORD'),
    citizenEmail: getLocal('TEST_USER_ROLE_CITIZEN_EMAIL'),
    citizenPassword: getLocal('TEST_USER_ROLE_CITIZEN_PASSWORD'),
  };
}

function applySql(sql) {
  const file = '/tmp/civizen-matters-coding-detail-seed.sql';
  writeFileSync(file, sql);
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'SQL apply failed');
  }
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function session(url, anon, email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`auth failed: ${error.message}`);
  const { data: userData } = await client.auth.getUser();
  const { data: profile } = await client.from('profiles').select('id').eq('user_id', userData.user.id).single();
  if (!profile?.id) throw new Error('profile missing');
  return { client, profileId: profile.id, email, password };
}

async function createIssue(member, citizen, title, description) {
  const { data, error } = await member.client.rpc('create_matter', {
    payload: {
      title,
      description,
      matter_type: 'issue',
      initiator_kind: 'person',
      initiator_profile_id: member.profileId,
      addressee_kind: 'person',
      addressee_profile_id: citizen.profileId,
      visibility: 'participants',
      submit: true,
    },
  });
  if (error || typeof data !== 'string') throw new Error(error?.message || 'create_matter failed');
  await citizen.client.rpc('perform_matter_formal_action', { p_matter_id: data, p_action: 'accept_responsibility' });
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: data });
  return data;
}

async function getMatter(client, matterId) {
  const { data, error } = await client.rpc('get_matter', { p_matter_id: matterId });
  if (error) throw new Error(error.message);
  return data;
}

async function assignCoding(client, matterId, supervisorId, instructions, paths) {
  const { data, error } = await client.rpc('assign_matter_coding_agent', {
    payload: {
      matter_id: matterId,
      instructions,
      supervising_profile_id: supervisorId,
      allowed_paths: paths,
      repository_slug: 'maturehumanity/civizen',
      task_title: 'Fix MatterAgentPanel mobile overflow',
    },
  });
  if (error || typeof data !== 'string') throw new Error(error?.message || 'assign_matter_coding_agent failed');
  const bundle = await getMatter(client, matterId);
  const run = (bundle.agent_runs ?? []).find((row) => row.assignment_id === data);
  return { assignmentId: data, runId: run?.id };
}

function runCoding(runId, stage) {
  const result = spawnSync(
    'npx',
    ['tsx', 'scripts/matter-coding-agent-execute.ts', '--run-id', runId, '--stage', stage],
    { encoding: 'utf8', timeout: 180000, env: { ...process.env, CIVIZEN_CODING_MODEL: 'fake' } },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `coding runner ${stage} failed`);
  }
  return result.stdout;
}

function setRunStatus(runId, status) {
  applySql(`
    UPDATE public.ai_agent_runs
    SET status = ${sqlLiteral(status)},
        started_at = coalesce(started_at, now())
    WHERE id = ${sqlLiteral(runId)};
  `);
}

function completeCodeChange(assignmentId, runId, body, title = 'Coding Agent · AI submission') {
  applySql(`
    SELECT public.matter_complete_agent_run_service(jsonb_build_object(
      'assignment_id', ${sqlLiteral(assignmentId)},
      'run_id', ${sqlLiteral(runId)},
      'artifact_type', 'code_change',
      'title', ${sqlLiteral(title)},
      'body', ${sqlLiteral(body)},
      'output_summary', ${sqlLiteral(body.slice(0, 400))},
      'comment_body', 'Implementation submitted for review.\n1 files changed.\nTargeted tests PASS.'
    ));
  `);
}

function insertArtifact(assignmentId, runId, matterId, type, title, body) {
  applySql(`
    INSERT INTO public.matter_agent_artifacts (
      run_id, assignment_id, matter_id, artifact_type, title, body,
      review_status, generated_by_agent_id, verification_state
    ) VALUES (
      ${sqlLiteral(runId)},
      ${sqlLiteral(assignmentId)},
      ${sqlLiteral(matterId)},
      ${sqlLiteral(type)},
      ${sqlLiteral(title)},
      ${sqlLiteral(body)},
      'pending',
      'b0000000-0000-4000-8000-000000000006',
      'unverified'
    );
  `);
}

async function reviewAgent(client, matterId, supervisorId, action, message) {
  const row = await getMatter(client, matterId);
  const item = (row.pending_actions ?? []).find(
    (entry) => entry.action_type === 'review_task' && entry.assigned_profile_id === supervisorId,
  );
  if (!item?.id) throw new Error(`missing review_task for ${action}`);
  const { error } = await client.rpc('review_matter_agent_work', {
    p_action_id: item.id,
    p_action: action,
    p_message: message ?? null,
  });
  if (error) throw new Error(error.message);
}

const PANEL = 'src/pages/contribute/MatterAgentPanel.tsx';
const TEST_FILE = 'src/lib/matters-coding-policy.test.ts';
const SAMPLE_DIFF = [
  `diff --git a/${PANEL} b/${PANEL}`,
  '--- a/src/pages/contribute/MatterAgentPanel.tsx',
  '+++ b/src/pages/contribute/MatterAgentPanel.tsx',
  '@@ -1,3 +1,4 @@',
  ' <section className="space-y-3 min-w-0 overflow-x-hidden" data-civizen-coding-agent="phase4b1">',
].join('\n');

function codeChangeBody(overrides = {}) {
  return JSON.stringify({
    base_commit_sha: 'abc123def456',
    changed_files: [PANEL],
    diff: SAMPLE_DIFF,
    tests: [{ name: TEST_FILE, result: 'PASS' }],
    commands: [{ command: 'git status', allowed: true, exit_code: 0, category: 'git-read' }],
    workspace_ref: '/tmp/civizen-coding-workspaces/example',
    ready_for_human_commit: true,
    remaining_concerns: ['Not committed, pushed, or deployed'],
    ...overrides,
  }, null, 2);
}

const env = loadEnv();
if (!env.url || !env.anon || !env.memberEmail || !env.citizenEmail) {
  throw new Error('Missing credentials for verify:matters-coding-detail');
}

writeFileSync(DIRTY_PROBE, 'unrelated Home Repost experiment — must not enter coding workspace');

try {
  const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
  const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);

  const addForm = await createIssue(
    member,
    citizen,
    `${PREFIX} Add Code form`,
    'Matter AI panel has a mobile layout defect.',
  );

  const scoped = await createIssue(member, citizen, `${PREFIX} Scope authorization`, 'Authorize Coding Agent on Civizen.');
  await assignCoding(
    citizen.client,
    scoped,
    citizen.profileId,
    'Implement overflow fix within authorized paths only.',
    [PANEL, TEST_FILE],
  );

  const dirtyMatter = await createIssue(member, citizen, `${PREFIX} Dirty worktree isolation`, 'Primary tree has unrelated dirty files.');
  const dirtyAssign = await assignCoding(
    citizen.client,
    dirtyMatter,
    citizen.profileId,
    'Inspect allowed files and propose an implementation plan.',
    [PANEL],
  );
  const planOut = runCoding(dirtyAssign.runId, 'plan');
  if (!existsSync(DIRTY_PROBE)) throw new Error('primary dirty probe was removed');
  const workspaceDir = `/tmp/civizen-coding-workspaces/run-${dirtyAssign.runId}-plan`;
  if (existsSync(resolve(workspaceDir, 'UNRELATED_DIRTY_PHASE4B1.txt'))) {
    throw new Error('isolated workspace included unrelated dirty files');
  }
  if (!planOut.includes('coding-agent plan OK')) throw new Error('plan runner did not succeed');

  const working = await createIssue(member, citizen, `${PREFIX} Agent working`, 'Coding Agent run in progress.');
  const workingAssign = await assignCoding(citizen.client, working, citizen.profileId, 'Modify authorized files.', [PANEL]);
  setRunStatus(workingAssign.runId, 'running');

  const awaiting = await createIssue(member, citizen, `${PREFIX} Code awaiting review`, 'Coding submission needs human review.');
  const awaitingAssign = await assignCoding(citizen.client, awaiting, citizen.profileId, 'Submit overflow fix.', [PANEL]);
  completeCodeChange(awaitingAssign.assignmentId, awaitingAssign.runId, codeChangeBody());

  const changes = await createIssue(member, citizen, `${PREFIX} Code changes requested`, 'Reviewer asked for a tighter overflow rule.');
  const changesAssign = await assignCoding(citizen.client, changes, citizen.profileId, 'Submit overflow fix.', [PANEL]);
  completeCodeChange(changesAssign.assignmentId, changesAssign.runId, codeChangeBody());
  await reviewAgent(citizen.client, changes, citizen.profileId, 'request_changes', 'Also hide overflow on nested cards.');

  const revised = await createIssue(member, citizen, `${PREFIX} Code revised submission`, 'Second coding run after changes requested.');
  const revisedAssign = await assignCoding(citizen.client, revised, citizen.profileId, 'Submit overflow fix.', [PANEL]);
  completeCodeChange(revisedAssign.assignmentId, revisedAssign.runId, codeChangeBody());
  await reviewAgent(citizen.client, revised, citizen.profileId, 'request_changes', 'Also hide overflow on nested cards.');
  const revisedBundle = await getMatter(citizen.client, revised);
  const revisedRun = (revisedBundle.agent_runs ?? []).find((row) => row.status === 'queued');
  if (!revisedRun?.id) throw new Error('expected queued coding revision run');
  completeCodeChange(
    revisedAssign.assignmentId,
    revisedRun.id,
    codeChangeBody({
      remaining_concerns: ['Not committed, pushed, or deployed', 'Revision 2 after human request'],
      tests: [{ name: TEST_FILE, result: 'PASS' }],
    }),
    'Coding Agent · AI revised submission',
  );

  const accepted = await createIssue(member, citizen, `${PREFIX} Code accepted`, 'Human accepted Coding Agent submission.');
  const acceptedAssign = await assignCoding(citizen.client, accepted, citizen.profileId, 'Submit overflow fix.', [PANEL]);
  completeCodeChange(acceptedAssign.assignmentId, acceptedAssign.runId, codeChangeBody());
  await reviewAgent(citizen.client, accepted, citizen.profileId, 'accept', 'Looks good as Task completion.');
  const acceptedAfter = await getMatter(citizen.client, accepted);
  if (acceptedAfter.matter?.lifecycle_status === 'closed') {
    throw new Error('accepting coding work closed the Matter');
  }

  const failed = await createIssue(member, citizen, `${PREFIX} Failed tests`, 'Targeted tests failed; revision required.');
  const failedAssign = await assignCoding(
    citizen.client,
    failed,
    citizen.profileId,
    'CIVIZEN_CODING_FORCE_TEST_FAILURE Implement overflow fix.',
    [PANEL],
  );
  applySql(`
    INSERT INTO public.matter_agent_artifacts (
      run_id, assignment_id, matter_id, artifact_type, title, body,
      review_status, generated_by_agent_id, verification_state
    ) VALUES (
      ${sqlLiteral(failedAssign.runId)},
      ${sqlLiteral(failedAssign.assignmentId)},
      ${sqlLiteral(failed)},
      'code_change',
      'Coding Agent · AI fallback output (tests failed)',
      ${sqlLiteral(codeChangeBody({
        tests: [{ name: TEST_FILE, result: 'FAIL', output: 'Forced failure for revision verification.' }],
        ready_for_human_commit: false,
      }))},
      'pending',
      'b0000000-0000-4000-8000-000000000006',
      'unverified'
    );
    SELECT public.fail_matter_agent_run_service(${sqlLiteral(failedAssign.runId)}::uuid, 'Targeted tests failed. Revision required.');
  `);

  const denied = await createIssue(member, citizen, `${PREFIX} Denied command`, 'git push must be denied.');
  const deniedAssign = await assignCoding(
    citizen.client,
    denied,
    citizen.profileId,
    'CIVIZEN_CODING_REQUEST_PUSH do not publish.',
    [PANEL],
  );
  setRunStatus(deniedAssign.runId, 'running');
  insertArtifact(
    deniedAssign.assignmentId,
    deniedAssign.runId,
    denied,
    'command_denial',
    'Additional command authorization required',
    JSON.stringify({ command: 'git push origin main', reason: 'git push is denied. Publication remains a human action.', allowed: false }),
  );

  const scope = await createIssue(member, citizen, `${PREFIX} Scope expansion`, 'matters-api.ts is outside authorized paths.');
  const scopeAssign = await assignCoding(
    citizen.client,
    scope,
    citizen.profileId,
    'CIVIZEN_CODING_REQUEST_MATTERS_API only panel is authorized.',
    [PANEL],
  );
  setRunStatus(scopeAssign.runId, 'waiting_for_human');
  insertArtifact(
    scopeAssign.assignmentId,
    scopeAssign.runId,
    scope,
    'scope_expansion_request',
    'Scope expansion required',
    JSON.stringify({
      path: 'src/lib/matters-api.ts',
      reason: 'Write denied by policy: src/lib/matters-api.ts',
      intended: 'Needed for this Task but not in the authorized path list.',
    }),
  );

  const secret = await createIssue(member, citizen, `${PREFIX} Secret denied`, '.env must not enter model context.');
  const secretAssign = await assignCoding(
    citizen.client,
    secret,
    citizen.profileId,
    'CIVIZEN_CODING_REQUEST_ENV do not read secrets.',
    [PANEL],
  );
  insertArtifact(
    secretAssign.assignmentId,
    secretAssign.runId,
    secret,
    'command_denial',
    'Secret path denied',
    JSON.stringify({ path: '.env', reason: 'Read denied by policy: .env', secret_value_included: false }),
  );

  const fixtures = [
    {
      id: addForm,
      slug: '01-add-code',
      as: 'citizen',
      section: 'ai',
      title: `${PREFIX} Add Code form`,
      openRoleSelect: true,
      expect: [/Add AI assistance/i, /Code/i],
    },
    {
      id: scoped,
      slug: '02-scope-auth',
      as: 'citizen',
      section: 'ai',
      title: `${PREFIX} Scope authorization`,
      expect: [/maturehumanity\/civizen/i, /MatterAgentPanel/i, /Assign Coding Agent|Coding Agent/i],
    },
    {
      id: dirtyMatter,
      slug: '03-plan-waiting',
      as: 'citizen',
      section: 'ai',
      title: `${PREFIX} Dirty worktree isolation`,
      expect: [/Proposed implementation|Implementation plan awaiting/i, /Approve and run/i],
    },
    {
      id: working,
      slug: '04-working',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Agent working`,
      expect: [/running|Waiting for the development Coding Agent runner/i],
    },
    {
      id: awaiting,
      slug: '05-files-tests',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Code awaiting review`,
      expect: [/Files changed|Test results|PASS/i],
    },
    {
      id: awaiting,
      slug: '06-awaiting-review',
      as: 'citizen',
      section: 'ai',
      title: `${PREFIX} Code awaiting review`,
      expect: [/Review AI submission|Accept completion/i],
    },
    {
      id: awaiting,
      slug: '07-diff',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Code awaiting review`,
      expect: [/Diff|Ready for human commit|Not committed or pushed/i],
    },
    {
      id: changes,
      slug: '08-changes-requested',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Code changes requested`,
      expect: [/changes requested/i],
    },
    {
      id: revised,
      slug: '09-revised',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Code revised submission`,
      expect: [/revised submission|Revision 2|awaiting review|Review AI submission/i],
    },
    {
      id: accepted,
      slug: '10-accepted',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Code accepted`,
      expect: [/completed|accepted/i],
      forbid: /Closed automatically/i,
    },
    {
      id: failed,
      slug: '11-failed-tests',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Failed tests`,
      expect: [/FAIL|failed|Retry/i],
    },
    {
      id: denied,
      slug: '12-denied-command',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Denied command`,
      expect: [/Command denied|git push origin main/i],
    },
    {
      id: scope,
      slug: '13-scope-expansion',
      as: 'citizen',
      section: 'ai',
      title: `${PREFIX} Scope expansion`,
      expect: [/Scope expansion required|matters-api\.ts|Authorize this path/i],
    },
    {
      id: dirtyMatter,
      slug: '14-dirty-isolation',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Dirty worktree isolation`,
      expect: [/Isolated from the primary working tree|unrelated local changes|Base commit/i],
    },
    {
      id: secret,
      slug: '15-secret-denied',
      as: 'member',
      section: 'ai',
      title: `${PREFIX} Secret denied`,
      expect: [/\.env|Secret path denied|Read denied/i],
      forbid: /super-secret-value|GEMINI_API_KEY=/i,
    },
  ];

  writeFileSync('/tmp/civizen-matters-coding-fixtures.json', JSON.stringify({
    fixtures: fixtures.map((fixture) => ({
      ...fixture,
      expect: fixture.expect.map((pattern) => pattern.source),
      forbid: fixture.forbid?.source,
    })),
    memberEmail: env.memberEmail,
    memberPassword: env.memberPassword,
    citizenEmail: env.citizenEmail,
    citizenPassword: env.citizenPassword,
  }));

  const ui = spawnSync('node', ['scripts/verify-matters-coding-detail-ui.mjs', baseUrl], { encoding: 'utf8' });
  if (ui.status !== 0) {
    throw new Error(ui.stderr || ui.stdout || 'verify-matters-coding-detail UI failed');
  }
  process.stdout.write(ui.stdout);
  console.log(`verify:matters-coding-detail OK ${baseUrl} (screenshots in ${outDir})`);
} finally {
  if (existsSync(DIRTY_PROBE)) unlinkSync(DIRTY_PROBE);
}
