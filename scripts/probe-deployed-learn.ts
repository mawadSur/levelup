#!/usr/bin/env tsx
/**
 * Hit the deployed /learn route with a real Supabase session cookie and
 * report whether the layout's getSessionUser succeeded (200 with content) or
 * redirected to /sign-in. Used to isolate whether the SSR fix is actually
 * shipping in the Vercel build.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(): void {
  for (const file of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    const t = readFileSync(p, 'utf8');
    for (const line of t.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]] !== undefined && process.env[m[1]] !== '') continue;
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  }
}

async function main() {
  loadEnv();
  const email = process.argv[2] ?? 'admin@demo.test';
  const password = process.argv[3] ?? 'LevelUp!Demo1';
  const target = process.argv[4] ?? 'https://ailevel.app/learn';
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const supabaseAnon = process.env.SUPABASE_ANON_KEY ?? '';
  if (supabaseUrl === '' || supabaseAnon === '') throw new Error('Missing Supabase env');
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.session === null) {
    console.log('Supabase signin failed:', error?.message);
    process.exit(1);
  }
  const session = data.session;
  // Build the same cookie value @supabase/ssr writes: `base64-{base64(JSON)}`.
  const projectRef = new URL(supabaseUrl).host.split('.')[0];
  const payload = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    refresh_token: session.refresh_token,
    user: session.user,
  };
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(payload)).toString('base64');
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieHeader = `${cookieName}=${cookieValue}`;

  console.log(`User: ${email}`);
  console.log(`Cookie: ${cookieName}, length=${cookieValue.length}`);
  console.log(`Target: ${target}`);
  console.log('');

  const res = await fetch(target, {
    redirect: 'manual',
    headers: { cookie: cookieHeader },
  });
  console.log(`Status: ${res.status}`);
  console.log(`Location: ${res.headers.get('location') ?? '(none)'}`);
  console.log(`x-vercel-id: ${res.headers.get('x-vercel-id') ?? '?'}`);
  console.log(`x-matched-path: ${res.headers.get('x-matched-path') ?? '?'}`);
  const body = await res.text();
  const hasSignInRedirect = body.includes('/sign-in?redirect=');
  const hasLearnContent =
    body.includes('LearnerShell') || body.includes('Daily quest') || body.includes('My paths');
  console.log(`Body has /sign-in redirect marker: ${hasSignInRedirect}`);
  console.log(`Body has learn shell content: ${hasLearnContent}`);
  console.log(`Body length: ${body.length}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
