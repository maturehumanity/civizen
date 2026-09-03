#!/usr/bin/env npx tsx
/**
 * Development-host Coding Agent runner.
 * Never runs on the production VPS / Edge Runtime. Isolated git worktree only.
 * The model loop proposes tools; policy/runner remains the execution boundary.
 *
 * Usage:
 *   npx tsx scripts/matter-coding-agent-execute.ts --run-id <uuid> --stage plan|execute
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';

import { runCodingAgentLoop, serializeCodeChangeArtifact } from '../src/lib/matters-coding-agent-loop.ts';
import { resolveCodingAgentModel } from '../src/lib/matters-coding-gemini.ts';
import {
  CIVIZEN_REPO_SLUG,
  CODING_AGENT_ID,
  codingPolicyToJson,
  parseCodingPolicy,
  type CodingPolicy,
} from '../src/lib/matters-coding-policy.ts';
import { createIsolatedWorktree, gitHeadSha } from '../src/lib/matters-coding-runner.ts';

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src: string, key: string) => src.match(new RegExp('^' + key + '=["\']?([^"\'\\n]+)', 'm'))?.[1]?.trim();
  const getLocal = (key: string) => local.match(new RegExp('^' + key + '=(.+)$', 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  return {
    url: get(root, 'VITE_SUPABASE_URL'),
    anon: get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    citizenEmail: getLocal('TEST_USER_ROLE_CITIZEN_EMAIL'),
    citizenPassword: getLocal('TEST_USER_ROLE_CITIZEN_PASSWORD'),
    geminiKey: process.env.GEMINI_API_KEY || getLocal('GEMINI_API_KEY') || get(root, 'GEMINI_API_KEY'),
    geminiModel: process.env.GEMINI_MODEL || getLocal('GEMINI_MODEL') || get(root, 'GEMINI_MODEL'),
  };
}

function applySql(sql: string) {
  const file = '/tmp/civizen-coding-agent-runner.sql';
  writeFileSync(file, sql);
  const result = spawnSync('bash', ['scripts/db/apply-remote-migration.sh', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'SQL apply failed');
}

function sqlLiteral(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function session(url: string, anon: string, email: string, password: string) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return client;
}

function repoRoot(): string {
  return process.env.CIVIZEN_CODING_REPO_ROOT || resolve(process.cwd());
}

const runId = argValue('--run-id');
const stage = argValue('--stage') ?? 'plan';
if (!runId) {
  throw new Error('Usage: npx tsx scripts/matter-coding-agent-execute.ts --run-id <uuid> --stage plan|execute');
}
if (stage !== 'plan' && stage !== 'execute') throw new Error(`Unknown stage ${stage}`);

const env = loadEnv();
if (!env.url || !env.anon || !env.citizenEmail) throw new Error('Missing runner credentials');
const client = await session(env.url, env.anon, env.citizenEmail!, env.citizenPassword!);

const { data: authData, error: authError } = await client.rpc('authorize_matter_agent_run', { p_run_id: runId });
if (authError || !authData?.authorized) {
  throw new Error(authError?.message || 'Not authorized to run this Coding Agent');
}
if (authData.agent_id !== CODING_AGENT_ID && authData.role_type !== 'coding') {
  throw new Error('This runner only executes Coding Agent runs');
}

const { data: bundle, error: bundleError } = await client.rpc('get_matter', { p_matter_id: authData.matter_id });
if (bundleError) throw new Error(bundleError.message);
const assignment = (bundle.agent_assignments ?? []).find((row: { id: string }) => row.id === authData.assignment_id);
if (!assignment) throw new Error('Assignment missing');
const policy: CodingPolicy = parseCodingPolicy(assignment.coding_policy);
if (policy.repositorySlug !== CIVIZEN_REPO_SLUG) {
  throw new Error(`Repository ${policy.repositorySlug} is not mapped on this development runner`);
}
if (policy.allowedPaths.length === 0) {
  throw new Error('Coding assignment has no authorized paths.');
}

const runRow = (bundle.agent_runs ?? []).find((row: { id: string }) => row.id === runId);
const revisionNumber = Number(runRow?.revision_number ?? 1);
const requestedChanges = revisionNumber > 1 ? String(assignment.instructions ?? '') : null;
const approvedPlan = (bundle.agent_artifacts ?? []).find(
  (row: { artifact_type: string; review_status: string }) =>
    row.artifact_type === 'implementation_plan' && row.review_status === 'accepted',
)?.body ?? null;

const primary = repoRoot();
const baseSha = String(assignment.coding_policy?.base_commit_sha ?? gitHeadSha(primary));
const workspaces = '/tmp/civizen-coding-workspaces';
mkdirSync(workspaces, { recursive: true });
const workspace = createIsolatedWorktree(primary, workspaces, `${runId}-${stage}`, baseSha);

const { data: repos } = await client.from('coding_repositories').select('id').eq('slug', CIVIZEN_REPO_SLUG).maybeSingle();
const repositoryId = repos?.id ?? 'c0000000-0000-4000-8000-000000000001';

applySql(`
SELECT public.record_matter_coding_workspace(jsonb_build_object(
  'assignment_id', ${sqlLiteral(assignment.id)},
  'run_id', ${sqlLiteral(runId)},
  'matter_id', ${sqlLiteral(authData.matter_id)},
  'repository_id', ${sqlLiteral(repositoryId)},
  'base_commit_sha', ${sqlLiteral(workspace.baseCommitSha)},
  'workspace_ref', ${sqlLiteral(workspace.root)},
  'primary_dirty_summary', ${sqlLiteral(workspace.primaryDirtySummary.slice(0, 2000))},
  'status', 'active'
));
`);

const { data: workspaceRow } = await client
  .from('matter_coding_workspaces')
  .select('id')
  .eq('run_id', runId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
const workspaceId = workspaceRow?.id as string | undefined;

function logCommand(command: string, allowed: boolean, category: string, reason: string, exitCode: number | null, output: string) {
  if (!workspaceId) return;
  applySql(`
SELECT public.append_matter_coding_command_log(jsonb_build_object(
  'workspace_id', ${sqlLiteral(workspaceId)},
  'run_id', ${sqlLiteral(runId)},
  'command_text', ${sqlLiteral(command)},
  'allowed', ${allowed ? 'true' : 'false'},
  'category', ${sqlLiteral(category)},
  'reason', ${sqlLiteral(reason)},
  'exit_code', ${exitCode === null ? 'null' : String(exitCode)},
  'output_excerpt', ${sqlLiteral(output.slice(0, 1500))}
));
`);
}

function insertArtifact(type: string, title: string, body: string) {
  applySql(`
INSERT INTO public.matter_agent_artifacts (
  run_id, assignment_id, matter_id, artifact_type, title, body, source_references,
  review_status, generated_by_agent_id, verification_state
) VALUES (
  ${sqlLiteral(runId)},
  ${sqlLiteral(assignment.id)},
  ${sqlLiteral(authData.matter_id)},
  ${sqlLiteral(type)},
  ${sqlLiteral(title)},
  ${sqlLiteral(body)},
  '[]'::jsonb,
  'pending',
  ${sqlLiteral(CODING_AGENT_ID)},
  'unverified'
);
`);
}

const modelEnv = {
  ...process.env,
  GEMINI_API_KEY: env.geminiKey,
  GEMINI_MODEL: env.geminiModel,
};
const model = resolveCodingAgentModel({
  stage,
  instructions: String(assignment.instructions ?? ''),
  env: modelEnv,
});
const loop = await runCodingAgentLoop({
  stage,
  workspace,
  policy,
  model,
  task: {
    instructions: String(assignment.instructions ?? ''),
    matterTitle: bundle.matter?.title,
    matterDescription: bundle.matter?.description,
    approvedPlan,
    requestedChanges,
    revisionNumber,
  },
});

for (const command of loop.commands) {
  const trace = loop.toolTrace.find((row) => row.name === 'run_command' && String(row.arguments.command) === command.command);
  logCommand(
    command.command,
    command.allowed,
    command.category,
    trace?.reason ?? (command.allowed ? 'allowlisted' : 'denied'),
    command.exitCode ?? null,
    trace?.outputExcerpt ?? '',
  );
}
for (const denial of loop.denials.filter((row) => row.kind === 'command')) {
  insertArtifact('command_denial', 'Additional command authorization required', JSON.stringify({
    command: denial.detail,
    reason: denial.reason,
    allowed: false,
  }));
}
for (const denial of loop.denials.filter((row) => row.kind === 'path' && /\.env|secret|denied/i.test(row.reason))) {
  insertArtifact('command_denial', 'Secret path denied', JSON.stringify({
    path: denial.detail,
    reason: denial.reason,
    secret_value_included: false,
  }));
}
for (const request of loop.scopeRequests) {
  insertArtifact('scope_expansion_request', 'Scope expansion required', JSON.stringify(request));
}

const usage = {
  stage: stage === 'plan' ? 'planning' : 'execute',
  execution_host: 'development_worktree',
  base_commit_sha: workspace.baseCommitSha,
  execution_mode: loop.executionMode,
  provider: loop.provider,
  model: loop.modelRef,
  model_driven: true,
  workspace_ref: workspace.root,
};

if (stage === 'plan') {
  const plan = loop.plan ?? {
    title: 'Proposed implementation',
    steps: ['Inspect authorized files'],
    files: loop.inspectedFiles,
    tests: policy.requiredGates,
    concerns: loop.remainingConcerns,
  };
  applySql(`
UPDATE public.ai_agent_runs
SET status = 'waiting_for_human',
    started_at = coalesce(started_at, now()),
    output_summary = ${sqlLiteral('Implementation plan awaiting human approval.')},
    usage_metadata = coalesce(usage_metadata, '{}'::jsonb) || ${sqlLiteral(JSON.stringify(usage))}::jsonb
WHERE id = ${sqlLiteral(runId)};
INSERT INTO public.matter_agent_artifacts (
  run_id, assignment_id, matter_id, artifact_type, title, body, source_references,
  review_status, generated_by_agent_id, verification_state
) VALUES (
  ${sqlLiteral(runId)},
  ${sqlLiteral(assignment.id)},
  ${sqlLiteral(authData.matter_id)},
  'implementation_plan',
  ${sqlLiteral(plan.title)},
  ${sqlLiteral(JSON.stringify(plan, null, 2))},
  ${sqlLiteral(JSON.stringify(loop.inspectedFiles.map((file) => ({ kind: 'workspace_file', label: file }))))}::jsonb,
  'pending',
  ${sqlLiteral(CODING_AGENT_ID)},
  'unverified'
);
UPDATE public.matter_agent_assignments SET status = 'awaiting_review', updated_at = now() WHERE id = ${sqlLiteral(assignment.id)};
`);
  applySql(`
SELECT public.add_matter_ai_comment(
  ${sqlLiteral(assignment.id)}::uuid,
  ${sqlLiteral('Implementation plan submitted.')},
  ${sqlLiteral(runId)}::uuid
);
`);
  console.log(`coding-agent plan OK run=${runId} base=${workspace.baseCommitSha} mode=${loop.executionMode}`);
  process.exit(0);
}

const artifact = {
  ...serializeCodeChangeArtifact(loop),
  policy: codingPolicyToJson(policy),
};

if (loop.testsFailed) {
  insertArtifact('code_change', `Coding Agent · AI ${loop.executionMode === 'provider' ? 'submission' : 'fallback output'} (tests failed)`, JSON.stringify(artifact, null, 2));
  applySql(`SELECT public.fail_matter_agent_run_service(${sqlLiteral(runId)}::uuid, 'Targeted tests failed. Revision required.');`);
  console.log(`coding-agent execute FAILED run=${runId} mode=${loop.executionMode}`);
  process.exit(0);
}

applySql(`
SELECT public.matter_complete_agent_run_service(jsonb_build_object(
  'assignment_id', ${sqlLiteral(assignment.id)},
  'run_id', ${sqlLiteral(runId)},
  'artifact_type', 'code_change',
  'title', ${sqlLiteral(`Coding Agent · AI ${loop.executionMode === 'provider' ? 'submission' : 'fallback output'}`)},
  'body', ${sqlLiteral(JSON.stringify(artifact, null, 2))},
  'output_summary', ${sqlLiteral(`${loop.changedFiles.length} files changed. Targeted tests ${loop.tests[0]?.result ?? 'NOT RUN'}. Ready for human commit (not pushed).`)},
  'comment_body', ${sqlLiteral(`Implementation submitted for review.\n${loop.changedFiles.length} files changed.\nTargeted tests ${loop.tests[0]?.result ?? 'NOT RUN'}.`)},
  'usage_metadata', ${sqlLiteral(JSON.stringify(usage))}::jsonb
));
`);
console.log(`coding-agent execute OK run=${runId} files=${loop.changedFiles.length} mode=${loop.executionMode}`);
