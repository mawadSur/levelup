/**
 * Low-level helper to call /api endpoints during test setup and teardown.
 *
 * All functions that need an authenticated session accept a `sessionCookie`
 * string (the value of the LEVELUP_SESSION cookie) so that tests can perform
 * privileged operations without a browser.
 */

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------

interface ApiCallOptions {
  method?: string;
  body?: unknown;
  sessionCookie?: string;
  signal?: AbortSignal;
}

export async function apiCall<T = unknown>(
  path: string,
  { method = 'GET', body, sessionCookie, signal }: ApiCallOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionCookie) {
    headers['Cookie'] = `LEVELUP_SESSION=${sessionCookie}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // ignore parse error
    }
    throw new Error(`[e2e/api] ${method} ${path} failed: ${message}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface MeResponse {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export async function getMe(sessionCookie: string): Promise<MeResponse> {
  return apiCall<MeResponse>('/auth/me', { sessionCookie });
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

export async function listInvitations(sessionCookie: string): Promise<InvitationRecord[]> {
  return apiCall<InvitationRecord[]>('/invitations', { sessionCookie });
}

export async function revokeInvitation(id: string, sessionCookie: string): Promise<void> {
  return apiCall<void>(`/invitations/${id}/revoke`, {
    method: 'POST',
    sessionCookie,
  });
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export interface PromptRecord {
  id: string;
  title: string;
  promptText: string;
  category: string;
  isShared: boolean;
  authorId: string;
  createdAt: string;
}

export async function listPrompts(
  sessionCookie: string,
  params?: { q?: string; category?: string },
): Promise<PromptRecord[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category) qs.set('category', params.category);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiCall<PromptRecord[]>(`/prompts${query}`, { sessionCookie });
}

export async function deletePrompt(id: string, sessionCookie: string): Promise<void> {
  return apiCall<void>(`/prompts/${id}`, {
    method: 'DELETE',
    sessionCookie,
  });
}
