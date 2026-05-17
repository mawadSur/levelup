/**
 * Regression test for `/certificates/verify/[hash]` after the Wave-3
 * additive shape change (commit 3cb1d20) that added `id` + `storagePath`
 * to the API verify response.
 *
 * The risk: if any consumer happened to be parsing the response with a
 * strict zod schema (or a TypeScript-narrowing destructure that throws on
 * extra keys at runtime — there isn't one in JS, but a layer-defensive
 * caller could still throw), the new fields would break it. We verified by
 * inspection that NO consumer uses `.strict()` against this response; this
 * test belt-and-braces that the page itself renders without throwing when
 * the API returns the new richer shape.
 *
 * Scope is deliberately narrow:
 *  - mock `fetch` to return the NEW response shape (with `id` + `storagePath`)
 *  - mock `@levelup/storage` so we don't need an R2 client at test time
 *  - invoke the server component's default export with the same params
 *    shape Next.js would pass and assert it resolves and returns a tree.
 *
 * We do NOT render to a DOM here — that requires the full RSC pipeline.
 * The page is a server component returning JSX; if any narrowing/throwing
 * happened during the data-shape merge, the awaited call itself would
 * reject. That's the actual regression vector we care about.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@levelup/storage', () => ({
  isR2Configured: () => false,
  getCertificateSignedUrl: vi.fn(async () => null),
}));

// `@/lib/env` validates env at import time — set the env BEFORE the
// dynamic import below so `env.NEXT_PUBLIC_API_URL` resolves to a value
// that doesn't trigger the schema's required-in-prod guard.
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://test.local';
  process.env.NEXT_PUBLIC_CLIENT = 'kapitus';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /certificates/verify/[hash] page — regression on the new id/storagePath shape', () => {
  it(
    'renders without throwing when the verify API returns the new (id + storagePath) shape',
    { timeout: 60_000 },
    async () => {
      const verifyResponse = {
        valid: true,
        certificate: {
          // pre-existing fields the OG image + page both read
          holderName: 'Test Holder',
          pathTitle: 'AI Fundamentals',
          issuedAt: '2026-05-01T00:00:00.000Z',
          organizationName: 'Acme Co',
          // NEW additive fields shipped in commit 3cb1d20
          id: 'cert_01H000000000000000000000',
          storagePath: 'certs/acme/test-holder.pdf',
        },
      };

      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify(verifyResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const mod = await import('../page');
      // Server component default export is async and returns a ReactNode.
      // We don't render it — we just confirm it resolves to a tree value.
      const result = await mod.default({
        params: Promise.resolve({ hash: 'test-hash' }),
      });

      expect(result).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/certificates/verify/test-hash'),
        expect.anything(),
      );
    },
  );

  it(
    'still renders when the verify API returns the OLD shape (no id/storagePath)',
    { timeout: 60_000 },
    async () => {
      const verifyResponse = {
        valid: true,
        certificate: {
          holderName: 'Old Holder',
          pathTitle: 'Legacy Path',
          issuedAt: '2025-12-01T00:00:00.000Z',
          organizationName: 'Old Org',
        },
      };

      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify(verifyResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const mod = await import('../page');
      const result = await mod.default({
        params: Promise.resolve({ hash: 'old-hash' }),
      });

      expect(result).toBeDefined();
    },
  );
});
