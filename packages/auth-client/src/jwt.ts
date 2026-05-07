import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { authConfig, isStubMode } from './config.js';
import type { SupabaseJwtClaims, SupabaseProfile } from './types.js';

/**
 * Stub-mode shared secret used to sign and verify fake Supabase access tokens
 * for the dev-bypass flow. Deterministic so the API and any test that minted a
 * token from the same package version can verify it. Must not be used in
 * production — `isStubMode()` is enforced by the dev-bypass code path.
 */
const STUB_JWT_SECRET = 'levelup-dev-stub-jwt-secret-do-not-use-in-prod-32ch!!';

const STUB_ISSUER = 'levelup-stub';
const STUB_AUDIENCE = 'authenticated';

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwksResolver(): ReturnType<typeof createRemoteJWKSet> {
  if (_jwks === null) {
    const url = new URL(`${authConfig.supabaseUrl}/auth/v1/.well-known/jwks.json`);
    _jwks = createRemoteJWKSet(url);
  }
  return _jwks;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function toClaims(payload: JWTPayload): SupabaseJwtClaims {
  if (typeof payload.sub !== 'string') {
    throw new Error('[auth-client] Token missing required claim: sub');
  }
  if (typeof payload.exp !== 'number') {
    throw new Error('[auth-client] Token missing required claim: exp');
  }
  if (typeof payload.iat !== 'number') {
    throw new Error('[auth-client] Token missing required claim: iat');
  }

  const userMetadata =
    typeof payload['user_metadata'] === 'object' &&
    payload['user_metadata'] !== null &&
    !Array.isArray(payload['user_metadata'])
      ? (payload['user_metadata'] as Record<string, unknown>)
      : undefined;

  const appMetadata =
    typeof payload['app_metadata'] === 'object' &&
    payload['app_metadata'] !== null &&
    !Array.isArray(payload['app_metadata'])
      ? (payload['app_metadata'] as Record<string, unknown>)
      : undefined;

  const aud = payload.aud;
  const audience: string | string[] | undefined =
    typeof aud === 'string' || Array.isArray(aud) ? aud : undefined;

  const out: SupabaseJwtClaims = {
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
  };
  const email = asString(payload['email']);
  if (email !== undefined) out.email = email;
  const iss = asString(payload.iss);
  if (iss !== undefined) out.iss = iss;
  if (audience !== undefined) out.aud = audience;
  if (userMetadata !== undefined) out.user_metadata = userMetadata;
  if (appMetadata !== undefined) out.app_metadata = appMetadata;
  const role = asString(payload['role']);
  if (role !== undefined) out.role = role;
  return out;
}

/**
 * Verify a Supabase Auth JWT and return the parsed claims. Returns `null` for
 * any failure (expired, invalid signature, missing required claim, etc.) —
 * callers should treat that as 401.
 *
 * In stub mode (no real Supabase URL configured) we accept tokens signed with
 * the local stub secret so the dev-bypass flow can mint usable JWTs.
 */
export async function verifyAccessToken(token: string): Promise<SupabaseJwtClaims | null> {
  if (token === '') return null;

  try {
    if (isStubMode()) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(STUB_JWT_SECRET), {
        issuer: STUB_ISSUER,
        audience: STUB_AUDIENCE,
      });
      return toClaims(payload);
    }

    // Real Supabase: prefer symmetric secret if configured (legacy projects),
    // fall back to JWKS for projects on asymmetric signing.
    if (authConfig.supabaseJwtSecret !== undefined) {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(authConfig.supabaseJwtSecret),
        {
          // Supabase tokens use issuer = `${SUPABASE_URL}/auth/v1`
          issuer: `${authConfig.supabaseUrl}/auth/v1`,
          audience: 'authenticated',
        },
      );
      return toClaims(payload);
    }

    const { payload } = await jwtVerify(token, getJwksResolver(), {
      issuer: `${authConfig.supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });
    return toClaims(payload);
  } catch {
    return null;
  }
}

/**
 * Stub-only: mint a Supabase-shaped JWT for a fake user. Used by the dev-bypass
 * route. Throws if called outside of stub mode, since signing tokens with a
 * shared secret would be a critical security bug in production.
 */
export async function signStubAccessToken(
  profile: SupabaseProfile,
  opts: { ttlSeconds?: number } = {},
): Promise<string> {
  if (!isStubMode()) {
    throw new Error('[auth-client] signStubAccessToken() is only available in stub mode.');
  }
  const ttl = opts.ttlSeconds ?? 60 * 60 * 8; // 8 hours
  const now = Math.floor(Date.now() / 1000);
  const userMetadata: Record<string, unknown> = {};
  if (profile.firstName !== undefined) userMetadata['first_name'] = profile.firstName;
  if (profile.lastName !== undefined) userMetadata['last_name'] = profile.lastName;

  return await new SignJWT({
    email: profile.email,
    role: 'authenticated',
    user_metadata: userMetadata,
    app_metadata: { provider: 'levelup-stub' },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(profile.supabaseUserId)
    .setIssuedAt(now)
    .setIssuer(STUB_ISSUER)
    .setAudience(STUB_AUDIENCE)
    .setExpirationTime(now + ttl)
    .sign(new TextEncoder().encode(STUB_JWT_SECRET));
}

/**
 * Helper: turn verified claims into the canonical `SupabaseProfile` shape the
 * AuthService consumes. Pulls names out of `user_metadata` heuristically — the
 * shape varies between OAuth providers and email/password sign-ups.
 */
export function claimsToProfile(claims: SupabaseJwtClaims): SupabaseProfile {
  const email = claims.email ?? '';
  const meta = claims.user_metadata ?? {};
  const firstName = pickName(meta, ['first_name', 'firstName', 'given_name']);
  const lastName = pickName(meta, ['last_name', 'lastName', 'family_name']);

  // If only `name` / `full_name` is present, split on first space.
  let derivedFirst = firstName;
  let derivedLast = lastName;
  if (derivedFirst === undefined && derivedLast === undefined) {
    const fullName = pickName(meta, ['name', 'full_name', 'display_name']);
    if (fullName !== undefined) {
      const parts = fullName.split(/\s+/);
      derivedFirst = parts[0];
      if (parts.length > 1) derivedLast = parts.slice(1).join(' ');
    }
  }

  const out: SupabaseProfile = {
    supabaseUserId: claims.sub,
    email,
  };
  if (derivedFirst !== undefined) out.firstName = derivedFirst;
  if (derivedLast !== undefined) out.lastName = derivedLast;
  return out;
}

function pickName(meta: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}
