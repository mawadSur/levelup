import { apiFetch, apiGet, apiDelete, apiPost, apiFetchStream } from './client';
import { ApiError, INTERNAL_ERROR, RATE_LIMITED } from './errors';
import {
  coachRequestSchema,
  coachResponseSchema,
  type CoachRequest,
  type CoachResponse,
  type ConversationDetail,
  type ConversationSummary,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Streaming output types
// ---------------------------------------------------------------------------
export type CoachDeltaField = 'explanation' | 'improvedPrompt' | 'whyItWorks' | 'nextAction';

export interface CoachDeltaEvent {
  type: 'delta';
  field: CoachDeltaField;
  text: string;
}

export interface CoachOutput {
  explanation: string;
  improvedPrompt: string;
  whyItWorks: string;
  nextAction: string;
}

export interface CoachFinalEvent {
  type: 'final';
  output: CoachOutput;
}

/**
 * Fired up-front (before any deltas) so the client can pin its `?c=<id>` URL
 * to the freshly-created conversation immediately.
 */
export interface CoachConversationEvent {
  type: 'conversation';
  conversationId: string;
  isNew: boolean;
}

/**
 * Fired after the LLM stream finalises, once the persistence step has
 * completed. Carries the legacy session id (when saveSession is true) plus
 * the canonical conversation/turn ids.
 */
export interface CoachSessionEvent {
  type: 'session';
  sessionId: string | null;
  conversationId: string;
  turnId: string;
}

export type CoachStreamEvent =
  | CoachDeltaEvent
  | CoachFinalEvent
  | CoachConversationEvent
  | CoachSessionEvent;

// ---------------------------------------------------------------------------
// Session shapes — kept for back-compat with old callers.
// ---------------------------------------------------------------------------
export interface CoachSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CoachSessionDetail extends CoachSession {
  messages: CoachMessage[];
}

// ---------------------------------------------------------------------------
// Conversation shapes — re-export from @levelup/types so the rest of the app
// has a single canonical type.
// ---------------------------------------------------------------------------
export type { ConversationSummary, ConversationDetail } from '@levelup/types';

// ---------------------------------------------------------------------------
// Non-streaming invoke (full response, no streaming)
//
// Carries an optional `conversationId`. Response payload includes
// `conversationId` (always) and `turnId` so the client can pin to the thread.
// ---------------------------------------------------------------------------

export interface InvokeCoachResult extends CoachResponse {
  conversationId: string;
  turnId: string;
}

export async function invokeCoach(input: CoachRequest): Promise<InvokeCoachResult> {
  const parsed = coachRequestSchema.parse(input);
  // The API's CoachModule body schema uses `userInput`, not `inputText` —
  // see apps/api/src/modules/coach/dto/coach-request.dto.ts. Translate on
  // the wire so the canonical `coachRequestSchema` keeps `inputText` for
  // type ergonomics.
  const wireBody = { userInput: parsed.inputText, conversationId: parsed.conversationId };
  const json = await apiFetch<unknown>('/coach/invoke', {
    method: 'POST',
    body: JSON.stringify(wireBody),
  });
  // The server returns the canonical CoachResponse plus
  // `{ conversationId, turnId }`. Validate the canonical shape and pull the
  // extras off defensively.
  const response = coachResponseSchema.parse(json);
  const extras = json as { conversationId?: unknown; turnId?: unknown };
  const conversationId = typeof extras.conversationId === 'string' ? extras.conversationId : '';
  const turnId = typeof extras.turnId === 'string' ? extras.turnId : '';
  return { ...response, conversationId, turnId };
}

// ---------------------------------------------------------------------------
// Streaming invoke — returns an async generator of parsed SSE events
// ---------------------------------------------------------------------------
export async function* streamCoach(
  input: CoachRequest,
  opts?: { signal?: AbortSignal },
): AsyncGenerator<CoachStreamEvent> {
  const parsed = coachRequestSchema.parse(input);
  // See invokeCoach above for the inputText → userInput translation.
  const wireBody = { userInput: parsed.inputText, conversationId: parsed.conversationId };
  const response = await apiFetchStream('/coach/stream', wireBody, opts);

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const parts = buffer.split('\n\n');
      // Keep the last (potentially incomplete) part in the buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const event = parseSseEvent(part.trim());
        if (event) {
          yield event;
        }
      }
    }

    // Flush any remaining buffer content
    if (buffer.trim()) {
      const event = parseSseEvent(buffer.trim());
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// SSE event parser
// ---------------------------------------------------------------------------
function parseSseEvent(raw: string): CoachStreamEvent | null {
  if (!raw) return null;

  let eventType = '';
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  const dataStr = dataLines.join('\n');
  if (!dataStr) return null;

  let data: unknown;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return null;
  }

  if (eventType === 'final' || (data as CoachFinalEvent)?.type === 'final') {
    const d = data as CoachFinalEvent;
    return { type: 'final', output: d.output };
  }

  if (eventType === 'delta' || (data as CoachDeltaEvent)?.type === 'delta') {
    const d = data as CoachDeltaEvent;
    return { type: 'delta', field: d.field, text: d.text };
  }

  if (eventType === 'conversation') {
    const d = data as Partial<CoachConversationEvent>;
    if (typeof d.conversationId === 'string') {
      return {
        type: 'conversation',
        conversationId: d.conversationId,
        isNew: d.isNew === true,
      };
    }
    return null;
  }

  if (eventType === 'session') {
    const d = data as {
      sessionId?: string | null;
      conversationId?: string;
      turnId?: string;
    };
    if (typeof d.conversationId === 'string' && typeof d.turnId === 'string') {
      return {
        type: 'session',
        sessionId: d.sessionId ?? null,
        conversationId: d.conversationId,
        turnId: d.turnId,
      };
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Conversation management — first-class API
// ---------------------------------------------------------------------------

interface ListConversationsOpts {
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export async function listConversations(
  opts?: ListConversationsOpts,
): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
  const params: Record<string, string | number | undefined> = {};
  if (opts?.limit !== undefined) params.limit = opts.limit;
  if (opts?.cursor !== undefined) params.cursor = opts.cursor;
  return apiGet<{
    items: ConversationSummary[];
    nextCursor: string | null;
  }>('/coach/conversations', {
    params,
    ...(opts?.signal ? { signal: opts.signal } : {}),
  });
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  return apiGet<ConversationDetail>(`/coach/conversations/${conversationId}`);
}

export async function archiveConversation(
  conversationId: string,
): Promise<{ archived: true; id: string }> {
  return apiPost<Record<string, never>, { archived: true; id: string }>(
    `/coach/conversations/${conversationId}/archive`,
    {},
  );
}

export async function deleteConversation(
  conversationId: string,
): Promise<{ deleted: true; id: string }> {
  return apiDelete<{ deleted: true; id: string }>(`/coach/conversations/${conversationId}`);
}

// ---------------------------------------------------------------------------
// Legacy session management — preserved for any older callers. Internally
// these still hit the legacy /coach/sessions* routes which now alias the
// conversation routes server-side.
// ---------------------------------------------------------------------------

/** @deprecated use `listConversations`. */
export async function listSessions(): Promise<CoachSession[]> {
  // The legacy route returns the conversation summary shape now. We adapt it
  // to the old CoachSession shape so existing UIs don't break.
  const result = await apiGet<unknown>('/coach/sessions');
  return adaptLegacySessions(result);
}

/** @deprecated use `getConversation`. */
export async function getSession(sessionId: string): Promise<CoachSessionDetail> {
  const detail = await apiGet<ConversationDetail>(`/coach/sessions/${sessionId}`);
  return {
    id: detail.id,
    title: detail.title,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    messageCount: detail.turns.length,
    messages: detail.turns.map((t) => ({
      id: t.id,
      role: t.role === 'USER' ? 'user' : 'assistant',
      content: t.content,
      createdAt: t.createdAt,
    })),
  };
}

/** @deprecated use `deleteConversation`. */
export async function deleteSession(sessionId: string): Promise<void> {
  return apiDelete(`/coach/sessions/${sessionId}`);
}

// ---------------------------------------------------------------------------
// Voice — transcribe + synthesize
// ---------------------------------------------------------------------------

/**
 * POST /coach/transcribe
 * Sends an audio Blob as multipart form-data and returns the transcript text.
 */
export async function transcribe(
  audio: Blob,
  filename = 'recording.webm',
): Promise<{ text: string; durationMs: number }> {
  const form = new FormData();
  form.append('audio', audio, filename);

  // We bypass apiFetch here because we need to send FormData (no
  // Content-Type header — browser sets multipart boundary automatically).
  const API_BASE =
    (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_API_URL']) ||
    'http://localhost:4000';

  const res = await fetch(`${API_BASE}/api/coach/transcribe`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  if (!res.ok) {
    let msg = `Transcription failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiError({
      message: msg,
      status: res.status,
      code: res.status === 429 ? RATE_LIMITED : INTERNAL_ERROR,
    });
  }

  return res.json() as Promise<{ text: string; durationMs: number }>;
}

/**
 * POST /coach/synthesize
 * Returns a Blob containing the synthesized audio (audio/mpeg by default).
 */
export async function synthesizeSpeech(text: string, voice?: string): Promise<Blob> {
  const API_BASE =
    (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_API_URL']) ||
    'http://localhost:4000';

  const res = await fetch(`${API_BASE}/api/coach/synthesize`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...(voice ? { voice } : {}) }),
  });

  if (!res.ok) {
    let msg = `Speech synthesis failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiError({
      message: msg,
      status: res.status,
      code: res.status === 429 ? RATE_LIMITED : INTERNAL_ERROR,
    });
  }

  return res.blob();
}

function adaptLegacySessions(raw: unknown): CoachSession[] {
  // The conversation list endpoint returns
  // `{ items: ConversationSummary[], nextCursor }`. Older callers expected a
  // bare array. Handle both shapes for safety.
  let items: ConversationSummary[] = [];
  if (Array.isArray(raw)) {
    items = raw as ConversationSummary[];
  } else if (raw && typeof raw === 'object' && 'items' in raw) {
    const r = raw as { items?: ConversationSummary[] };
    items = r.items ?? [];
  }
  return items.map((c) => ({
    id: c.id,
    title: c.title ?? c.lastTurnPreview,
    createdAt: c.updatedAt,
    updatedAt: c.updatedAt,
    messageCount: c.turnCount,
  }));
}
