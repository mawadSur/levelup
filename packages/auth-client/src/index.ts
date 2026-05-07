// JWT verification + stub-mode minting
export { verifyAccessToken, signStubAccessToken, claimsToProfile } from './jwt.js';

// Supabase server clients
export { getServiceRoleClient, getAnonClient } from './supabase.js';

// Dev bypass (stub mode only)
export { devBypass, newDevUserId } from './stub.js';

// RBAC
export { hasRole, assertRole, RolePriority } from './rbac.js';
export type { Role } from './rbac.js';

// Config
export { isStubMode, authConfig } from './config.js';

// Types
export type { SupabaseProfile, SessionPayload, AuthConfig, SupabaseJwtClaims } from './types.js';

// CR.0: Legacy cookie-name constant. With Supabase Auth managing its own
// `sb-<ref>-auth-token` cookies via `@supabase/ssr` this is no longer used by
// the framework code, but a few peripheral consumers still reference it. Kept
// for one release of compat — delete in the next major.
export const LEVELUP_SESSION = 'LEVELUP_SESSION';
