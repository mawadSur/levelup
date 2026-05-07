// Profile fetched from Supabase Auth (the canonical fields we need to upsert
// the matching row in `public.User`). `firstName`/`lastName` are optional —
// Supabase stores name fields under `user_metadata` which is free-form.
export interface SupabaseProfile {
  supabaseUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  email: string;
  iat: number;
  exp: number;
}

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Server-side only. Never bundle into the browser. */
  supabaseServiceRoleKey: string;
  /**
   * HMAC SHA-256 secret Supabase Auth uses to sign access tokens (legacy
   * symmetric mode). When the project switches to asymmetric signing this
   * may be unset and `verifyAccessToken` falls back to JWKS.
   */
  supabaseJwtSecret?: string;
  cookieDomain: string;
}

/**
 * Minimal shape of the JWT claims Supabase Auth signs. We don't pull in
 * `@supabase/supabase-js`'s internal types here so this package can be used
 * from contexts where the runtime client isn't desired.
 */
export interface SupabaseJwtClaims {
  sub: string;
  email?: string;
  exp: number;
  iat: number;
  iss?: string;
  aud?: string | string[];
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  /** Supabase emits `role` to distinguish anon / authenticated / service_role. */
  role?: string;
}
