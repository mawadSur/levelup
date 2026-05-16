/**
 * Sentry — Node server-side init for the worker process.
 *
 * Skeleton only:
 *   - reads SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE
 *     (default 0.1) from env.
 *   - bails out cleanly (no-op) when DSN is unset OR starts with
 *     `PLACEHOLDER_` so dev / test / CI runs never crash on missing
 *     telemetry config.
 *   - DOES NOT upload source maps (follow-up).
 *
 * TODO (next step) — PII scrubbing: add `beforeSend` to strip
 *   - `event.user.email`, `event.user.ip_address`
 *   - any job payload field containing email / phone (Resend send-email
 *     handler in particular).
 *
 * IMPORTANT: this module must be imported before
 * `./observability/start.js` so Sentry's auto-instrumentation patches
 * Node core before OTel runs through it.
 */

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN ?? '';
const isEnabled = dsn !== '' && !dsn.startsWith('PLACEHOLDER_');

// IMPORTANT: side-effecting init at MODULE EVALUATION time so Sentry attaches
// to Node core before the OTel start module is evaluated. See the API
// equivalent (apps/api/src/observability/sentry.ts) for the full rationale.
if (isEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
}

/**
 * No-op marker so callers in `main.ts` can `import` this module for its
 * side-effects under a named entry point that's easy to grep for.
 */
export function initSentry(): void {
  /* intentionally empty — see module-level init above */
}
