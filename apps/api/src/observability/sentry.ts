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
 * PII scrubbing: see `beforeSend` below — strips user email/ip, drops
 * request bodies on /api/auth/* and /api/users/*, removes
 * authorization/cookie headers, and recursively scrubs any
 * password/token/secret/apiKey keys in `event.extra` / `event.contexts`.
 *
 * IMPORTANT: this module must be imported before
 * `import './observability/start'` so Sentry's auto-instrumentation
 * patches Node core before OTel runs through it.
 */

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN ?? '';
const isEnabled = dsn !== '' && !dsn.startsWith('PLACEHOLDER_');

const SENSITIVE_URL_PATTERNS = [/^\/api\/auth\//, /^\/api\/users\//];
const SENSITIVE_KEY_RE = /^(password|token|secret|apiKey)$/i;

function scrubKeysDeep(node: unknown, seen: WeakSet<object> = new WeakSet()): void {
  if (node === null || typeof node !== 'object') return;
  if (seen.has(node as object)) return;
  seen.add(node as object);
  if (Array.isArray(node)) {
    for (const child of node) scrubKeysDeep(child, seen);
    return;
  }
  for (const key of Object.keys(node as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      (node as Record<string, unknown>)[key] = '[scrubbed]';
      continue;
    }
    scrubKeysDeep((node as Record<string, unknown>)[key], seen);
  }
}

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.user) {
    if (event.user.email !== undefined) event.user.email = '[scrubbed]';
    if (event.user.ip_address !== undefined) event.user.ip_address = '[scrubbed]';
  }
  if (event.request) {
    const url = typeof event.request.url === 'string' ? event.request.url : '';
    try {
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      if (SENSITIVE_URL_PATTERNS.some((re) => re.test(path))) {
        delete event.request.data;
      }
    } catch {
      delete event.request.data;
    }
    if (event.request.headers && typeof event.request.headers === 'object') {
      const headers = event.request.headers as Record<string, unknown>;
      for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === 'authorization' || k.toLowerCase() === 'cookie') {
          delete headers[k];
        }
      }
    }
  }
  if (event.extra) scrubKeysDeep(event.extra);
  if (event.contexts) scrubKeysDeep(event.contexts);
  return event;
}

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
    beforeSend(event) {
      return scrubEvent(event);
    },
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
