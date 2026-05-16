/**
 * Sentry — Next.js Node server runtime init.
 *
 * Skeleton only — see sentry.client.config.ts for the broader rationale.
 * PII scrubbing: see `beforeSend` below.
 */

import * as Sentry from '@sentry/nextjs';

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

if (isEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
