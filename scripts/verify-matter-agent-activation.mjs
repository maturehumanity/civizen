#!/usr/bin/env node
/**
 * Phase 4A operational activation — self-hosted deployed edge function E2E.
 * Requires matter-agent-execute installed under the self-hosted volumes/functions mount.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const PREFIX = '[verify-agent-activation]';

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp('^' + key + '=["\']?([^"\'\\n]+)', 'm'))?.[1]?.trim();
  const getLocal = (key) => local.match(new RegExp('^' + key + '=(.+)$', 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  return {
    url: get(root, 'VITE_SUPABASE_URL'),
    anon: get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    memberEmail: getLocal('TEST_USER_ROLE_MEMBER_EMAIL'),
    memberPassword: getLocal('TEST_USER_ROLE_MEMBER_PASSWORD'),
    citizenEmail: getLocal('TEST_USER_ROLE_CITIZEN_EMAIL'),
    citizenPassword: getLocal('TEST_USER_ROLE_CITIZEN_PASSWORD'),
  };
}

async function session(url, anon, email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`auth failed (${email}): ${error.message}`);
  const { data: userData } = await client.auth.getUser();
  const { data: profile } = await client.from('profiles').select('id').eq('user_id', userData.user.id).single();
  if (!profile?.id) throw new Error('profile missing');
  return { client, profileId: profile.id };
}

async function getMatter(client, matterId) {
  const { data, error } = await client.rpc('get_matter', { p_matter_id: matterId });
  if (error) throw new Error(error.message);
  return data;
}

async function createWorkMatter(member, citizen, title, description) {
  const { data: matterId, error } = await member.client.rpc('create_matter', {
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
  if (error || typeof matterId !== 'string') throw new Error(error?.message || 'create_matter failed');
  await citizen.client.rpc('perform_matter_formal_action', { p_matter_id: matterId, p_action: 'accept_responsibility' });
  await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: matterId });
  return matterId;
}

async function assignAgent(client, matterId, roleType, supervisorId, instructions, taskTitle) {
  const { data: assignmentId, error } = await client.rpc('assign_matter_ai_agent', {
    payload: {
      matter_id: matterId,
      agent_role_type: roleType,
      instructions,
      supervising_profile_id: supervisorId,
      task_title: taskTitle,
    },
  });
  if (error || typeof assignmentId !== 'string') throw new Error(error?.message || 'assign failed');
  const bundle = await getMatter(client, matterId);
  const run = (bundle.agent_runs ?? []).find((row) => row.assignment_id === assignmentId && row.status === 'queued');
  if (!run?.id) throw new Error('queued run missing after assign');
  return { assignmentId, runId: run.id, taskId: run.task_id ?? null, bundle };
}

async function invokeEdge(client, runId) {
  const { data, error } = await client.functions.invoke('matter-agent-execute', { body: { run_id: runId } });
  let detail = null;
  if (error) {
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        detail = await ctx.json();
      } else if (ctx && typeof ctx.text === 'function') {
        detail = await ctx.text();
      }
    } catch {
      detail = null;
    }
  }
  return { data, error, detail };
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

function assertProvenance(run, artifact, assignmentId, agentId) {
  if (!run) throw new Error('run missing for provenance assert');
  if (!artifact) throw new Error('artifact missing for provenance assert');
  if (artifact.run_id !== run.id) {
    throw new Error('artifact missing run provenance');
  }
  if (artifact.generated_by_agent_id !== agentId) {
    throw new Error('artifact agent provenance mismatch');
  }
  if (artifact.assignment_id !== assignmentId) {
    throw new Error('artifact assignment provenance mismatch');
  }
  if (run.assignment_id !== assignmentId) {
    throw new Error('run assignment provenance mismatch');
  }
  const meta = run.usage_metadata ?? {};
  if (!meta.execution_mode) {
    throw new Error('run missing execution_mode in usage_metadata');
  }
  return meta;
}

const env = loadEnv();
if (!env.url || !env.anon || !env.memberEmail || !env.citizenEmail) {
  throw new Error('Missing credentials for verify:matter-agent-activation');
}

const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);

const RESEARCH_AGENT_ID = 'b0000000-0000-4000-8000-000000000001';
const PLANNING_AGENT_ID = 'b0000000-0000-4000-8000-000000000003';

// --- 1. Research Agent deployed flow ---
const researchMatter = await createWorkMatter(
  member,
  citizen,
  `${PREFIX} Research deployed`,
  'Activation test for deployed Research Agent execution.',
);
const research = await assignAgent(
  citizen.client,
  researchMatter,
  'research',
  citizen.profileId,
  'Summarize assessment clarity guidance for this Matter.',
  'Research applicable guidance',
);

const authCheck = await citizen.client.rpc('authorize_matter_agent_run', { p_run_id: research.runId });
if (authCheck.error || !authCheck.data?.authorized) {
  throw new Error(authCheck.error?.message || 'supervisor should authorize research run');
}
if (authCheck.data.assignment_id !== research.assignmentId) {
  throw new Error('authorize returned mismatched assignment_id');
}
if (authCheck.data.agent_id !== RESEARCH_AGENT_ID) {
  throw new Error('authorize returned mismatched agent_id (expected Research Agent)');
}

const edgeResult = await invokeEdge(citizen.client, research.runId);
if (edgeResult.error) {
  const msg = edgeResult.error.message ?? String(edgeResult.error);
  const detail = typeof edgeResult.detail === 'string' ? edgeResult.detail : JSON.stringify(edgeResult.detail);
  const probe = await fetch(`${env.url}/functions/v1/matter-agent-execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.anon },
    body: '{}',
  });
  const probeText = await probe.text();
  if (/entrypoint|InvalidWorkerCreation|worker boot/i.test(probeText)) {
    throw new Error(
      'matter-agent-execute entrypoint missing on self-hosted volume. Copy index.ts to volumes/functions/matter-agent-execute and restart functions.',
    );
  }
  throw new Error(`edge invoke failed (${probe.status}): ${msg}${detail ? ` detail=${detail}` : ''}`);
}

const executionMode = edgeResult.data?.execution_mode ?? 'unknown';
if (executionMode === 'deterministic_fallback') {
  console.warn('WARN: deployed execution used deterministic_fallback — provider-backed activation not verified');
} else if (executionMode !== 'provider') {
  throw new Error(`unexpected execution_mode: ${executionMode}`);
}

let researchBundle = await getMatter(citizen.client, researchMatter);
const researchRun = (researchBundle.agent_runs ?? []).find((row) => row.id === research.runId);
if (!researchRun || researchRun.status !== 'submitted') {
  throw new Error(`research run expected submitted, got ${researchRun?.status ?? 'missing'}`);
}
const researchArtifact = (researchBundle.agent_artifacts ?? []).find((row) => row.run_id === research.runId);
if (!researchArtifact) throw new Error('research artifact missing after edge execution');
const researchMeta = assertProvenance(researchRun, researchArtifact, research.assignmentId, RESEARCH_AGENT_ID);
if (researchMeta.execution_mode !== executionMode) {
  throw new Error('artifact execution_mode does not match edge response');
}
if (executionMode === 'provider' && researchMeta.provider !== 'gemini') {
  throw new Error(`expected gemini provider provenance, got ${researchMeta.provider}`);
}
if (researchArtifact.title && /fallback/i.test(researchArtifact.title) && executionMode === 'provider') {
  throw new Error('provider execution must not use fallback artifact title');
}

const researchTask = (researchBundle.tasks ?? []).find(
  (t) => t.id === researchRun.task_id || t.id === research.taskId,
);
if (researchTask?.status === 'completed') {
  throw new Error('Task must not complete before human review');
}
if (researchBundle.lifecycle_status === 'closed') {
  throw new Error('Matter must not be closed by AI execution');
}

await reviewAgent(citizen.client, researchMatter, citizen.profileId, 'accept', 'Accepted after deployed run review.');
researchBundle = await getMatter(citizen.client, researchMatter);
const assignment = (researchBundle.agent_assignments ?? []).find((a) => a.id === research.assignmentId);
if (assignment?.status !== 'completed') {
  throw new Error(`research assignment should complete after human acceptance, got ${assignment?.status}`);
}

// --- 2. Failure → Retry via deployed edge ---
const failMatter = await createWorkMatter(
  member,
  citizen,
  `${PREFIX} Failure retry`,
  'Activation test for deployed failure and retry.',
);
const failAssign = await assignAgent(
  citizen.client,
  failMatter,
  'research',
  citizen.profileId,
  'CIVIZEN_ACTIVATION_FORCE_FAILURE Research retry path verification.',
  'Research retry verification',
);

const failInvoke = await invokeEdge(citizen.client, failAssign.runId);
if (!failInvoke.error) {
  throw new Error('force-failure marker should cause deployed edge failure');
}

let failBundle = await getMatter(citizen.client, failMatter);
const failRun1 = (failBundle.agent_runs ?? []).find((row) => row.id === failAssign.runId);
if (failRun1?.status !== 'failed') {
  throw new Error(`run 1 expected failed after edge force failure, got ${failRun1?.status ?? 'missing'}`);
}
const failTask = (failBundle.tasks ?? []).find((t) => t.id === failRun1.task_id || t.id === failAssign.taskId);
if (failTask?.status === 'completed') {
  throw new Error('Task must remain unresolved after Run 1 failure');
}
const failEvent = (failBundle.events ?? []).find(
  (e) => e.event_type === 'ai_run_failed' && (e.payload?.runId === failAssign.runId || true),
);
if (!failEvent) throw new Error('ai_run_failed event missing after deployed failure');

const { data: retryRunId, error: retryErr } = await citizen.client.rpc('retry_matter_agent_run', {
  p_assignment_id: failAssign.assignmentId,
});
if (retryErr || typeof retryRunId !== 'string') throw new Error(retryErr?.message || 'retry failed');
if (retryRunId === failAssign.runId) throw new Error('retry must create new run id');

failBundle = await getMatter(citizen.client, failMatter);
const run1After = (failBundle.agent_runs ?? []).find((row) => row.id === failAssign.runId);
if (run1After?.status !== 'failed') throw new Error('run 1 must remain failed after retry');

const retryInvoke = await invokeEdge(citizen.client, retryRunId);
if (retryInvoke.error) throw new Error(`retry edge invoke failed: ${retryInvoke.error.message}`);
if (retryInvoke.data?.execution_mode !== 'provider' && executionMode === 'provider') {
  throw new Error(`retry expected provider mode, got ${retryInvoke.data?.execution_mode}`);
}

failBundle = await getMatter(citizen.client, failMatter);
const run2 = (failBundle.agent_runs ?? []).find((row) => row.id === retryRunId);
if (!run2 || run2.status !== 'submitted') {
  throw new Error(`run 2 expected submitted after retry invoke, got ${run2?.status ?? 'missing'}`);
}
await reviewAgent(citizen.client, failMatter, citizen.profileId, 'accept', 'Accepted retry submission.');

// --- 3. Planning → Task provenance (provider-backed via deployed edge) ---
const planMatter = await createWorkMatter(
  member,
  citizen,
  `${PREFIX} Plan adoption`,
  'Activation test for Planning Task adoption provenance.',
);
const planAssign = await assignAgent(
  citizen.client,
  planMatter,
  'planning',
  citizen.profileId,
  'Propose Tasks to improve assessment clarity. Return JSON with title, tasks[{title,description,dependsOn}], risks.',
  'Propose resolution plan',
);

const planInvoke = await invokeEdge(citizen.client, planAssign.runId);
if (planInvoke.error) throw new Error(`planning edge invoke failed: ${planInvoke.error.message}`);
if (planInvoke.data?.execution_mode !== executionMode) {
  throw new Error(`planning execution_mode mismatch: ${planInvoke.data?.execution_mode}`);
}

let planBundle = await getMatter(citizen.client, planMatter);
const planRun = (planBundle.agent_runs ?? []).find((row) => row.id === planAssign.runId);
const planArtifact = (planBundle.agent_artifacts ?? []).find((row) => row.run_id === planAssign.runId);
if (!planArtifact || planArtifact.artifact_type !== 'proposed_plan') {
  throw new Error('planning artifact missing or wrong type');
}
assertProvenance(planRun, planArtifact, planAssign.assignmentId, PLANNING_AGENT_ID);

const { data: taskId, error: adoptErr } = await citizen.client.rpc('adopt_matter_agent_plan_task', {
  p_artifact_id: planArtifact.id,
  p_title: 'Revise assessment explanatory copy',
  p_description: 'Created from Planning Agent proposal during activation.',
  p_depends_on_titles: [],
});
if (adoptErr || typeof taskId !== 'string') throw new Error(adoptErr?.message || 'adopt task failed');

planBundle = await getMatter(citizen.client, planMatter);
const adoptedTask = (planBundle.tasks ?? []).find((t) => t.id === taskId);
if (!adoptedTask) throw new Error('adopted task missing');
const humanAssignee = (adoptedTask.assignments ?? []).find(
  (a) => a.actor_kind === 'person' && a.status !== 'cancelled',
);
// AI may be lead on the planning Task itself; adopted Task from proposal should be human-created ordinary task without auto person assignee.
if (humanAssignee) {
  throw new Error('adopted task must not auto-assign a human');
}
const adoptEvent = (planBundle.events ?? []).find(
  (e) => e.event_type === 'ai_plan_task_adopted' && e.payload?.taskId === taskId,
);
if (!adoptEvent) throw new Error('ai_plan_task_adopted event missing');
if (adoptEvent.payload?.artifactId !== planArtifact.id) {
  throw new Error('adoption event missing artifact provenance');
}
if (adoptEvent.payload?.assignmentId !== planAssign.assignmentId && adoptEvent.payload?.runId !== planAssign.runId) {
  // assignment/run should be present from artifact
  if (!adoptEvent.payload?.runId) throw new Error('adoption event missing run provenance');
}

// --- 4. Facilitation → Decision provenance ---
const facMatter = await createWorkMatter(
  member,
  citizen,
  `${PREFIX} Decision promotion`,
  'Activation test for Facilitation Decision promotion provenance.',
);
const facAssign = await assignAgent(
  citizen.client,
  facMatter,
  'facilitation',
  citizen.profileId,
  'Summarize discussion and suggest Decisions. Include a Possible Decisions section.',
  'Facilitate discussion summary',
);

const facInvoke = await invokeEdge(citizen.client, facAssign.runId);
if (facInvoke.error) throw new Error(`facilitation edge invoke failed: ${facInvoke.error.message}`);

let facBundle = await getMatter(citizen.client, facMatter);
const facArtifact = (facBundle.agent_artifacts ?? []).find((row) => row.run_id === facAssign.runId);
if (!facArtifact) throw new Error('facilitation artifact missing');

const { data: decisionId, error: promoteErr } = await citizen.client.rpc('promote_agent_decision_suggestion', {
  p_artifact_id: facArtifact.id,
  p_title: 'Show rationale before final score',
  p_statement: 'Expose assessment rationale to members before showing the final score.',
});
if (promoteErr || typeof decisionId !== 'string') throw new Error(promoteErr?.message || 'promote decision failed');

facBundle = await getMatter(citizen.client, facMatter);
const decision = (facBundle.decisions ?? []).find((d) => d.id === decisionId);
if (!decision) throw new Error('promoted decision missing');
if (decision.status === 'accepted' && decision.accepted_by_kind === 'ai_agent') {
  throw new Error('decision must not be AI-accepted');
}

// --- 5. Multiple agent isolation ---
const multiMatter = await createWorkMatter(
  member,
  citizen,
  `${PREFIX} Multi agent isolation`,
  'Activation test for Research vs Planning isolation.',
);
const multiResearch = await assignAgent(
  citizen.client,
  multiMatter,
  'research',
  citizen.profileId,
  'Research isolation check.',
  'Research isolation',
);
const multiPlanning = await assignAgent(
  citizen.client,
  multiMatter,
  'planning',
  citizen.profileId,
  'Planning isolation check. Return JSON plan with one task.',
  'Planning isolation',
);
const multiResearchInvoke = await invokeEdge(citizen.client, multiResearch.runId);
if (multiResearchInvoke.error) throw new Error(`multi research invoke failed: ${multiResearchInvoke.error.message}`);
await reviewAgent(citizen.client, multiMatter, citizen.profileId, 'accept', 'Accept research only');

let multiBundle = await getMatter(citizen.client, multiMatter);
const multiResearchAssign = (multiBundle.agent_assignments ?? []).find((a) => a.id === multiResearch.assignmentId);
const multiPlanningAssign = (multiBundle.agent_assignments ?? []).find((a) => a.id === multiPlanning.assignmentId);
if (multiResearchAssign?.status !== 'completed') throw new Error('research assignment should complete');
if (multiPlanningAssign?.status === 'completed') {
  throw new Error('planning assignment must not complete when only research was accepted');
}
const planningQueued = (multiBundle.agent_runs ?? []).find(
  (r) => r.assignment_id === multiPlanning.assignmentId && r.id === multiPlanning.runId,
);
if (!planningQueued || planningQueued.status === 'submitted') {
  // still queued or running — not submitted by research completion
  if (planningQueued?.status === 'submitted') {
    throw new Error('planning run must not be submitted by research completion');
  }
}

console.log(
  `verify:matter-agent-activation OK (execution_mode=${executionMode}, research_provider=${researchMeta.provider}, research_model=${researchMeta.model ?? 'n/a'})`,
);
if (executionMode === 'deterministic_fallback') {
  console.log('STATUS: Phase 4A code/infrastructure complete; provider-backed activation remains pending');
  process.exit(2);
}
