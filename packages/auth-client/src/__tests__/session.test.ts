/**
 * @levelup/auth-client — session-cookie helper unit tests
 *
 * Regression coverage for the legacy `levelup_session` cookie helpers added
 * in the P0 wave. RFC 6265 cookie names are case-sensitive; the previous
 * mismatch (API sent `levelup_session`, web read `LEVELUP_SESSION`) silently
 * broke the auth round-trip, so we lock the constant value, the Set-Cookie
 * serialization (attributes + URL-encoding + Secure-in-prod), and the
 * defensive parse path.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Stub the auth-client config env BEFORE importing the module under test so
// `authConfig` initializes deterministically (`COOKIE_DOMAIN=localhost`).
vi.hoisted(() => {
  process.env['SUPABASE_URL'] = 'PLACEHOLDER_supabase_url';
  process.env['SUPABASE_ANON_KEY'] = 'PLACEHOLDER_supabase_anon';
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'PLACEHOLDER_supabase_service_role';
  process.env['COOKIE_DOMAIN'] = 'localhost';
  process.env['NODE_ENV'] = 'test';
});

import { LEVELUP_SESSION, serializeCookie, clearCookie, parseCookieHeader } from '../session.js';

describe('LEVELUP_SESSION constant', () => {
  it('is the canonical lowercase RFC 6265-safe cookie name', () => {
    // Locking the literal value here — anything else (e.g. the historical
    // `LEVELUP_SESSION` uppercase) is a silent auth-break.
    expect(LEVELUP_SESSION).toBe('levelup_session');
  });
});

describe('serializeCookie', () => {
  // We always restore NODE_ENV after each test so the Secure-flag branch
  // doesn't leak into unrelated cases.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('emits the canonical name=value pair and core attributes', () => {
    const cookie = serializeCookie('abc123');
    expect(cookie.startsWith('levelup_session=abc123')).toBe(true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    // Default TTL is 8 hours = 28800 seconds.
    expect(cookie).toContain('Max-Age=28800');
  });

  it('omits Secure when not in production', () => {
    // NODE_ENV is 'test' from the hoisted block; double-check the negative.
    vi.stubEnv('NODE_ENV', 'development');
    const cookie = serializeCookie('abc');
    expect(cookie).not.toContain('Secure');
  });

  it('adds Secure when NODE_ENV=production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = serializeCookie('abc');
    expect(cookie).toContain('Secure');
  });

  it('URL-encodes the value', () => {
    const cookie = serializeCookie('a b/c=d&e');
    // `serializeCookie` is the producer side of the round-trip with
    // `parseCookieHeader`; both must agree on percent-encoding.
    expect(cookie.startsWith('levelup_session=a%20b%2Fc%3Dd%26e')).toBe(true);
  });

  it('honours a custom maxAge', () => {
    const cookie = serializeCookie('abc', { maxAge: 60 });
    expect(cookie).toContain('Max-Age=60');
  });
});

describe('clearCookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a cookie with an empty value and Max-Age=0', () => {
    const cookie = clearCookie();
    expect(cookie.startsWith('levelup_session=;')).toBe(true);
    expect(cookie).toContain('Max-Age=0');
    // An Expires-in-the-past is included for older clients that ignore
    // Max-Age=0 — exercising the formatted timestamp would be brittle, so
    // we just confirm the header is emitted.
    expect(cookie).toContain('Expires=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
  });
});

describe('parseCookieHeader', () => {
  it('extracts the session token when present', () => {
    expect(parseCookieHeader('levelup_session=foo; other=bar')).toBe('foo');
  });

  it('returns null when the header is undefined', () => {
    expect(parseCookieHeader(undefined)).toBeNull();
  });

  it('returns null when the levelup_session cookie is absent', () => {
    expect(parseCookieHeader('other=bar')).toBeNull();
  });

  it('returns null on an empty header', () => {
    expect(parseCookieHeader('')).toBeNull();
  });

  it('round-trips a URL-encoded value', () => {
    const value = 'a b/c=d&e';
    const cookie = serializeCookie(value);
    // Strip the attributes; rebuild the raw `Cookie:` header form
    // (`name=encoded-value`) the browser would send back.
    const headerForm = cookie.split(';')[0] ?? '';
    expect(parseCookieHeader(headerForm)).toBe(value);
  });
});
