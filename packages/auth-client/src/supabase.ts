import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authConfig, isStubMode } from './config.js';

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
    });
  }
  return _anon;
}
