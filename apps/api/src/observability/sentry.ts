/**
 * Sentry — Node server-side init for the API.
 *
 * Skeleton only:
 *   - reads SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE
 *     (default 0.1) from env.
 *   - bails out cleanly (no-op) when DSN is unset OR starts with
 *     `PLACEHOLDER_` so dev / test / CI runs never crash on missing
 *     telemetry config. The Sentry SDK is also internally no-op when
 *     `Sentry.init` is never called, so unrelated `Sentry.captureException`
 *     calls remain safe.
 *   - registers process-level handlers (`uncaughtException`,
 *     `unhandledRejection`) via `Sentry.setupFastifyErrorHandler` /
 *     equivalents — for Node we use the SDK's process-level integrations
 *     which the v8 init wires in by default.
 *   - DOES NOT upload source maps (follow-up).
 *
 * TODO (next step) — PII scrubbing: add `beforeSend` to strip
 *   - `event.user.email`, `event.user.ip_address`
 *   - request bodies on `/api/auth/*` and `/api/users/*`
 *   - any header named `authorization` / `cookie`.
 *
 * IMPORTANT: this module must be imported before
 * `import './observability/start'` so Sentry's auto-instrumentation
 * patches Node core before OTel runs through it.
 */

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN ?? '';
const isEnabled = dsn !== '' && !dsn.startsWith('PLACEHOLDER_');

// IMPORTANT: this side-effecting init runs at MODULE EVALUATION time. ES
// modules hoist imports above any statement in the importing file, so the
// only way to guarantee Sentry initialises BEFORE OTel patches Node core is
// to do it here, and import this module BEFORE `./observability/start`.
// `Sentry.init` is synchronous — it patches Node's `process` and the
// SDK-level integrations immediately, so by the time OTel's module is
// evaluated next, Sentry is already attached. In stub mode (no DSN or
// PLACEHOLDER_) we skip init entirely; the @sentry/node SDK no-ops every
// capture call when init was never called, so unrelated `Sentry.*` calls
// elsewhere in the codebase remain safe.
if (isEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Process-level handlers are enabled by default in @sentry/node v8 — the
    // `onUncaughtException` and `onUnhandledRejection` integrations are
    // auto-registered. We do not override them here.
  });
}

/**
 * No-op marker so callers in `main.ts` can `import` this module for its
 * side-effects under a named entry point that's easy to grep for. The real
 * init has already happened above by the time anyone calls this.
 */
export function initSentry(): void {
  /* intentionally empty — see module-level init above */
}
