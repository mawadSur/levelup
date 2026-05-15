/**
 * apps/web — apiFetch / apiGet / apiPost client tests
 *
 * Mocks the global fetch with vi.spyOn to verify:
 *  - Base URL prepending
 *  - credentials: 'include' is always set
 *  - Content-Type header is only set when a body is present
 *  - ApiError is thrown on 4xx/5xx responses
 *  - 200 returns parsed JSON
 *
 * Run: pnpm --filter @levelup/web test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, apiGet, apiPost, apiDelete } from '../client';
import { ApiError } from '../errors';

// ---- constants --------------------------------------------------------------

// Mirror the SSR/browser branching in apps/web/src/lib/api/client.ts: when
// NEXT_PUBLIC_API_URL is unset, the browser uses a relative '/api' prefix
// and only SSR falls back to 'http://localhost:4000'. vitest's jsdom env
// defines `window`, so the browser branch fires.
const API_BASE =
  process.env['NEXT_PUBLIC_API_URL'] ??
  (typeof window === 'undefined' ? 'http://localhost:4000' : '');
const API_PREFIX = `${API_BASE}/api`;

// ---- helpers ----------------------------------------------------------------

import type { MockInstance } from 'vitest';

// vi.spyOn returns MockInstance (not Mock); use MockInstance so the type is
// compatible with the return of vi.spyOn(globalThis, 'fetch').
type FetchSpy = MockInstance;

function makeMockResponse(status: number, body: unknown): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function captureInit(spy: FetchSpy): RequestInit | undefined {
  const calls = spy.mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall?.[1] as RequestInit | undefined;
}

function captureUrl(spy: FetchSpy): string {
  const calls = spy.mock.calls;
  const lastCall = calls[calls.length - 1];
  return String(lastCall?.[0] ?? '');
}

// ============================================================================
// apiFetch
// ============================================================================

describe('apiFetch', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // URL construction
  // --------------------------------------------------------------------------
  describe('URL construction', () => {
    it('prepends the API base URL and /api prefix', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(200, { ok: true }));
      await apiFetch('/users');
      expect(captureUrl(fetchSpy)).toBe(`${API_PREFIX}/users`);
    });

    it('preserves query strings in the path', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(200, []));
      await apiFetch('/users?role=ADMIN');
      expect(captureUrl(fetchSpy)).toContain('?role=ADMIN');
    });
  });

  // --------------------------------------------------------------------------
  // credentials: 'include'
  // --------------------------------------------------------------------------
  describe('credentials', () => {
    it('always sends credentials: include', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(200, {}));
      await apiFetch('/health');
      expect(captureInit(fetchSpy)?.credentials).toBe('include');
    });
  });

  // --------------------------------------------------------------------------
  // Content-Type
  // --------------------------------------------------------------------------
  describe('Content-Type header', () => {
    it('sets Content-Type: application/json when body is present', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(200, {}));
      await apiFetch('/paths', {
        method: 'POST',
        body: JSON.stringify({ title: 'test' }),
      });
      const headers = captureInit(fetchSpy)?.headers as Record<string, string> | undefined;
      expect(headers?.['Content-Type']).toBe('application/json');
    });

    it('does NOT set Content-Type when body is absent', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(200, {}));
      await apiFetch('/health', { method: 'GET' });
      const headers = captureInit(fetchSpy)?.headers as Record<string, string> | undefined;
      expect(headers?.['Content-Type']).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Success responses
  // --------------------------------------------------------------------------
  describe('success responses', () => {
    it('returns parsed JSON on 200', async () => {
      const body = { id: '123', name: 'Test' };
      fetchSpy.mockResolvedValueOnce(makeMockResponse(200, body));
      const result = await apiFetch<typeof body>('/resource');
      expect(result).toEqual(body);
    });

    it('returns undefined on 204 No Content', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      const result = await apiFetch('/resource');
      expect(result).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Error responses
  // --------------------------------------------------------------------------
  describe('error responses', () => {
    it.each([400, 401, 403, 404, 500])('throws ApiError on %i', async (status) => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(status, { message: `Error ${status}` }));
      await expect(apiFetch(`/resource`)).rejects.toBeInstanceOf(ApiError);
    });

    it('ApiError.status matches HTTP status', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(404, { message: 'Not found' }));
      try {
        await apiFetch('/missing');
        expect.fail('Expected ApiError to be thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        if (err instanceof ApiError) {
          expect(err.status).toBe(404);
        }
      }
    });

    it('ApiError.message uses server message when provided', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(400, { message: 'Validation failed' }));
      try {
        await apiFetch('/data');
        expect.fail('Expected ApiError to be thrown');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          expect(err.message).toBe('Validation failed');
        }
      }
    });

    it('ApiError.code defaults to AUTH_REQUIRED on 401', async () => {
      fetchSpy.mockResolvedValueOnce(makeMockResponse(401, {}));
      try {
        await apiFetch('/me');
        expect.fail('Expected ApiError to be thrown');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          expect(err.code).toBe('AUTH_REQUIRED');
        }
      }
    });

    it('ApiError.code uses server code when provided', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeMockResponse(403, { code: 'PLAN_LIMIT', message: 'Upgrade required' }),
      );
      try {
        await apiFetch('/admin');
        expect.fail('Expected ApiError to be thrown');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          expect(err.code).toBe('PLAN_LIMIT');
        }
      }
    });

    it('handles non-JSON error body gracefully', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('<html>error</html>', {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        }),
      );
      await expect(apiFetch('/resource')).rejects.toBeInstanceOf(ApiError);
    });
  });
});

// ============================================================================
// apiGet
// ============================================================================

describe('apiGet', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses GET method', async () => {
    fetchSpy.mockResolvedValueOnce(makeMockResponse(200, []));
    await apiGet('/paths');
    expect(captureInit(fetchSpy)?.method).toBe('GET');
  });

  it('appends query parameters', async () => {
    fetchSpy.mockResolvedValueOnce(makeMockResponse(200, []));
    await apiGet('/users', { params: { role: 'ADMIN', page: 1 } });
    expect(captureUrl(fetchSpy)).toContain('role=ADMIN');
    expect(captureUrl(fetchSpy)).toContain('page=1');
  });

  it('omits null/undefined query params', async () => {
    fetchSpy.mockResolvedValueOnce(makeMockResponse(200, []));
    await apiGet('/users', { params: { role: undefined, name: null, page: 2 } });
    const url = captureUrl(fetchSpy);
    expect(url).not.toContain('role');
    expect(url).not.toContain('name');
    expect(url).toContain('page=2');
  });
});

// ============================================================================
// apiPost
// ============================================================================

describe('apiPost', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses POST method', async () => {
    fetchSpy.mockResolvedValueOnce(makeMockResponse(201, { id: '1' }));
    await apiPost('/paths', { title: 'My Path' });
    expect(captureInit(fetchSpy)?.method).toBe('POST');
  });

  it('serialises the body as JSON', async () => {
    fetchSpy.mockResolvedValueOnce(makeMockResponse(201, { id: '1' }));
    const payload = { title: 'Test', slug: 'test' };
    await apiPost('/paths', payload);
    expect(captureInit(fetchSpy)?.body).toBe(JSON.stringify(payload));
  });
});

// ============================================================================
// apiDelete
// ============================================================================

describe('apiDelete', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses DELETE method', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await apiDelete('/paths/1');
    expect(captureInit(fetchSpy)?.method).toBe('DELETE');
  });
});
