#!/usr/bin/env node
/**
 * Negative Matter authorization: impersonation and unauthorized access/action.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) => src.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'))?.[1]?.trim();
  const getLocal = (key) => local.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
  const url = get(root, 'VITE_SUPABASE_URL');
  const anon = get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  const memberEmail = getLocal('TEST_USER_ROLE_MEMBER_EMAIL');
  const memberPassword = getLocal('TEST_USER_ROLE_MEMBER_PASSWORD');
  const citizenEmail = getLocal('TEST_USER_ROLE_CITIZEN_EMAIL');
  const citizenPassword = getLocal('TEST_USER_ROLE_CITIZEN_PASSWORD');
  const strangerEmail = getLocal('TEST_USER_ROLE_VERIFIED_MEMBER_EMAIL');
  const strangerPassword = getLocal('TEST_USER_ROLE_VERIFIED_MEMBER_PASSWORD');
  if (!url || !anon || !memberEmail || !memberPassword || !citizenEmail || !citizenPassword || !strangerEmail || !strangerPassword) {
    throw new Error('Missing Supabase or test-user credentials for verify:matters-auth');
  }
  return { url, anon, memberEmail, memberPassword, citizenEmail, citizenPassword, strangerEmail, strangerPassword };
}

async function session(url, anon, email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`auth failed for ${email}: ${error.message}`);
  const { data: userData } = await client.auth.getUser();
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();
  if (profileError || !profile?.id) throw new Error(`profile missing for ${email}`);
  return { client, profileId: profile.id };
}

function expectError(error, label) {
  if (!error) throw new Error(`expected failure: ${label}`);
}

const env = loadEnv();
const member = await session(env.url, env.anon, env.memberEmail, env.memberPassword);
const citizen = await session(env.url, env.anon, env.citizenEmail, env.citizenPassword);
const stranger = await session(env.url, env.anon, env.strangerEmail, env.strangerPassword);

const { data: matterId, error: createError } = await member.client.rpc('create_matter', {
  payload: {
    title: '[verify-matters-auth] private question',
    description: 'Authorization fixture. Not a public Matter.',
    matter_type: 'question',
    initiator_kind: 'person',
    initiator_profile_id: member.profileId,
    addressee_kind: 'person',
    addressee_profile_id: citizen.profileId,
    visibility: 'participants',
    submit: true,
  },
});
if (createError || typeof matterId !== 'string') {
  throw new Error(`create_matter: ${createError?.message || 'missing id'}`);
}

const impersonate = await stranger.client.rpc('create_matter', {
  payload: {
    title: '[verify-matters-auth] impersonation',
    description: 'Should fail because initiator is another person.',
    matter_type: 'question',
    initiator_kind: 'person',
    initiator_profile_id: member.profileId,
    addressee_kind: 'person',
    addressee_profile_id: citizen.profileId,
    visibility: 'participants',
    submit: true,
  },
});
expectError(impersonate.error, 'stranger creating as member');

const { data: leaked } = await stranger.client.rpc('get_matter', { p_matter_id: matterId });
if (leaked) throw new Error('stranger must not read a participants Matter');

const { error: strangerComment } = await stranger.client.rpc('add_matter_comment', {
  p_matter_id: matterId,
  p_body: 'I should not be able to comment.',
});
expectError(strangerComment, 'stranger comment');

const { error: strangerAction } = await stranger.client.rpc('perform_matter_formal_action', {
  p_matter_id: matterId,
  p_action: 'respond',
  p_message: 'Impersonated answer',
  p_actor_kind: 'person',
});
expectError(strangerAction, 'stranger formal action');

const { error: memberAsCitizen } = await member.client.rpc('perform_matter_formal_action', {
  p_matter_id: matterId,
  p_action: 'respond',
  p_message: 'Member is not the assigned recipient.',
});
expectError(memberAsCitizen, 'initiator completing recipient action');

const { error: timeoutAsUser } = await member.client.rpc('process_matter_action_timeouts');
expectError(timeoutAsUser, 'authenticated timeout processor');

const { error: commentOk } = await citizen.client.rpc('add_matter_comment', {
  p_matter_id: matterId,
  p_body: 'Interim discussion. This is not a final answer.',
});
if (commentOk) throw new Error(`assigned party should be able to comment: ${commentOk.message}`);

const { data: afterComment } = await member.client.rpc('get_matter', { p_matter_id: matterId });
const current = afterComment?.current_action;
if (!current || current.status !== 'pending' || current.completion_action) {
  throw new Error('comment must leave the action requirement pending');
}

const { data: workId, error: workCreateError } = await member.client.rpc('create_matter', {
  payload: {
    title: '[verify-matters-auth] collaborative work',
    description: 'Authorization fixture for collaborative Tasks.',
    matter_type: 'issue',
    initiator_kind: 'person',
    initiator_profile_id: member.profileId,
    addressee_kind: 'person',
    addressee_profile_id: citizen.profileId,
    visibility: 'participants',
    submit: true,
  },
});
if (workCreateError || typeof workId !== 'string') {
  throw new Error(`create collaborative Matter: ${workCreateError?.message || 'missing id'}`);
}

const { error: acceptResp } = await citizen.client.rpc('perform_matter_formal_action', {
  p_matter_id: workId,
  p_action: 'accept_responsibility',
});
if (acceptResp) throw new Error(`accept_responsibility: ${acceptResp.message}`);

const { error: startWork } = await citizen.client.rpc('start_matter_collaborative_work', { p_matter_id: workId });
if (startWork) throw new Error(`start_matter_collaborative_work: ${startWork.message}`);

const { data: taskId, error: taskError } = await citizen.client.rpc('create_collaboration_task', {
  payload: {
    matter_id: workId,
    title: 'UX investigation',
    assignee_kind: 'person',
    assignee_profile_id: member.profileId,
    review_required: true,
  },
});
if (taskError || typeof taskId !== 'string') {
  throw new Error(`create_collaboration_task: ${taskError?.message || 'missing id'}`);
}

expectError(
  (await stranger.client.rpc('start_matter_collaborative_work', { p_matter_id: workId })).error,
  'stranger start work',
);
expectError(
  (await stranger.client.rpc('create_collaboration_task', {
    payload: { matter_id: workId, title: 'Unauthorized task' },
  })).error,
  'stranger create task',
);
expectError(
  (await stranger.client.rpc('propose_matter_decision', {
    payload: { matter_id: workId, title: 'Unauthorized decision', statement: 'Should not be recorded.' },
  })).error,
  'stranger propose decision',
);
expectError(
  (await stranger.client.rpc('complete_matter_collaborative_work', { p_matter_id: workId })).error,
  'stranger complete work',
);
expectError(
  (await stranger.client.rpc('invite_matter_participant', {
    p_matter_id: workId,
    p_role: 'contributor',
    p_kind: 'person',
    p_profile_id: stranger.profileId,
  })).error,
  'stranger invite',
);

const { error: requestShared } = await citizen.client.rpc('invite_matter_participant', {
  p_matter_id: workId,
  p_role: 'responsible_collaborator',
  p_kind: 'person',
  p_profile_id: member.profileId,
});
if (requestShared) throw new Error(`request shared responsibility: ${requestShared.message}`);
const { data: afterShared } = await citizen.client.rpc('get_matter', { p_matter_id: workId });
const sharedRow = (afterShared?.responsibilities ?? []).find(
  (row) => row.kind === 'collaborator' && row.actor_profile_id === member.profileId,
);
if (!sharedRow || sharedRow.status !== 'proposed') {
  throw new Error('requested collaborator must not yet be formally responsible');
}
const sharedAction = (afterShared?.pending_actions ?? []).find(
  (row) => row.action_type === 'shared_responsibility_response' && row.assigned_profile_id === member.profileId,
);
if (!sharedAction?.id) throw new Error('expected shared responsibility action');
expectError(
  (await stranger.client.rpc('perform_collaboration_action', {
    p_action_id: sharedAction.id,
    p_action: 'accept',
  })).error,
  'stranger accept shared responsibility',
);

const { data: workRow } = await citizen.client.rpc('get_matter', { p_matter_id: workId });
const acceptAction = (workRow?.pending_actions ?? []).find((row) => row.action_type === 'accept_task');
if (!acceptAction?.id) throw new Error('expected Task acceptance action');
expectError(
  (await stranger.client.rpc('perform_collaboration_action', {
    p_action_id: acceptAction.id,
    p_action: 'accept',
  })).error,
  'stranger accept task',
);

const { error: taskCommentOk } = await member.client.rpc('add_matter_comment', {
  p_matter_id: workId,
  p_body: 'Task discussion only.',
  p_task_id: taskId,
});
if (taskCommentOk) throw new Error(`assignee should be able to comment on a Task: ${taskCommentOk.message}`);
const { data: afterTaskComment } = await citizen.client.rpc('get_matter', { p_matter_id: workId });
const stillPending = (afterTaskComment?.pending_actions ?? []).find((row) => row.id === acceptAction.id);
if (!stillPending || stillPending.status !== 'pending') {
  throw new Error('Task comment must leave the acceptance action pending');
}

console.log('PASS: Matter authorization negatives (impersonation, access, action, timeout grant, collaborative work)');
