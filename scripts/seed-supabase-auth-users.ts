#!/usr/bin/env tsx
/**
 * Create Supabase Auth users that match the demo emails seeded by
 * `packages/db/prisma/seed.ts`. Without this, the sign-in form's
 * `signInWithPassword` call has nothing to authenticate against.
 *
 * Idempotent: if an auth user with the email already exists, we just print it.
 * Re-running with --reset-password will overwrite the password for existing
 * users.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-supabase-auth-users.ts
 *   pnpm exec tsx scripts/seed-supabase-auth-users.ts --reset-password
 *   pnpm exec tsx scripts/seed-supabase-auth-users.ts --password 'Custom!Pw1'
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment.
 * Picks up .env automatically when run via tsx through pnpm at the repo root.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface DemoUser {
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
}

const DEMO_USERS: DemoUser[] = [
  { email: 'admin@demo.test', name: 'Ada Admin', role: 'ADMIN' },
  { email: 'manager@demo.test', name: 'Mona Manager', role: 'MANAGER' },
  { email: 'eve@demo.test', name: 'Eve Employee', role: 'EMPLOYEE' },
  { email: 'ed@demo.test', name: 'Ed Employee', role: 'EMPLOYEE' },
];

const DEFAULT_PASSWORD = 'LevelUp!Demo1';

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
      // Strip wrapping quotes if present.
      const v = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      process.env[key] = v;
    }
  }
}

function parseArgs(): { password: string; resetPassword: boolean } {
  let password = DEFAULT_PASSWORD;
  let resetPassword = false;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reset-password') resetPassword = true;
    else if (a === '--password') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error('--password requires a value');
      }
      password = next;
      i++;
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: tsx scripts/seed-supabase-auth-users.ts [--reset-password] [--password <pw>]',
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return { password, resetPassword };
}

async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string } | null> {
  // listUsers paginates 50 at a time; for a fresh demo project that's plenty.
  // If you outgrow this, page until the requested email appears or the page
  // count flattens out.
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data.users as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (found) return { id: found.id, email: found.email ?? email };
    if (users.length < 100) return null;
    page++;
    if (page > 50) return null; // safety bail
  }
}

async function ensureUser(
  admin: SupabaseClient,
  user: DemoUser,
  password: string,
  resetPassword: boolean,
): Promise<'created' | 'reset' | 'existing'> {
  const existing = await findUserByEmail(admin, user.email);

  if (existing === null) {
    const { error } = await admin.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: user.name, demo: true },
    });
    if (error) throw new Error(`createUser(${user.email}): ${error.message}`);
    return 'created';
  }

  if (resetPassword) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) throw new Error(`updateUserById(${user.email}): ${error.message}`);
    return 'reset';
  }

  return 'existing';
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const { password, resetPassword } = parseArgs();

  const url = process.env.SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (url === '' || serviceRoleKey === '') {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Set them in .env or your shell.',
    );
  }
  if (url.startsWith('PLACEHOLDER_') || serviceRoleKey.startsWith('PLACEHOLDER_')) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are still stub placeholders. ' +
        'Point them at your real Supabase project first.',
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Supabase project: ${new URL(url).host}`);
  console.log(
    `Password policy: ${resetPassword ? 'reset on existing users' : 'reuse existing passwords'}`,
  );
  console.log('');

  let created = 0;
  let reset = 0;
  let existing = 0;
  for (const user of DEMO_USERS) {
    const status = await ensureUser(admin, user, password, resetPassword);
    if (status === 'created') created++;
    else if (status === 'reset') reset++;
    else existing++;
    const tag =
      status === 'created' ? 'CREATED' : status === 'reset' ? 'PASSWORD RESET' : 'ALREADY EXISTS';
    console.log(`  [${tag}] ${user.email.padEnd(22)} (${user.role})`);
  }

  console.log('');
  console.log(`Created: ${created}   Reset: ${reset}   Existing: ${existing}`);
  console.log('');
  console.log('Sign in with any of the above emails and the password:');
  console.log(`  ${password}`);
  console.log('');
  console.log('First sign-in attaches the Supabase user id to the matching Prisma User row via');
  console.log('apps/api/src/modules/auth/auth.service.ts → upsertUserFromProfile (email match).');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
