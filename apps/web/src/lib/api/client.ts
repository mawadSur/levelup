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
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000';

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
interface RawErrorBody {
  message?: string;
  code?: string;
  requestId?: string;
  error?: string;
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

    throw new ApiError({
      message: rawBody.message ?? rawBody.error ?? `Request failed with status ${response.status}`,
      status: response.status,
      code: rawBody.code ?? defaultCodeForStatus(response.status),
      requestId: rawBody.requestId,
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
    throw new ApiError({
      message:
        rawBody.message ?? rawBody.error ?? `Stream request failed with status ${response.status}`,
      status: response.status,
      code: rawBody.code ?? defaultCodeForStatus(response.status),
      requestId: rawBody.requestId,
    });
  }

  return response;
}
