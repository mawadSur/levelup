import type { AuthConfig } from './types.js';

const STUB_PREFIX = 'PLACEHOLDER_';

function readEnv(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val !== undefined && val !== '') return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`[auth-client] Missing required environment variable: ${key}`);
}

export function isStubMode(): boolean {
  const url = process.env['SUPABASE_URL'] ?? '';
  const anon = process.env['SUPABASE_ANON_KEY'] ?? '';
  return url === '' || anon === '' || url.startsWith(STUB_PREFIX) || anon.startsWith(STUB_PREFIX);
}

function buildConfig(): AuthConfig {
  const stub = isStubMode();

  const supabaseUrl = readEnv('SUPABASE_URL', stub ? 'PLACEHOLDER_supabase_url' : '');
  const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', stub ? 'PLACEHOLDER_supabase_anon' : '');
  const supabaseServiceRoleKey = readEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    stub ? 'PLACEHOLDER_supabase_service_role' : '',
  );
  const supabaseJwtSecret = process.env['SUPABASE_JWT_SECRET'] ?? '';

  const cookieDomain = readEnv('COOKIE_DOMAIN', 'localhost');

  // Note: the previous prod-stub policy throw was here at module-load time.
  // That broke Next.js prod builds on Vercel for any page whose module graph
  // touched @levelup/auth-client even transitively — even pages that never
  // call getServiceRoleClient() / getAnonClient(). The downstream Supabase
  // client lookups already throw clear "called in stub mode" errors at first
  // real use, so the eager check at config-load was both redundant and
  // fatal during page-data collection. See assertSupabaseConfiguredOrStub()
  // for the deferred version that callers can opt into.

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    supabaseJwtSecret: supabaseJwtSecret === '' ? undefined : supabaseJwtSecret,
    cookieDomain,
  };
}

export const authConfig: AuthConfig = buildConfig();

/**
 * Deferred prod-stub guard. Call from sites that actually need real Supabase
 * credentials (the service-role / anon client constructors do this already
 * via their own isStubMode() throws — this helper exists for callers that
 * want the explicit "you're in production with placeholder env" message
 * earlier than the SDK call). NEVER call from module-load — it would
 * regress the Vercel build failure this defer was designed to fix.
 */
export function assertProdConfigured(): void {
  if (process.env['NODE_ENV'] === 'production' && isStubMode()) {
    throw new Error(
      '[auth-client] isStubMode() is true in a NODE_ENV=production environment. ' +
        'Set real SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY before deploying.',
    );
  }
}
