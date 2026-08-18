#!/usr/bin/env node
/**
 * Runtime gate: member can plain-repost and delete without duplicating content.
 * Usage: node scripts/verify-post-reposts.mjs
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
    throw new Error('Missing env for verify:post-reposts');
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
  .select('id, content')
  .order('created_at', { ascending: false })
  .limit(5);
if (postsErr || !posts?.length) throw new Error(`posts: ${postsErr?.message || 'none'}`);

const original = posts.find((row) => /peace|wars/i.test(row.content)) || posts[0];
await supabase
  .from('post_reposts')
  .delete()
  .eq('reposter_profile_id', profile.id)
  .eq('original_post_id', original.id);

const { data: repost, error: insertErr } = await supabase
  .from('post_reposts')
  .insert({
    original_post_id: original.id,
    reposter_profile_id: profile.id,
    commentary_post_id: null,
  })
  .select('id, original_post_id, commentary_post_id')
  .single();
if (insertErr || !repost) {
  throw new Error(`repost insert failed: ${insertErr?.code} ${insertErr?.message}`);
}
if (repost.commentary_post_id) {
  throw new Error('plain repost must not create commentary_post_id');
}

const { count: postCountBefore } = await supabase
  .from('posts')
  .select('id', { count: 'exact', head: true })
  .eq('id', original.id);

const { error: deleteErr } = await supabase.from('post_reposts').delete().eq('id', repost.id);
if (deleteErr) throw new Error(`repost delete failed: ${deleteErr.message}`);

const { data: stillThere } = await supabase.from('posts').select('id').eq('id', original.id).maybeSingle();
if (!stillThere) throw new Error('deleting a repost must never delete the original post');

// Repost with thoughts: commentary post + relationship; delete removes commentary only.
const thoughts = `Repost thoughts verify ${Date.now()}`;
const { data: commentary, error: commentaryErr } = await supabase
  .from('posts')
  .insert({ author_id: profile.id, content: thoughts })
  .select('id')
  .single();
if (commentaryErr || !commentary) {
  throw new Error(`commentary insert failed: ${commentaryErr?.message}`);
}
const { data: quote, error: quoteErr } = await supabase
  .from('post_reposts')
  .insert({
    original_post_id: original.id,
    reposter_profile_id: profile.id,
    commentary_post_id: commentary.id,
  })
  .select('id')
  .single();
if (quoteErr || !quote) {
  await supabase.from('posts').delete().eq('id', commentary.id);
  throw new Error(`quote repost insert failed: ${quoteErr?.code} ${quoteErr?.message}`);
}
await supabase.from('post_reposts').delete().eq('id', quote.id);
await supabase.from('posts').delete().eq('id', commentary.id);
const { data: originalAfterQuote } = await supabase
  .from('posts')
  .select('id')
  .eq('id', original.id)
  .maybeSingle();
if (!originalAfterQuote) throw new Error('quote-repost cleanup must leave the original intact');

console.log(
  `PASS: post_reposts plain + with-thoughts (original=${original.id.slice(0, 8)}…)`,
);
