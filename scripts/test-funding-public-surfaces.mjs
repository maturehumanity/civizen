#!/usr/bin/env node
/**
 * Public funding surface smoke checks (anon-safe).
 * Usage: node scripts/test-funding-public-surfaces.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/^["']|["']$/g, '');
const anon = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').replace(
  /^["']|["']$/g,
  '',
);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function main() {
  if (!url || !anon) {
    fail('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_* equivalents)');
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.rpc('get_public_funding_transparency');
  if (error) fail(`get_public_funding_transparency: ${error.message}`);
  if (!data || typeof data !== 'object') fail('transparency payload missing');
  if (typeof data.published !== 'boolean') fail('published flag missing');
  if (!('lanes' in data)) fail('lanes missing');

  const base = process.env.CIVIZEN_PUBLIC_BASE_URL || process.env.CIVIZEN_PUBLIC_BASE_URL || 'http://127.0.0.1:8080';
  const paths = ['/fund', '/fund/support', '/fund/invest', '/fund/transparency', '/fund/institutional', '/fund/contribute'];
  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) fail(`${path} returned ${res.status}`);
    } catch (err) {
      fail(`${path} unreachable (${err instanceof Error ? err.message : String(err)}). Start dev server or set CIVIZEN_PUBLIC_BASE_URL.`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        transparencyPublished: data.published,
        checkedPaths: paths,
        base,
      },
      null,
      2,
    ),
  );
}

main();
