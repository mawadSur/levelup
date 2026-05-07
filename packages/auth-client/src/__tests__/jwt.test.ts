/**
 * @levelup/auth-client — JWT unit tests
 *
 * Tests:
 *  - signStubAccessToken / verifyAccessToken round-trip
 *  - tampered token returns null
 *  - expired token returns null
 *  - claimsToProfile name extraction across user_metadata shapes
 */

import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env['SUPABASE_URL'] = 'PLACEHOLDER_supabase_url';
  process.env['SUPABASE_ANON_KEY'] = 'PLACEHOLDER_supabase_anon';
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'PLACEHOLDER_supabase_service_role';
  process.env['COOKIE_DOMAIN'] = 'localhost';
  process.env['NODE_ENV'] = 'test';
});

import { signStubAccessToken, verifyAccessToken, claimsToProfile } from '../jwt.js';

const profile = {
  supabaseUserId: '00000000-0000-4000-a000-000000000abc',
  email: 'admin@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

describe('verifyAccessToken (stub mode)', () => {
  it('round-trips a stub-signed token', async () => {
    const token = await signStubAccessToken(profile);
    const claims = await verifyAccessToken(token);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe(profile.supabaseUserId);
    expect(claims!.email).toBe(profile.email);
    expect(claims!.role).toBe('authenticated');
  });

  it('returns null for an invalid token string', async () => {
    expect(await verifyAccessToken('not-a-jwt')).toBeNull();
  });

  it('returns null for an empty string', async () => {
    expect(await verifyAccessToken('')).toBeNull();
  });

  it('returns null for a tampered token', async () => {
    const token = await signStubAccessToken(profile);
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(await verifyAccessToken(tampered)).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const token = await signStubAccessToken(profile, { ttlSeconds: 1 });
    await new Promise((r) => setTimeout(r, 1500));
    expect(await verifyAccessToken(token)).toBeNull();
  });
});

describe('claimsToProfile', () => {
  it('reads first_name / last_name', () => {
    const out = claimsToProfile({
      sub: 'u1',
      email: 'a@b.c',
      iat: 0,
      exp: 1,
      user_metadata: { first_name: 'Alice', last_name: 'Smith' },
    });
    expect(out).toMatchObject({ firstName: 'Alice', lastName: 'Smith' });
  });

  it('falls back to splitting full_name', () => {
    const out = claimsToProfile({
      sub: 'u1',
      email: 'a@b.c',
      iat: 0,
      exp: 1,
      user_metadata: { full_name: 'Alice Smith' },
    });
    expect(out).toMatchObject({ firstName: 'Alice', lastName: 'Smith' });
  });

  it('handles missing names gracefully', () => {
    const out = claimsToProfile({
      sub: 'u1',
      email: 'a@b.c',
      iat: 0,
      exp: 1,
    });
    expect(out.firstName).toBeUndefined();
    expect(out.lastName).toBeUndefined();
  });
});
