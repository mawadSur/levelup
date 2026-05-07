/**
 * @levelup/queue — JOBS catalog unit tests
 *
 * Tests the structure and entries of the JOBS catalog. Because BullMQ tries to
 * connect to Redis at queue creation time, we test only the static `JOBS`
 * object here (no queue instantiation). The Redis-dependent helpers
 * (getQueue, enqueue*) require a live Redis and are covered by integration tests.
 *
 * Run: pnpm --filter @levelup/queue test
 */

// Prevent BullMQ from actually connecting to Redis during import of queues.ts
// by not importing getQueue/enqueue* helpers — we only import the JOBS catalog.
process.env['REDIS_URL'] = 'redis://localhost:6379'; // value doesn't matter for static tests
process.env['NODE_ENV'] = 'test';

import { describe, it, expect } from 'vitest';
import { JOBS } from './jobs.js';
import type { JobName } from './types.js';

// ============================================================================
// JOBS catalog
// ============================================================================

describe('JOBS catalog', () => {
  const expectedJobNames: JobName[] = [
    'cert-pdf',
    'report-aggregate',
    'embed-content',
    'send-email',
    'data-export',
    'audit-cleanup',
    'manager-digest-cron',
    'path-generation',
    'anomaly-scan',
  ];

  it('has exactly the expected number of entries', () => {
    expect(Object.keys(JOBS)).toHaveLength(expectedJobNames.length);
  });

  it.each(expectedJobNames)('contains entry "%s"', (name) => {
    expect(JOBS).toHaveProperty(name);
  });

  it.each(expectedJobNames)('entry "%s" has a non-empty queue name', (name) => {
    expect(typeof JOBS[name].queue).toBe('string');
    expect(JOBS[name].queue.length).toBeGreaterThan(0);
  });

  it('cert-pdf queue is named "cert-pdf"', () => {
    expect(JOBS['cert-pdf'].queue).toBe('cert-pdf');
  });

  it('report-aggregate queue is named "report-aggregate"', () => {
    expect(JOBS['report-aggregate'].queue).toBe('report-aggregate');
  });

  it('embed-content queue is named "embed-content"', () => {
    expect(JOBS['embed-content'].queue).toBe('embed-content');
  });

  it('send-email queue is named "send-email"', () => {
    expect(JOBS['send-email'].queue).toBe('send-email');
  });

  it('audit-cleanup queue is named "audit-cleanup"', () => {
    expect(JOBS['audit-cleanup'].queue).toBe('audit-cleanup');
  });

  it('all entries have defaultOpts defined', () => {
    for (const [, reg] of Object.entries(JOBS)) {
      // defaultOpts may be the shared object or a job-specific override, but must exist
      expect(reg.defaultOpts).toBeDefined();
    }
  });

  // TS compile-time check: passing a wrong job name to JOBS is a type error.
  // The @ts-expect-error comment proves the type guard works at compile time.
  it('TypeScript prevents accessing an unknown job name (compile-time check)', () => {
    // @ts-expect-error — 'unknown-job' is not a valid JobName
    const bad = JOBS['unknown-job'];
    // At runtime the key simply returns undefined; the value of this test is
    // the compile-time error annotation above.
    expect(bad).toBeUndefined();
  });
});
