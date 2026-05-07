'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client for the browser. Creates it lazily
 * because env vars are read once at module load and we don't want to crash
 * server-side imports that pull this file in (e.g. type-only references).
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (_client === null) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

export function isSupabaseConfiguredOnClient(): boolean {
  return (
    SUPABASE_URL !== '' &&
    SUPABASE_ANON_KEY !== '' &&
    !SUPABASE_URL.startsWith('PLACEHOLDER_') &&
    !SUPABASE_ANON_KEY.startsWith('PLACEHOLDER_')
  );
}
