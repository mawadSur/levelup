#!/usr/bin/env tsx
/**
 * Smoke-test the four demo Supabase Auth users. Runs `signInWithPassword`
 * against the real Supabase project to confirm the credentials provisioned by
 * `seed-supabase-auth-users.ts` actually authenticate. Useful when the web UI
 * surfaces a vague "we couldn't sign you in" — this script returns the raw
 * Supabase error verbatim.
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  const password = process.argv[2] ?? 'LevelUp!Demo1';
  if (url === '' || anon === '') {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in env.');
  }
  console.log(`Project: ${new URL(url).host}`);
  console.log(`Password under test: ${password}`);
  console.log('');

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let failures = 0;
  for (const email of EMAILS) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      failures++;
      console.log(`  [FAIL] ${email.padEnd(22)} ${error.status ?? ''} ${error.message}`);
    } else {
      const tokenLen = data.session?.access_token.length ?? 0;
      console.log(`  [OK]   ${email.padEnd(22)} access_token len=${tokenLen}`);
    }
  }

  console.log('');
  console.log(`Failures: ${failures}/${EMAILS.length}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
