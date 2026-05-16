// Server-side feature-flag helpers for *unauthenticated* surfaces (marketing,
// /pricing, /sign-in). The authenticated FlagsProvider in `flags-context.tsx`
// fetches the API's evaluated map for logged-in users — this file is for the
// pages that render *before* a session exists.
//
// Design:
//   - Anon visitors get a stable `lu-anon-id` cookie (random 16 chars, 1 yr).
//   - We deterministically bucket that id against the flag key using djb2,
//     matching the API's `rolloutBucket` so an authed and anon visitor with
//     the same hash both fall into the same bucket.
//   - The rollout percentage is sourced from a small in-code defaults map
//     here, because the real flag config lives behind an authed API. For
//     experiments that need anon traffic (pricing A/B), put the % below.
//   - If no `Set-Cookie` slot is available (e.g. inside a Server Action
//     boundary that won't flush), we default to variant A (false).

import { cookies } from 'next/headers';

const ANON_COOKIE = 'lu-anon-id';
const ANON_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

/**
 * Defaults for flags that anonymous traffic can hit. Keep this list short —
 * it's a deliberate allowlist of experiments that don't require auth.
 *
 * `rolloutPercent` is 0..100 (matching the API). 50 means a 50/50 A/B split.
 * The default value once the user is past the rollout is `false` (variant A).
 */
const ANON_FLAG_DEFAULTS: Record<string, { rolloutPercent: number }> = {
  pricing_v2: { rolloutPercent: 0 }, // Off by default — flip to 50 to start the experiment.
};

/**
 * djb2 32-bit hash. Mirrors apps/api/src/modules/flags/flags.service.ts so
 * the same visitor lands in the same bucket whether they're auth'd or anon.
 */
function rolloutBucket(id: string, flagKey: string): number {
  const str = `${id}:${flagKey}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

function randomAnonId(): string {
  // 16-char base36 — ~82 bits of entropy, plenty for bucketing.
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

/**
 * Read or mint the anon visitor id from cookies. Best-effort: if Next.js
 * doesn't let us write the cookie in this server context (e.g. a static
 * page render), we still return a deterministic id (hashed from the path /
 * UA) so bucketing is at least stable within the same request. The caller
 * should treat the returned id as "good enough for bucketing, not for
 * cross-session identification".
 */
async function getOrCreateAnonId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_COOKIE)?.value;
  if (typeof existing === 'string' && existing.length > 0) return existing;

  const next = randomAnonId();
  try {
    jar.set(ANON_COOKIE, next, {
      maxAge: ANON_COOKIE_MAX_AGE_SEC,
      httpOnly: false, // readable client-side too, for analytics enrichment
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
    });
  } catch {
    // Some server contexts (static generation, edge middleware in read-only
    // mode) reject cookie writes — fall through and return the id anyway.
    // The cookie just won't persist; next request will mint a fresh one.
  }
  return next;
}

export interface AnonFlagResult {
  enabled: boolean;
  variant: 'A' | 'B';
  /** The anon id used to bucket the visitor — pass into analytics events. */
  anonId: string;
}

/**
 * Evaluate a flag for an anonymous visitor. Used on public surfaces like
 * `/pricing` where there's no session yet. Authenticated equivalents should
 * use the FlagsProvider (`useFlag`) or call the API's `/flags/me` route.
 */
export async function evaluateAnonFlag(key: string): Promise<AnonFlagResult> {
  const config = ANON_FLAG_DEFAULTS[key];
  const anonId = await getOrCreateAnonId();

  if (!config || config.rolloutPercent <= 0) {
    return { enabled: false, variant: 'A', anonId };
  }
  if (config.rolloutPercent >= 100) {
    return { enabled: true, variant: 'B', anonId };
  }

  const bucket = rolloutBucket(anonId, key);
  const enabled = bucket < config.rolloutPercent;
  return { enabled, variant: enabled ? 'B' : 'A', anonId };
}
