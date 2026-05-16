import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { authConfig, isStubMode } from './config.js';

// Supabase's RealtimeClient throws on Node < 22 because there's no native
// WebSocket. We never use realtime server-side (auth proxy + admin-only paths),
// but `signInWithPassword` etc. initialize the realtime channel as a side
// effect, so we have to provide a transport. `ws` is the canonical polyfill.
//
// The cast to `any` is intentional — `ws`'s WebSocket type defines `onerror`
// with `ErrorEvent` while the browser DOM type uses plain `Event`, which is
// a structural-type mismatch TypeScript can't bridge. Runtime-compatible,
// type-incompatible.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realtimeOptions = { transport: WebSocket as any };

let _serviceRole: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service-role key.
 *
 * NEVER expose this client (or the key it carries) to the browser. It bypasses
 * Row Level Security by design and is intended for server-side admin work
 * only — listing users, inviting users via the admin API, deleting auth rows
 * during account-removal flows, etc.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (isStubMode()) {
    throw new Error(
      '[auth-client] getServiceRoleClient() called in stub mode. ' +
        'Set real SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY or use the dev-bypass path.',
    );
  }
  if (_serviceRole === null) {
    _serviceRole = createClient(authConfig.supabaseUrl, authConfig.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: realtimeOptions,
    });
  }
  return _serviceRole;
}

/**
 * Returns a Supabase client authenticated with the anon key. Used for read
 * operations from the API where we don't want service-role privileges.
 */
export function getAnonClient(): SupabaseClient {
  if (isStubMode()) {
    throw new Error(
      '[auth-client] getAnonClient() called in stub mode. ' +
        'Set real SUPABASE_URL / SUPABASE_ANON_KEY or use the dev-bypass path.',
    );
  }
  if (_anon === null) {
    _anon = createClient(authConfig.supabaseUrl, authConfig.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: realtimeOptions,
    });
  }
  return _anon;
}
