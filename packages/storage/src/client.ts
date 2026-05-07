/**
 * Lazily-constructed Supabase service-role client.
 *
 * Service role bypasses RLS — never expose this client to a browser.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { storageConfig, isStubMode } from './config';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (isStubMode()) {
    throw new Error('[storage] getSupabase() called while in stub mode — this is a bug');
  }
  if (_client === null) {
    _client = createClient(storageConfig.supabaseUrl, storageConfig.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _client;
}
