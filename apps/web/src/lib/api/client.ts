import {
  ApiError,
  AUTH_REQUIRED,
  NOT_FOUND,
  FORBIDDEN,
  VALIDATION_ERROR,
  PLAN_LIMIT,
  RATE_LIMITED,
  INTERNAL_ERROR,
} from './errors';

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
//
// Production browser calls go through the Vercel `/api/*` rewrite (declared
// in apps/web/vercel.json) so they're same-origin and session cookies are
// sent normally. NEXT_PUBLIC_API_URL is only honored when explicitly set
// (dev points it at http://localhost:4000) — otherwise we default to a
// relative `/api` prefix on the browser side. SSR helpers attach the
// session cookie manually and use the absolute API URL, so they're
// unaffected.
const explicit =
  typeof process !== 'undefined' && typeof process.env.NEXT_PUBLIC_API_URL === 'string'
    ? process.env.NEXT_PUBLIC_API_URL
    : undefined;

const API_BASE = explicit ?? (typeof window === 'undefined' ? 'http://localhost:4000' : '');

const API_PREFIX = `${API_BASE}/api`;

// ---------------------------------------------------------------------------
// Auth header injection
// ---------------------------------------------------------------------------
//
// Web ↔ API runs cross-origin (3000 vs 4000) so cookies don't propagate
// reliably. In the browser we pull the Supabase access token and attach it as
// a Bearer header. Server-side callers (server components, route handlers)
// should set the Authorization header themselves before calling.

async function getBearerHeader(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Stub-mode dev-bypass stashes the access token in localStorage.
  try {
    const dev = window.localStorage.getItem('levelup_dev_access_token');
    if (typeof dev === 'string' && dev.length > 0) return `Bearer ${dev}`;
  } catch {
    // localStorage unavailable (private mode etc.) — fall through.
  }

  try {
    const mod = await import('../supabase/client');
    if (!mod.isSupabaseConfiguredOnClient()) return null;
    const supabase = mod.getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (typeof token === 'string' && token.length > 0) return `Bearer ${token}`;
  } catch {
    // Ignore — request will go out unauthenticated and the API will 401.
  }
  return null;
}

// ---------------------------------------------------------------------------
// Raw error body shape (what the server sends)
// ---------------------------------------------------------------------------
/**
 * The API's GlobalExceptionFilter wraps every error in a nested envelope:
 *   { error: { code, message, requestId, ...extras } }
 * Some legacy paths still send a flat shape, so we tolerate both.
 */
interface RawErrorBody {
  // Flat-shape fallback
  message?: string;
  code?: string;
  requestId?: string;
  // Nested envelope (current standard)
  error?: string | { code?: string; message?: string; requestId?: string; [k: string]: unknown };
}

function extractErrorFields(raw: RawErrorBody): {
  message?: string;
  code?: string;
  requestId?: string;
} {
  if (raw.error && typeof raw.error === 'object') {
    return {
      message: raw.error.message,
      code: raw.error.code,
      requestId: raw.error.requestId,
    };
  }
  return {
    message: raw.message ?? (typeof raw.error === 'string' ? raw.error : undefined),
    code: raw.code,
    requestId: raw.requestId,
  };
}

// ---------------------------------------------------------------------------
// Map HTTP status → default error code
// ---------------------------------------------------------------------------
function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 401:
      return AUTH_REQUIRED;
    case 402:
      return PLAN_LIMIT;
    case 403:
      return FORBIDDEN;
    case 404:
      return NOT_FOUND;
    case 422:
      return VALIDATION_ERROR;
    case 429:
      return RATE_LIMITED;
    default:
      return INTERNAL_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
export async function apiFetch<TResponse = unknown>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<TResponse> {
  const url = `${API_PREFIX}${path}`;

  const hasBody = init?.body !== undefined && init.body !== null;
  const bearer = await getBearerHeader();

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(bearer !== null ? { Authorization: bearer } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let rawBody: RawErrorBody = {};
    try {
      rawBody = (await response.json()) as RawErrorBody;
    } catch {
      // body is not JSON — keep defaults
    }

    const fields = extractErrorFields(rawBody);
    throw new ApiError({
      message: fields.message ?? `Request failed with status ${response.status}`,
      status: response.status,
      code: fields.code ?? defaultCodeForStatus(response.status),
      requestId: fields.requestId,
    });
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------
export async function apiGet<TResponse = unknown>(
  path: string,
  opts?: {
    params?: Record<string, string | number | boolean | undefined | null>;
    signal?: AbortSignal;
  },
): Promise<TResponse> {
  let fullPath = path;
  if (opts?.params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) {
        qs.set(k, String(v));
      }
    }
    const str = qs.toString();
    if (str) fullPath = `${path}?${str}`;
  }
  return apiFetch<TResponse>(fullPath, { method: 'GET', signal: opts?.signal });
}

export async function apiPost<TBody = unknown, TResponse = unknown>(
  path: string,
  body: TBody,
  opts?: { signal?: AbortSignal },
): Promise<TResponse> {
  return apiFetch<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
}

export async function apiPatch<TBody = unknown, TResponse = unknown>(
  path: string,
  body: TBody,
  opts?: { signal?: AbortSignal },
): Promise<TResponse> {
  return apiFetch<TResponse>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
}

export async function apiPut<TBody = unknown, TResponse = unknown>(
  path: string,
  body: TBody,
  opts?: { signal?: AbortSignal },
): Promise<TResponse> {
  return apiFetch<TResponse>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
}

export async function apiDelete<TResponse = unknown>(
  path: string,
  opts?: { signal?: AbortSignal },
): Promise<TResponse> {
  return apiFetch<TResponse>(path, { method: 'DELETE', signal: opts?.signal });
}

// ---------------------------------------------------------------------------
// Streaming helper (for SSE/ndjson endpoints)
// ---------------------------------------------------------------------------
export async function apiFetchStream(
  path: string,
  body: unknown,
  opts?: { signal?: AbortSignal },
): Promise<Response> {
  const url = `${API_PREFIX}${path}`;
  const bearer = await getBearerHeader();
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(bearer !== null ? { Authorization: bearer } : {}),
    },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });

  if (!response.ok) {
    let rawBody: RawErrorBody = {};
    try {
      rawBody = (await response.json()) as RawErrorBody;
    } catch {
      // ignore
    }
    const fields = extractErrorFields(rawBody);
    throw new ApiError({
      message: fields.message ?? `Stream request failed with status ${response.status}`,
      status: response.status,
      code: fields.code ?? defaultCodeForStatus(response.status),
      requestId: fields.requestId,
    });
  }

  return response;
}
