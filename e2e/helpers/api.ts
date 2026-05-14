/**
 * Low-level helper to call /api endpoints during test setup and teardown.
 *
 * All functions that need an authenticated session accept a `sessionCookie`
 * string (the value of the sb-stub-auth-token cookie) so that tests can
 * perform privileged operations without a browser.
 */

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';

// Cookie name must match the one set by handleStubSignIn and read by auth.guard.
const SESSION_COOKIE_NAME = 'sb-stub-auth-token';

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
    headers['Cookie'] = `${SESSION_COOKIE_NAME}=${sessionCookie}`;
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

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export interface CheckoutSessionResponse {
  url: string | null;
  sessionId: string | null;
  salesLed?: boolean;
  contactEmail?: string;
}

export async function startCheckout(
  sessionCookie: string,
  body: {
    plan: 'STARTER' | 'TEAM' | 'GROWTH' | 'ENTERPRISE';
    interval?: 'MONTHLY' | 'ANNUAL';
    quantity?: number;
  },
): Promise<CheckoutSessionResponse> {
  return apiCall<CheckoutSessionResponse>('/billing/checkout', {
    method: 'POST',
    sessionCookie,
    body,
  });
}

// ---------------------------------------------------------------------------
// Stripe webhook — exposed for idempotency tests. NOTE: in stub mode the
// API short-circuits and returns { received: true } without writing any
// audit rows. The idempotency check is therefore "does the second call also
// return 200/{received:true}?" — which it always does in stub mode.
// ---------------------------------------------------------------------------

export async function postStripeWebhook(
  rawBody: string,
  signature: string,
  eventId: string,
): Promise<{ status: number; body: { received?: boolean } }> {
  const res = await fetch(`${API_BASE}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
      'x-stub-event-id': eventId,
    },
    body: rawBody,
  });
  const body = (await res.json().catch(() => ({}))) as { received?: boolean };
  return { status: res.status, body };
}

// ---------------------------------------------------------------------------
// Curriculum / progress (for cert auto-issuance)
// ---------------------------------------------------------------------------

export interface CurriculumLessonNode {
  id: string;
  slug: string;
  title: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}
export interface CurriculumPathNode {
  id: string;
  slug: string;
  title: string;
  progress: { completed: number; total: number };
  lessons: CurriculumLessonNode[];
}
export interface CurriculumTierNode {
  tier: string;
  paths: CurriculumPathNode[];
}

export async function getMyCurriculum(
  sessionCookie: string,
): Promise<{ tiers: CurriculumTierNode[] }> {
  return apiCall<{ tiers: CurriculumTierNode[] }>('/curriculum/me', { sessionCookie });
}

export async function startLesson(lessonId: string, sessionCookie: string): Promise<unknown> {
  return apiCall(`/progress/lessons/${lessonId}/start`, {
    method: 'POST',
    sessionCookie,
    body: {},
  });
}

export async function completeLesson(
  lessonId: string,
  sessionCookie: string,
): Promise<{ certificateCreated?: boolean }> {
  return apiCall(`/progress/lessons/${lessonId}/complete`, {
    method: 'POST',
    sessionCookie,
    body: {},
  });
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export interface MyCertificate {
  id: string;
  learningPathId: string;
  signedHash: string;
  pdfUrl: string | null;
  issuedAt: string;
  learningPath: { title: string };
}

export async function listMyCertificates(sessionCookie: string): Promise<MyCertificate[]> {
  return apiCall<MyCertificate[]>('/certificates/me', { sessionCookie });
}

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

export interface DataExportRow {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'EXPIRED' | 'FAILED';
  fileUrl: string | null;
  fileSizeBytes: number | null;
  expiresAt: string | null;
  failedReason: string | null;
  requestedAt: string;
  readyAt: string | null;
}

export interface DeletionRow {
  id: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  scheduledFor: string;
  reason: string | null;
  requestedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}

export async function listExports(sessionCookie: string): Promise<DataExportRow[]> {
  return apiCall<DataExportRow[]>('/privacy/exports', { sessionCookie });
}

export async function requestExport(sessionCookie: string): Promise<DataExportRow> {
  return apiCall<DataExportRow>('/privacy/exports', {
    method: 'POST',
    sessionCookie,
    body: {},
  });
}

export async function listDeletions(sessionCookie: string): Promise<DeletionRow[]> {
  return apiCall<DeletionRow[]>('/privacy/deletions', { sessionCookie });
}

export async function requestDeletion(
  sessionCookie: string,
  reason?: string,
): Promise<DeletionRow> {
  return apiCall<DeletionRow>('/privacy/deletions', {
    method: 'POST',
    sessionCookie,
    body: reason ? { reason } : {},
  });
}

export async function cancelDeletion(id: string, sessionCookie: string): Promise<DeletionRow> {
  return apiCall<DeletionRow>(`/privacy/deletions/${id}/cancel`, {
    method: 'POST',
    sessionCookie,
    body: {},
  });
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export interface PolicyRow {
  id: string;
  version: number;
  policyText: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export async function listPolicies(sessionCookie: string): Promise<PolicyRow[]> {
  return apiCall<PolicyRow[]>('/policies', { sessionCookie });
}

export async function publishPolicy(
  sessionCookie: string,
  body: {
    policyText: string;
    approvedTools: Array<{ name: string; tier: 'approved' | 'caution' | 'banned'; notes?: string }>;
  },
): Promise<PolicyRow> {
  return apiCall<PolicyRow>('/policies', {
    method: 'POST',
    sessionCookie,
    body,
  });
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

export interface GovernanceReportRequestResponse {
  requestId: string;
}

export interface GovernanceReportStatusResponse {
  requestId: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  signedUrl: string | null;
  error: string | null;
}

export async function generateGovernanceReport(
  sessionCookie: string,
  body: { periodLabel?: string; windowDays?: number } = {},
): Promise<GovernanceReportRequestResponse> {
  return apiCall<GovernanceReportRequestResponse>('/governance/report', {
    method: 'POST',
    sessionCookie,
    body,
  });
}

export async function getGovernanceReportStatus(
  requestId: string,
  sessionCookie: string,
): Promise<GovernanceReportStatusResponse> {
  return apiCall<GovernanceReportStatusResponse>(
    `/governance/report/${encodeURIComponent(requestId)}`,
    { sessionCookie },
  );
}

// ---------------------------------------------------------------------------
// Polling helper — generic
// ---------------------------------------------------------------------------

export async function pollFor<T>(
  fn: () => Promise<T | null>,
  opts: { timeoutMs?: number; intervalMs?: number; label?: string } = {},
): Promise<T | null> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const intervalMs = opts.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await fn().catch(() => null);
    if (result !== null && result !== undefined) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
