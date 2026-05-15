#!/usr/bin/env tsx
/**
 * Sign in each demo user via Supabase, then call `/api/auth/me` on the
 * deployed Render API with the resulting Bearer token. Surfaces the raw status
 * + body so we can see if the API rejects specific users (role mapping,
 * upsert conflicts, etc).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnvIfPresent(): void {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (process.env[key] !== undefined && process.env[key] !== '') continue;
      const v = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      process.env[key] = v;
    }
  }
}

const EMAILS = ['admin@demo.test', 'manager@demo.test', 'eve@demo.test', 'ed@demo.test'];

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const password = process.argv[2] ?? 'LevelUp!Demo1';
  const apiBase = process.env.API_BASE ?? 'https://levelup-api-xz2v.onrender.com';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

  console.log(`API: ${apiBase}`);
  console.log(`Supabase: ${new URL(url).host}`);
  console.log('');

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const email of EMAILS) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || data.session === null) {
      console.log(`  [SUPABASE FAIL] ${email}: ${error?.message ?? 'no session'}`);
      continue;
    }
    const token = data.session.access_token;
    const res = await fetch(`${apiBase}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    console.log(`  [${res.status}] ${email.padEnd(22)} ${body.slice(0, 200)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
