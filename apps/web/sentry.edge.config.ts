/**
 * Sentry — Next.js Edge runtime (middleware + edge routes) init.
 *
 * Skeleton only — see sentry.client.config.ts for the broader rationale and
 * the PII-scrubbing TODO.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? '';
const isEnabled = dsn !== '' && !dsn.startsWith('PLACEHOLDER_');

if (isEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
}
