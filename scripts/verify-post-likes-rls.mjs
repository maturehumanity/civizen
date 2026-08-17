#!/usr/bin/env node
/**
 * Runtime gate: authenticated members can insert/delete post_likes under RLS.
 *
 * Root cause this blocks (live until 2026-08-17):
 * post_likes INSERT/DELETE policies used unqualified `user_id` inside
 * `FROM profiles … WHERE id = user_id`. Postgres bound `user_id` to
 * profiles.user_id, producing `profiles.id = profiles.user_id` (false for
 * normal rows). has_permission('like.create') was true, but WITH CHECK still
 * failed → Home toast "Could not save like" with optimistic Liked UI.
 *
 * Usage: node scripts/verify-post-likes-rls.mjs
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
  const email = getLocal('TEST_USER_ROLE_MEMBER_EMAIL');
  const password = getLocal('TEST_USER_ROLE_MEMBER_PASSWORD');
  if (!url || !anon || !email || !password) {
    throw new Error('Missing VITE_SUPABASE_* or TEST_USER_ROLE_MEMBER_* for verify:post-likes-rls');
  }
  return { url, anon, email, password };
}

const { url, anon, email, password } = loadEnv();
const supabase = createClient(url, anon);
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) throw new Error(`auth failed: ${authErr.message}`);

const {
  data: { user },
} = await supabase.auth.getUser();
const { data: profile, error: profileErr } = await supabase
  .from('profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();
if (profileErr || !profile?.id) throw new Error(`profile: ${profileErr?.message || 'missing'}`);

const { data: posts, error: postsErr } = await supabase
  .from('posts')
  .select('id')
  .order('created_at', { ascending: false })
  .limit(1);
if (postsErr || !posts?.[0]?.id) throw new Error(`posts: ${postsErr?.message || 'none'}`);

const postId = posts[0].id;
await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', profile.id);

const { error: insertErr } = await supabase.from('post_likes').insert({
  post_id: postId,
  user_id: profile.id,
});
if (insertErr) {
  throw new Error(
    `post_likes INSERT rejected (likely RLS user_id binding): ${insertErr.code} ${insertErr.message}`,
  );
}

const { error: deleteErr } = await supabase
  .from('post_likes')
  .delete()
  .eq('post_id', postId)
  .eq('user_id', profile.id);
if (deleteErr) {
  throw new Error(
    `post_likes DELETE rejected (likely RLS user_id binding): ${deleteErr.code} ${deleteErr.message}`,
  );
}

console.log('PASS: post_likes insert/delete under RLS');
