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

  if (process.env['NODE_ENV'] === 'production' && stub) {
    throw new Error(
      '[auth-client] isStubMode() is true in a NODE_ENV=production environment. ' +
        'Set real SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY before deploying.',
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    supabaseJwtSecret: supabaseJwtSecret === '' ? undefined : supabaseJwtSecret,
    cookieDomain,
  };
}

export const authConfig: AuthConfig = buildConfig();
