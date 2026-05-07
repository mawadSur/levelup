import { z } from 'zod';

// Any non-empty string is accepted: real credentials at runtime, PLACEHOLDER_* values during dev stub mode.
function secretOrPlaceholder(): z.ZodString {
  return z.string().min(1);
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().default('http://localhost:3000'),

    DATABASE_URL: secretOrPlaceholder(),
    DIRECT_DATABASE_URL: z.string().optional(),
    REDIS_URL: secretOrPlaceholder(),
    OPENAI_API_KEY: secretOrPlaceholder(),
    SUPABASE_URL: secretOrPlaceholder(),
    SUPABASE_ANON_KEY: secretOrPlaceholder(),
    SUPABASE_SERVICE_ROLE_KEY: secretOrPlaceholder(),
    SUPABASE_JWT_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: secretOrPlaceholder(),
    STRIPE_WEBHOOK_SECRET: secretOrPlaceholder(),
    RESEND_API_KEY: secretOrPlaceholder(),
    COOKIE_DOMAIN: z.string().optional(),

    // PostHog analytics — optional; absent or PLACEHOLDER_ → stub mode.
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),

    // SEV-5: keyed HMAC signing for certificate verification.
    // ≥32 chars to ensure adequate entropy when developers generate one.
    CERT_SIGNING_SECRET: z.string().min(32, 'CERT_SIGNING_SECRET must be at least 32 chars'),

    // ----- Slack integration -----------------------------------------------
    // All optional; SlackService.requireEnv() throws BadRequest at request time
    // if a required var is absent when the flow is triggered. The signing
    // secret guard skips verification in dev when PLACEHOLDER_ is set.
    SLACK_CLIENT_ID: z.string().optional(),
    SLACK_CLIENT_SECRET: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    /** base64-encoded 32-byte AES key for encrypting OAuth tokens at rest. */
    INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // SEV-5 (production-only): refuse to boot with a placeholder cert secret.
    // Lets local dev keep using `PLACEHOLDER_…` while keeping prod honest.
    if (data.NODE_ENV === 'production' && data.CERT_SIGNING_SECRET.startsWith('PLACEHOLDER_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CERT_SIGNING_SECRET'],
        message: 'CERT_SIGNING_SECRET must not be a PLACEHOLDER_ value in production',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  return result.data;
}

export function zodValidate(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  return result.data;
}
