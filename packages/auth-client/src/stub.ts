import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseProfile } from './types.js';

/**
 * Build a deterministic fake Supabase user from an email. We use a stable
 * UUIDv5-shaped identifier (sha256-of-email truncated and re-formatted as a
 * UUID) so repeated dev-bypass calls for the same address resolve to the same
 * `User.supabaseUserId`. That keeps the in-app upsert logic identical to the
 * real-Supabase flow.
 */
export function devBypass(
  email: string,
): SupabaseProfile & { firstName: string; lastName: string } {
  console.warn(`[auth-client] DEV BYPASS used for ${email} — DO NOT ship to production stubbed`);

  const fakeId = stableFakeUserId(email);

  const [localPart] = email.split('@');
  const parts = (localPart ?? 'dev').split(/[._-]/);
  const firstName = capitalise(parts[0] ?? 'Dev');
  const lastName = capitalise(parts[1] ?? 'User');

  return {
    supabaseUserId: fakeId,
    email,
    firstName,
    lastName,
  };
}

/**
 * Stable UUID-shaped string derived from an email. NOT cryptographically
 * meaningful; just a deterministic identifier that conforms to the UUID format
 * (Supabase auth.users.id is a UUID, so the public.User.supabaseUserId is too).
 */
function stableFakeUserId(email: string): string {
  const hash = createHash('sha256').update(email.toLowerCase()).digest('hex');
  // Format as UUID — 8-4-4-4-12. Force version=4 nibble and variant=8/9/a/b nibble
  // so the value is a valid UUIDv4 even though it's deterministic.
  const v4 =
    hash.slice(0, 8) +
    '-' +
    hash.slice(8, 12) +
    '-4' +
    hash.slice(13, 16) +
    '-' +
    'a' +
    hash.slice(17, 20) +
    '-' +
    hash.slice(20, 32);
  return v4;
}

/** Generates a fresh random UUID. Useful in tests that mint multiple users. */
export function newDevUserId(): string {
  return randomUUID();
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
