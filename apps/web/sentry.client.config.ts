/**
 * Sentry — Browser SDK init.
 *
 * Skeleton init only:
 *   - reads SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN, SENTRY_ENVIRONMENT,
 *     SENTRY_TRACES_SAMPLE_RATE (default 0.1) from env.
 *   - bails out cleanly (no-op) when DSN is unset OR starts with
 *     `PLACEHOLDER_` so dev / test / CI runs never crash on missing
 *     telemetry config.
 *   - DOES NOT upload source maps (follow-up).
 *
 * TODO (next step) — PII scrubbing: add `beforeSend` to strip
 *   - `event.user.email`, `event.user.ip_address`
 *   - request bodies on `/api/auth/*` and `/api/users/*`
 *   - any header named `authorization` / `cookie`.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? '';
const isEnabled = dsn !== '' && !dsn.startsWith('PLACEHOLDER_');

if (isEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // No release set — source map upload is a follow-up.
  });
}
