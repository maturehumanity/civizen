#!/usr/bin/env node
/**
 * Runtime gate: post edit ownership, identity freeze, and revision retention.
 * Ordinary posts stay editable by the author with no time cutoff.
 * Usage: node scripts/verify-post-edit.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
  const root = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const local = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const get = (src, key) =>
    src.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'))?.[1]?.trim();
  const getLocal = (key) =>
    local.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
  const url = get(root, 'VITE_SUPABASE_URL');
  const anon = get(root, 'VITE_SUPABASE_ANON_KEY') || get(root, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  const memberEmail = getLocal('TEST_USER_ROLE_MEMBER_EMAIL');
  const memberPassword = getLocal('TEST_USER_ROLE_MEMBER_PASSWORD');
  const otherEmail = getLocal('TEST_USER_ROLE_CITIZEN_EMAIL');
  const otherPassword = getLocal('TEST_USER_ROLE_CITIZEN_PASSWORD');
  if (!url || !anon || !memberEmail || !memberPassword || !otherEmail || !otherPassword) {
    throw new Error('Missing env for verify:post-edit');
  }
  return { url, anon, memberEmail, memberPassword, otherEmail, otherPassword };
}

const env = loadEnv();

async function signIn(email, password) {
  const client = createClient(env.url, env.anon);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`auth failed (${email}): ${error.message}`);
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: profile, error: profileErr } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (profileErr || !profile?.id) throw new Error(`profile: ${profileErr?.message || 'missing'}`);
  return { client, profileId: profile.id };
}

const createdIds = [];
const createdRepostIds = [];

async function cleanup(client) {
  if (createdRepostIds.length) {
    await client.from('post_reposts').delete().in('id', createdRepostIds);
  }
  if (!createdIds.length) return;
  await client.from('posts').delete().in('id', createdIds);
}

try {
  const author = await signIn(env.memberEmail, env.memberPassword);

  const { data: fresh, error: insertErr } = await author.client
    .from('posts')
    .insert({
      author_id: author.profileId,
      content: 'verify-post-edit original <b>plain</b>',
    })
    .select('id, content, created_at, author_id, is_edited, edited_at')
    .single();
  if (insertErr || !fresh?.id) throw new Error(`insert failed: ${insertErr?.message}`);
  createdIds.push(fresh.id);

  const originalCreatedAt = fresh.created_at;
  const originalAuthor = fresh.author_id;

  const { data: edited, error: editErr } = await author.client.rpc('edit_published_post', {
    p_post_id: fresh.id,
    p_content: '<b>verify-post-edit updated</b>',
  });
  if (editErr) throw new Error(`edit_published_post failed: ${editErr.message}`);
  const row = Array.isArray(edited) ? edited[0] : edited;
  if (!row?.id) throw new Error('edit_published_post returned no row');
  if (row.id !== fresh.id) throw new Error('edit must keep the same post id');
  if (row.created_at !== originalCreatedAt) throw new Error('created_at must not change');
  if (row.author_id !== originalAuthor) throw new Error('author_id must not change');
  if (!row.edited_at) throw new Error('edited_at must be set after a content edit');
  if (row.is_edited !== true) throw new Error('is_edited must be true after a content edit');
  if (!String(row.content).includes('verify-post-edit updated')) {
    throw new Error('formatted content did not persist');
  }

  const { data: revisions, error: revErr } = await author.client
    .from('post_revisions')
    .select('post_id, content, editor_profile_id, revision_number')
    .eq('post_id', fresh.id)
    .order('revision_number', { ascending: true });
  if (revErr) throw new Error(`post_revisions: ${revErr.message}`);
  if (!revisions?.length) throw new Error('previous content was not retained');
  if (revisions[0].editor_profile_id !== author.profileId) {
    throw new Error('revision editor must be the current author profile');
  }
  if (!String(revisions[0].content).includes('verify-post-edit original')) {
    throw new Error('revision did not keep the previous published wording');
  }

  const { error: likeErr } = await author.client.from('post_likes').insert({
    post_id: fresh.id,
    user_id: author.profileId,
  });
  if (likeErr && likeErr.code !== '23505') {
    throw new Error(`like insert: ${likeErr.message}`);
  }
  const { error: commentErr } = await author.client.from('post_comments').insert({
    post_id: fresh.id,
    author_id: author.profileId,
    content: 'verify-post-edit comment',
  });
  if (commentErr) throw new Error(`comment insert: ${commentErr.message}`);

  const { data: repost, error: repostErr } = await author.client
    .from('post_reposts')
    .insert({
      original_post_id: fresh.id,
      reposter_profile_id: author.profileId,
      commentary_post_id: null,
    })
    .select('id')
    .single();
  if (repostErr || !repost?.id) throw new Error(`repost insert: ${repostErr?.message}`);
  createdRepostIds.push(repost.id);

  const { data: editedAgain, error: secondEditErr } = await author.client.rpc('edit_published_post', {
    p_post_id: fresh.id,
    p_content: '<i>verify-post-edit second</i>',
  });
  if (secondEditErr) throw new Error(`second edit failed: ${secondEditErr.message}`);
  const secondRow = Array.isArray(editedAgain) ? editedAgain[0] : editedAgain;
  if (secondRow.created_at !== originalCreatedAt) {
    throw new Error('a later edit must not change created_at');
  }

  const { count: likeCount } = await author.client
    .from('post_likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', fresh.id);
  const { count: commentCount } = await author.client
    .from('post_comments')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', fresh.id);
  const { count: repostCount } = await author.client
    .from('post_reposts')
    .select('id', { count: 'exact', head: true })
    .eq('id', repost.id);
  if (!likeCount) throw new Error('reactions must survive editing');
  if (!commentCount) throw new Error('comments must survive editing');
  if (!repostCount) throw new Error('reposts must survive editing');

  const { error: bumpCreatedErr } = await author.client
    .from('posts')
    .update({ created_at: new Date().toISOString() })
    .eq('id', fresh.id);
  const { data: afterBump } = await author.client
    .from('posts')
    .select('created_at')
    .eq('id', fresh.id)
    .single();
  if (afterBump?.created_at !== originalCreatedAt) {
    throw new Error(`created_at must stay frozen${bumpCreatedErr ? `: ${bumpCreatedErr.message}` : ''}`);
  }

  const other = await signIn(env.otherEmail, env.otherPassword);
  const { error: otherErr } = await other.client.rpc('edit_published_post', {
    p_post_id: fresh.id,
    p_content: 'hijacked',
  });
  if (!otherErr) throw new Error('another user must not edit this post');

  const { error: otherDirectErr } = await other.client
    .from('posts')
    .update({ content: 'direct hijack' })
    .eq('id', fresh.id);
  const { data: afterOtherDirect } = await author.client
    .from('posts')
    .select('content')
    .eq('id', fresh.id)
    .single();
  if (afterOtherDirect?.content === 'direct hijack') {
    throw new Error(`direct UPDATE must not bypass ownership${otherDirectErr ? `: ${otherDirectErr.message}` : ''}`);
  }

  const oldPublishedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldPost, error: oldInsertErr } = await author.client
    .from('posts')
    .insert({
      author_id: author.profileId,
      content: 'verify-post-edit old original',
      created_at: oldPublishedAt,
    })
    .select('id, created_at')
    .single();
  if (oldInsertErr || !oldPost?.id) {
    throw new Error(`old post insert failed: ${oldInsertErr?.message}`);
  }
  createdIds.push(oldPost.id);
  const oldCreatedAt = oldPost.created_at;

  const { data: oldEdited, error: oldEditErr } = await author.client.rpc('edit_published_post', {
    p_post_id: oldPost.id,
    p_content: 'verify-post-edit old updated',
  });
  if (oldEditErr) throw new Error(`author must be able to edit an old post: ${oldEditErr.message}`);
  const oldRow = Array.isArray(oldEdited) ? oldEdited[0] : oldEdited;
  if (oldRow.created_at !== oldCreatedAt) throw new Error('old post created_at must not change');
  if (!oldRow.edited_at) throw new Error('old post edited_at must be set after a content edit');
  if (!String(oldRow.content).includes('verify-post-edit old updated')) {
    throw new Error('old post content did not persist');
  }

  const { data: oldRevisions, error: oldRevErr } = await author.client
    .from('post_revisions')
    .select('content')
    .eq('post_id', oldPost.id)
    .order('revision_number', { ascending: true });
  if (oldRevErr) throw new Error(`old post_revisions: ${oldRevErr.message}`);
  if (!oldRevisions?.length || !String(oldRevisions[0].content).includes('verify-post-edit old original')) {
    throw new Error('old post previous wording was not retained');
  }

  const { error: otherOldErr } = await other.client.rpc('edit_published_post', {
    p_post_id: oldPost.id,
    p_content: 'hijacked old',
  });
  if (!otherOldErr) throw new Error('another user must not edit an old post');

  await cleanup(author.client);
  console.log('PASS: post edit ownership, revisions, and integrity (no time cutoff)');
} catch (error) {
  try {
    const author = await signIn(env.memberEmail, env.memberPassword);
    await cleanup(author.client);
  } catch {
    // best-effort cleanup
  }
  throw error;
}
