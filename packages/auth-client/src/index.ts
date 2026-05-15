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

// CR.0: Legacy cookie-name constant + helpers. Single source of truth so
// producers (api) and consumers (web, coach SSR) never drift apart on case.
// Kept for one release of compat — delete in the next major once the last
// peripheral consumers move off the legacy cookie.
export { LEVELUP_SESSION, serializeCookie, clearCookie, parseCookieHeader } from './session.js';
