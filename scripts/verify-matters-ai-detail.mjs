#!/usr/bin/env node
/**
 * Matter AI collaboration walks (Phase 4A) at 390px and 1280px — 18 dedicated states.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const outDir = '/tmp/civizen-matters-ai-detail';
mkdirSync(outDir, { recursive: true });

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp('^' + key + '=["\']?([^"\'\\n]+)', 'm'))?.[1]?.trim();
  const getLocal = (key) => {
    const raw = local.match(new RegExp('^' + key + '=(.+)$', 'm'))?.[1]?.trim();
    return raw?.replace(/^['"]|['"]$/g, '');
  };
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
  const file = '/tmp/civizen-matters-ai-detail-seed.sql';
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

async function assignAgent(client, matterId, roleType, instructions, supervisorId, taskTitle) {
  const { data, error } = await client.rpc('assign_matter_ai_agent', {
    payload: {
      matter_id: matterId,
      agent_role_type: roleType,
      instructions,
      supervising_profile_id: supervisorId,
      task_title: taskTitle,
    },
  });
  if (error || typeof data !== 'string') throw new Error(error?.message || 'assign failed');
  const bundle = await getMatter(client, matterId);
  const run = (bundle.agent_runs ?? []).find((row) => row.assignment_id === data);
  return { assignmentId: data, runId: run?.id };
}

function completeRun(assignmentId, runId, body, artifactType = 'research_summary', title = 'AI submission') {
  applySql(`
    SELECT public.matter_complete_agent_run_service(jsonb_build_object(
      'assignment_id', ${sqlLiteral(assignmentId)},
      'run_id', ${sqlLiteral(runId)},
      'artifact_type', ${sqlLiteral(artifactType)},
      'title', ${sqlLiteral(title)},
      'body', ${sqlLiteral(body)},
      'output_summary', ${sqlLiteral(body.slice(0, 400))}
    ));
  `);
}

function setRunStatus(runId, status) {
  applySql(`
    UPDATE public.ai_agent_runs
    SET status = ${sqlLiteral(status)},
        started_at = coalesce(started_at, now())
    WHERE id = ${sqlLiteral(runId)};
  `);
}

function failRun(assignmentId, runId, reason) {
  applySql(`
    UPDATE public.ai_agent_runs
    SET status = 'failed',
        failure_reason = ${sqlLiteral(reason)},
        finished_at = now()
    WHERE id = ${sqlLiteral(runId)};
    UPDATE public.matter_agent_assignments
    SET status = 'failed', updated_at = now()
    WHERE id = ${sqlLiteral(assignmentId)};
    INSERT INTO public.matter_events (matter_id, event_type, summary, actor_kind, is_system)
    SELECT ma.matter_id, 'ai_run_failed', a.display_name || ' run failed: ' || ${sqlLiteral(reason)},
           'ai_agent', true
    FROM public.matter_agent_assignments ma
    JOIN public.ai_agents a ON a.id = ma.agent_id
    WHERE ma.id = ${sqlLiteral(assignmentId)};
  `);
}

function proposePlan(assignmentId, plan) {
  applySql(`
    SELECT public.propose_matter_agent_plan(
      ${sqlLiteral(assignmentId)}::uuid,
      ${sqlLiteral(JSON.stringify(plan))}::jsonb
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

const env = loadEnv();
if (!env.url || !env.anon || !env.memberEmail || !env.citizenEmail) {
  throw new Error('Missing credentials for verify:matters-ai-detail');
}

const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);

const PREFIX = '[verify-matters-ai]';
const RESEARCH_TASK = 'Research applicable guidance and precedent';
const RESEARCH_BODY = [
  '## Research summary',
  'Matter evidence and Civizen guidance suggest explaining assessment reasoning with short rationale blocks.',
  '### Sources',
  '- Matter evidence (direct)',
  '- Civizen internal guidance (pattern)',
  '- External accessibility guidance (reference)',
].join('\n');

// 1. No AI assistance
const noAi = await createIssue(member, citizen, `${PREFIX} No AI assistance`, 'Simple Matter without AI agents.');

// 2. Add AI assistance form (work started, no assignment)
const addAiForm = await createIssue(member, citizen, `${PREFIX} Add AI form`, 'Responsible Lead can add AI assistance here.');

// 3–4. Queued research agent
const queued = await createIssue(member, citizen, `${PREFIX} Agent queued`, 'Research Agent assignment queued.');
const queuedAssign = await assignAgent(
  citizen.client,
  queued,
  'research',
  'Review Matter evidence and identify how systems explain assessment reasoning clearly.',
  citizen.profileId,
  RESEARCH_TASK,
);

// 5. Working
const working = await createIssue(member, citizen, `${PREFIX} Agent working`, 'Research Agent run in progress.');
const workingAssign = await assignAgent(
  citizen.client,
  working,
  'research',
  'Inspect available Matter evidence for assessment clarity patterns.',
  citizen.profileId,
  RESEARCH_TASK,
);
setRunStatus(workingAssign.runId, 'running');

// 6. Awaiting human review
const awaiting = await createIssue(member, citizen, `${PREFIX} Awaiting review`, 'Research submission needs human review.');
const awaitingAssign = await assignAgent(
  citizen.client,
  awaiting,
  'research',
  'Summarize how assessment reasoning can be explained clearly.',
  citizen.profileId,
  RESEARCH_TASK,
);
completeRun(awaitingAssign.assignmentId, awaitingAssign.runId, RESEARCH_BODY);

// 7. Changes requested
const changesRequested = await createIssue(member, citizen, `${PREFIX} Changes requested`, 'Reviewer asked for California-specific guidance.');
const changesAssign = await assignAgent(
  citizen.client,
  changesRequested,
  'research',
  'Research accessibility requirements for assessment UX.',
  citizen.profileId,
  RESEARCH_TASK,
);
completeRun(changesAssign.assignmentId, changesAssign.runId, RESEARCH_BODY);
await reviewAgent(
  citizen.client,
  changesRequested,
  citizen.profileId,
  'request_changes',
  'Add California-specific guidance and distinguish requirements from recommendations.',
);

// 8. Revised submission
const revised = await createIssue(member, citizen, `${PREFIX} Revised submission`, 'Second agent run after changes requested.');
const revisedAssign = await assignAgent(
  citizen.client,
  revised,
  'research',
  'Research accessibility requirements for assessment UX.',
  citizen.profileId,
  RESEARCH_TASK,
);
completeRun(revisedAssign.assignmentId, revisedAssign.runId, RESEARCH_BODY);
await reviewAgent(citizen.client, revised, citizen.profileId, 'request_changes', 'Add California-specific guidance.');
const revisedBundle = await getMatter(citizen.client, revised);
const revisedRun = (revisedBundle.agent_runs ?? []).find((row) => row.status === 'queued');
if (!revisedRun?.id) throw new Error('expected queued revision run');
completeRun(
  revisedAssign.assignmentId,
  revisedRun.id,
  `${RESEARCH_BODY}\n\n### California-specific\nDistinguish mandatory requirements from recommendations.`,
);

// 9. Accepted AI work
const accepted = await createIssue(member, citizen, `${PREFIX} Accepted AI work`, 'Human accepted Research Agent submission.');
const acceptedAssign = await assignAgent(
  citizen.client,
  accepted,
  'research',
  'Identify common ways systems explain assessment reasoning.',
  citizen.profileId,
  RESEARCH_TASK,
);
completeRun(acceptedAssign.assignmentId, acceptedAssign.runId, RESEARCH_BODY);
await reviewAgent(citizen.client, accepted, citizen.profileId, 'accept', 'Looks good.');

// 10. Failed agent run
const failed = await createIssue(member, citizen, `${PREFIX} Failed agent run`, 'Execution failed; supervisor can retry.');
const failedAssign = await assignAgent(
  citizen.client,
  failed,
  'research',
  'Attempt research that will fail in this fixture.',
  citizen.profileId,
  RESEARCH_TASK,
);
failRun(failedAssign.assignmentId, failedAssign.runId, 'Provider unavailable');

// 11. Multiple concurrent agents
const multi = await createIssue(
  member,
  citizen,
  `${PREFIX} Multiple AI agents`,
  'Research and Planning agents on the same Matter.',
);
await assignAgent(
  citizen.client,
  multi,
  'research',
  'Gather assessment clarity references.',
  citizen.profileId,
  RESEARCH_TASK,
);
await assignAgent(
  citizen.client,
  multi,
  'planning',
  'Propose Tasks to improve assessment workflow clarity.',
  citizen.profileId,
  'Propose resolution plan and Task structure',
);

// 12. Plan proposal
const planMatter = await createIssue(member, citizen, `${PREFIX} Plan proposal`, 'Planning Agent proposed Tasks.');
const planAssign = await assignAgent(
  citizen.client,
  planMatter,
  'planning',
  'Break work into Tasks with dependencies.',
  citizen.profileId,
  'Propose resolution plan and Task structure',
);
setRunStatus(planAssign.runId, 'running');
const planBody = JSON.stringify({
  title: 'Proposed resolution plan',
  tasks: [
    { title: 'Revise explanatory copy', dependsOn: [] },
    { title: 'Expose assessment reasoning', dependsOn: ['Revise explanatory copy'] },
    { title: 'Mobile verification', dependsOn: ['Expose assessment reasoning'] },
  ],
  risks: ['Missing mobile copy review'],
});
completeRun(planAssign.assignmentId, planAssign.runId, planBody, 'proposed_plan', 'Proposed resolution plan');

const planAdopted = await createIssue(member, citizen, `${PREFIX} Plan task adopted`, 'One proposed Task was adopted.');
const planAdoptedAssign = await assignAgent(
  citizen.client,
  planAdopted,
  'planning',
  'Propose Tasks for assessment clarity.',
  citizen.profileId,
  'Propose resolution plan and Task structure',
);
completeRun(
  planAdoptedAssign.assignmentId,
  planAdoptedAssign.runId,
  JSON.stringify({
    title: 'Proposed resolution plan',
    tasks: [{ title: 'Revise explanatory copy', description: 'Update assessment copy' }],
  }),
  'proposed_plan',
  'Proposed resolution plan',
);
const planAdoptedBundle = await getMatter(citizen.client, planAdopted);
const planArtifact = (planAdoptedBundle.agent_artifacts ?? []).find((row) => row.artifact_type === 'proposed_plan');
if (!planArtifact?.id) throw new Error('plan artifact missing for adoption fixture');
await citizen.client.rpc('adopt_matter_agent_plan_task', {
  p_artifact_id: planArtifact.id,
  p_title: 'Revise explanatory copy',
  p_description: 'Created from Planning Agent proposal.',
  p_depends_on_titles: [],
});

// 13. Facilitation summary
const facilitation = await createIssue(member, citizen, `${PREFIX} Facilitation summary`, 'Facilitation Agent summarized discussion.');
const facilitationAssign = await assignAgent(
  citizen.client,
  facilitation,
  'facilitation',
  'Summarize agreement, open questions, and possible Decisions.',
  citizen.profileId,
  'Facilitate discussion summary and open questions',
);
const facilitationBody = [
  '### Discussion summary',
  'Participants agree assessment clarity needs improvement.',
  '### Open questions',
  '- What evidence should users see first?',
  '### Points of agreement',
  '- Mobile copy is confusing',
  '### Points of disagreement',
  '- Whether to show raw scores',
  '### Possible Decisions requiring confirmation',
  '- Show rationale before final score',
  '### Suggested next actions',
  '- Draft revised copy',
].join('\n');
completeRun(
  facilitationAssign.assignmentId,
  facilitationAssign.runId,
  facilitationBody,
  'facilitation_summary',
  'Discussion facilitation',
);

const facilitationDecision = await createIssue(
  member,
  citizen,
  `${PREFIX} Decision promoted`,
  'Facilitation suggestion became a formal Decision.',
);
const facilitationDecisionAssign = await assignAgent(
  citizen.client,
  facilitationDecision,
  'facilitation',
  'Summarize discussion and suggest Decisions.',
  citizen.profileId,
  'Facilitate discussion summary and open questions',
);
const facilitationDecisionBody = [
  '### Discussion summary',
  'Team agrees assessment reasoning should be clearer.',
  '### Possible Decisions requiring confirmation',
  '- Show rationale before final score',
].join('\n');
completeRun(
  facilitationDecisionAssign.assignmentId,
  facilitationDecisionAssign.runId,
  facilitationDecisionBody,
  'facilitation_summary',
  'Discussion facilitation',
);
const facilitationBundle = await getMatter(citizen.client, facilitationDecision);
const facilitationArtifact = (facilitationBundle.agent_artifacts ?? []).find((row) => row.artifact_type === 'facilitation_summary');
if (!facilitationArtifact?.id) throw new Error('facilitation artifact missing');
await citizen.client.rpc('promote_agent_decision_suggestion', {
  p_artifact_id: facilitationArtifact.id,
  p_title: 'Show rationale before final score',
  p_statement: 'Expose assessment rationale to members before showing the final score.',
});

// 14. Activity chain (reuse accepted matter)
const activityMatter = accepted;

const fixtures = [
  {
    id: noAi,
    slug: '01-no-ai',
    as: 'member',
    title: `${PREFIX} No AI assistance`,
    expect: [/Collaborative work|Overview/i],
    forbid: /Research Agent · AI/i,
  },
  {
    id: addAiForm,
    slug: '02-add-ai-form',
    as: 'citizen',
    section: 'ai',
    title: `${PREFIX} Add AI form`,
    expect: [/Add AI assistance|Assign AI assistance/i],
  },
  {
    id: queued,
    slug: '03-ai-participant',
    as: 'member',
    section: 'overview',
    title: `${PREFIX} Agent queued`,
    expect: [/Research Agent · AI|Participants/i],
  },
  {
    id: queued,
    slug: '04-queued',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Agent queued`,
    expect: [/queued|Research Agent · AI/i],
  },
  {
    id: working,
    slug: '05-working',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Agent working`,
    expect: [/running|Research Agent · AI/i],
  },
  {
    id: awaiting,
    slug: '06-awaiting-review',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Awaiting review`,
    expect: [/awaiting review|Review AI submission|pending/i],
  },
  {
    id: changesRequested,
    slug: '07-changes-requested',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Changes requested`,
    expect: [/changes.requested|Request changes/i],
  },
  {
    id: revised,
    slug: '08-revised-submission',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Revised submission`,
    expect: [/California-specific|awaiting review|Review AI submission/i],
  },
  {
    id: accepted,
    slug: '09-accepted',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Accepted AI work`,
    expect: [/completed|accepted/i],
  },
  {
    id: failed,
    slug: '10-failed',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Failed agent run`,
    expect: [/failed|Retry/i],
  },
  {
    id: multi,
    slug: '11-multiple-agents',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Multiple AI agents`,
    expect: [/Research Agent · AI/i, /Planning Agent · AI/i],
  },
  {
    id: planMatter,
    slug: '12-plan-proposal',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Plan proposal`,
    expect: [/Proposed resolution plan|proposed_plan|Revise explanatory copy/i],
  },
  {
    id: facilitation,
    slug: '13-facilitation',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Facilitation summary`,
    expect: [/Open questions|Points of agreement|Possible Decisions/i],
  },
  {
    id: planMatter,
    slug: '15-plan-proposal',
    as: 'citizen',
    section: 'ai',
    title: `${PREFIX} Plan proposal`,
    expect: [/Proposed resolution plan|Create Task from proposal|Revise explanatory copy/i],
  },
  {
    id: planAdopted,
    slug: '16-plan-task-adopted',
    as: 'citizen',
    section: 'ai',
    title: `${PREFIX} Plan task adopted`,
    expect: [/Task created|Revise explanatory copy/i],
  },
  {
    id: facilitation,
    slug: '17-facilitation-suggestion',
    as: 'member',
    section: 'ai',
    title: `${PREFIX} Facilitation summary`,
    expect: [/Create Decision|Suggested Decisions|Open questions/i],
  },
  {
    id: facilitationDecision,
    slug: '18-decision-promoted',
    as: 'citizen',
    section: 'decisions',
    title: `${PREFIX} Decision promoted`,
    expect: [/Show rationale before final score|proposed/i],
  },
  {
    id: activityMatter,
    slug: '14-activity',
    as: 'member',
    section: 'activity',
    title: `${PREFIX} Accepted AI work`,
    expect: [/AI|assigned|accepted|Research Agent/i],
  },
];

writeFileSync('/tmp/civizen-matters-ai-fixtures.json', JSON.stringify({
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

const ui = spawnSync('node', ['scripts/verify-matters-ai-detail-ui.mjs', baseUrl], { encoding: 'utf8' });
if (ui.status !== 0) {
  throw new Error(ui.stderr || ui.stdout || 'verify-matters-ai-detail UI failed');
}
process.stdout.write(ui.stdout);
console.log(`verify:matters-ai-detail OK ${baseUrl} (screenshots in ${outDir})`);
