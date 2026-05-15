/**
 * Session cookie utilities — the single source of truth for the legacy
 * `levelup_session` cookie name.
 *
 * Background: the framework migrated to Supabase Auth, which manages its own
 * `sb-<ref>-auth-token` cookies via `@supabase/ssr`. The constant exported
 * below is kept for one release of compat so a small number of peripheral
 * consumers (web `auth-client.ts`, coach SSR pages, the API guard's legacy
 * branch) can reference one canonical value instead of inline-defining their
 * own — RFC 6265 cookie names are case-sensitive, and the previous mismatch
 * (API sent `levelup_session`, web read `LEVELUP_SESSION`) silently broke
 * auth on the web side.
 *
 * Delete the cookie helpers in the next major once those peripheral
 * consumers are gone.
 */
import { authConfig } from './config.js';

/**
 * Canonical name for the legacy LevelUp session cookie.
 *
 * RFC 6265 §4.1.1 makes cookie names case-sensitive. The constant value is the
 * lowercase string `levelup_session`; never inline this — always import it.
 */
export const LEVELUP_SESSION = 'levelup_session';

const DEFAULT_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface SerializeCookieOptions {
  /** Cookie Max-Age, in seconds. Defaults to 8 hours. */
  maxAge?: number;
}

/**
 * Serialize a `Set-Cookie` header value for the LevelUp session cookie.
 *
 * `Secure` is set explicitly from `NODE_ENV === 'production'` rather than
 * coalesced through an option, so production deployments never accidentally
 * emit a non-Secure cookie because of a missing/typo'd opt. Dev and test
 * environments fall through to non-Secure (browsers reject Secure cookies on
 * `http://`).
 */
export function serializeCookie(token: string, opts: SerializeCookieOptions = {}): string {
  const maxAge = opts.maxAge ?? DEFAULT_TTL_SECONDS;
  const secure = process.env['NODE_ENV'] === 'production';
  return buildCookie(LEVELUP_SESSION, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure,
    domain: authConfig.cookieDomain,
    maxAge,
  });
}

/**
 * Serialize a `Set-Cookie` header that clears the session cookie on the
 * browser. Same attributes as `serializeCookie` minus the value, plus an
 * `Expires` in the past for older clients that don't honor Max-Age=0.
 */
export function clearCookie(): string {
  const secure = process.env['NODE_ENV'] === 'production';
  return buildCookie(LEVELUP_SESSION, '', {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure,
    domain: authConfig.cookieDomain,
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Pull the LevelUp session token out of a raw `Cookie:` request header.
 * Returns `null` when the cookie is absent or the header itself is missing.
 */
export function parseCookieHeader(header: string | undefined): string | null {
  if (header === undefined || header === '') return null;
  const parts = header.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (name !== LEVELUP_SESSION) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

interface CookieAttrs {
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  secure?: boolean;
  domain?: string;
  maxAge?: number;
  expires?: Date;
}

function buildCookie(name: string, value: string, attrs: CookieAttrs): string {
  const segments: string[] = [`${name}=${encodeURIComponent(value)}`];
  if (typeof attrs.maxAge === 'number') {
    segments.push(`Max-Age=${Math.floor(attrs.maxAge)}`);
  }
  if (attrs.expires instanceof Date) {
    segments.push(`Expires=${attrs.expires.toUTCString()}`);
  }
  if (typeof attrs.domain === 'string' && attrs.domain !== '') {
    segments.push(`Domain=${attrs.domain}`);
  }
  if (typeof attrs.path === 'string' && attrs.path !== '') {
    segments.push(`Path=${attrs.path}`);
  }
  if (attrs.httpOnly === true) {
    segments.push('HttpOnly');
  }
  if (attrs.secure === true) {
    segments.push('Secure');
  }
  if (typeof attrs.sameSite === 'string') {
    segments.push(`SameSite=${attrs.sameSite}`);
  }
  return segments.join('; ');
}
