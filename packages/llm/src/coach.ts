import type {
  ChatMessage,
  CoachInput,
  CoachOutput,
  CoachPriorTurn,
  CoachSensitiveWarning,
  CoachStreamChunk,
  ChatUsage,
} from './types';
import { estimateTokens } from './accounting';
import { isStubMode, llmConfig } from './config';
import { chatComplete, chatStream } from './chat';
import { classifySensitive } from './sensitive';
import { stubCoach, stubCoachStream } from './stub';

// Prior-turn cap: the most recent N turns are kept, then trimmed further until
// the running token estimate fits the budget. Both numbers are tuned against
// the 32k context of gpt-4o-class models — at ~600 tokens per assistant
// payload (json schema reply) and ~120 per user prompt, 10 turns ≈ 3.6k
// tokens, well below the 6k budget. Older turns are dropped FIRST so the most
// recent context survives. Documented because the values are load-bearing.
export const COACH_PRIOR_TURNS_MAX_COUNT = 10;
export const COACH_PRIOR_TURNS_TOKEN_BUDGET = 6000;

// Kept as a stable constant: the prompt-cache invariant relies on this
// system prompt being byte-identical across calls. Per-call data is passed
// through `{{...}}` placeholders — the placeholders themselves are part of
// the cached prefix.
const COACH_SYSTEM_PROMPT = `You are an enterprise AI training coach. Your job is to help employees use AI safely, effectively, and practically for their role.

Employee role: {{job_title}}
Department: {{department}}
AI skill level: {{ai_level}}
Company policy: {{company_policy}}

Rules:
- Teach in simple, practical language.
- Give examples based on the employee's role.
- Warn the user if their request may expose sensitive, private, confidential, regulated, or customer data.
- Improve their prompt when useful.
- Show a better version of the prompt.
- Explain why the improved prompt works.
- Suggest the next best action.`;

const COACH_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation', 'improvedPrompt', 'whyItWorks', 'nextAction'],
  properties: {
    explanation: { type: 'string' },
    improvedPrompt: { type: 'string' },
    whyItWorks: { type: 'string' },
    nextAction: { type: 'string' },
  },
} as const;

interface CoachJsonShape {
  explanation?: unknown;
  improvedPrompt?: unknown;
  whyItWorks?: unknown;
  nextAction?: unknown;
}

function fillPrompt(input: CoachInput): string {
  return COACH_SYSTEM_PROMPT.replace('{{job_title}}', input.jobTitle)
    .replace('{{department}}', input.department)
    .replace('{{ai_level}}', input.aiLevel)
    .replace('{{company_policy}}', input.companyPolicy);
}

/**
 * Trim prior turns to fit the configured cap. Drops oldest first so the most
 * recent context survives. Operates on a *copy* of the input array.
 */
function capPriorTurns(turns: CoachPriorTurn[]): CoachPriorTurn[] {
  if (turns.length === 0) return turns;
  // First cap by count.
  const kept = turns.slice(-COACH_PRIOR_TURNS_MAX_COUNT);

  // Then cap by token budget. We approximate prompt cost as the sum of
  // estimateTokens() over each turn's content; if the total exceeds the
  // budget we drop oldest turns until it fits. estimateTokens is the same
  // helper the rest of the package uses for accounting so the numbers stay
  // consistent.
  let total = 0;
  for (const t of kept) total += estimateTokens(t.content);
  while (total > COACH_PRIOR_TURNS_TOKEN_BUDGET && kept.length > 1) {
    const dropped = kept.shift();
    if (dropped) total -= estimateTokens(dropped.content);
  }
  return kept;
}

function buildMessages(input: CoachInput, warning: CoachSensitiveWarning): ChatMessage[] {
  // The system prompt MUST be the first byte-identical message across calls
  // in the same conversation — that is what makes prompt caching possible.
  // Per-call data is interpolated through `{{...}}` placeholders so the
  // template itself is a stable prefix.
  const messages: ChatMessage[] = [{ role: 'system', content: fillPrompt(input) }];

  // Prefer the new `priorTurns` API. Fall back to `conversation` for legacy
  // callers but skip any 'system' messages in that path — re-injecting a
  // system message mid-thread breaks the cache prefix invariant.
  if (input.priorTurns && input.priorTurns.length > 0) {
    const capped = capPriorTurns(input.priorTurns);
    for (const t of capped) {
      messages.push({ role: t.role, content: t.content });
    }
  } else if (input.conversation && input.conversation.length > 0) {
    for (const m of input.conversation) {
      if (m.role === 'system') continue;
      messages.push(m);
    }
  }

  if (warning.triggered) {
    messages.push({
      role: 'system',
      content: `WARNING: the user's input may contain sensitive data (${warning.reason}). Do NOT echo the sensitive values, instruct the user to redact them, and adapt your improved prompt to use placeholders.`,
    });
  }
  messages.push({ role: 'user', content: input.userInput });
  return messages;
}

function coerceString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseCoachJson(raw: string): CoachJsonShape {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null) return parsed as CoachJsonShape;
  } catch {
    // fall through
  }
  return {};
}

/**
 * Non-streaming coach invocation.
 *
 * Multi-turn note: when `input.priorTurns` is provided, the most recent
 * `COACH_PRIOR_TURNS_MAX_COUNT` (10) turns are passed to the LLM after the
 * system prompt and before the new user input. The list is also capped at
 * `COACH_PRIOR_TURNS_TOKEN_BUDGET` (~6000 tokens of prior content) — older
 * turns are dropped first if both caps disagree. The system prompt remains
 * byte-identical so prompt caching keeps working across turns.
 *
 * The role/department/aiLevel placeholders are filled from `input` at call
 * time. Callers are expected to capture these once per conversation (NOT per
 * turn) to keep the cache prefix stable.
 */
export async function runCoach(input: CoachInput): Promise<CoachOutput> {
  const sensitive = await classifySensitive(input.userInput);
  const warning: CoachSensitiveWarning = sensitive.triggered
    ? { triggered: true, reason: sensitive.reason ?? 'Sensitive data heuristically detected.' }
    : { triggered: false };

  const model = llmConfig.coachModel;

  if (isStubMode()) {
    const out = stubCoach(input, model);
    return { ...out, sensitiveDataWarning: warning };
  }

  const result = await chatComplete({
    model,
    messages: buildMessages(input, warning),
    temperature: 0.5,
    ...(input.userId ? { userId: input.userId } : {}),
    responseFormat: {
      type: 'json_schema',
      name: 'CoachReply',
      schema: COACH_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  });

  const data = parseCoachJson(result.content);
  const out: CoachOutput = {
    explanation: coerceString(data.explanation) ?? result.content,
    sensitiveDataWarning: warning,
    model: result.model,
    usage: result.usage,
    stub: result.stub,
  };
  const improved = coerceString(data.improvedPrompt);
  if (improved) out.improvedPrompt = improved;
  const why = coerceString(data.whyItWorks);
  if (why) out.whyItWorks = why;
  const next = coerceString(data.nextAction);
  if (next) out.nextAction = next;
  return out;
}

type CoachField = 'explanation' | 'improvedPrompt' | 'whyItWorks' | 'nextAction';
const COACH_FIELDS: readonly CoachField[] = [
  'explanation',
  'improvedPrompt',
  'whyItWorks',
  'nextAction',
];

interface IncrementalState {
  buffer: string;
  emitted: Record<CoachField, number>;
  finalized: Record<CoachField, boolean>;
}

function newIncrementalState(): IncrementalState {
  return {
    buffer: '',
    emitted: { explanation: 0, improvedPrompt: 0, whyItWorks: 0, nextAction: 0 },
    finalized: { explanation: false, improvedPrompt: false, whyItWorks: false, nextAction: false },
  };
}

// Tolerant incremental JSON value extraction: scans the partial buffer for
// `"<field>"` then locates the opening `"` of the value and extracts the
// largest substring that is unambiguously inside the string literal (i.e.
// before an unescaped closing quote). Whatever portion is past `emitted`
// gets yielded as a delta. When the closing quote arrives, the field is
// marked finalized so we stop emitting deltas for it.
function extractField(
  state: IncrementalState,
  field: CoachField,
): { delta: string; closed: boolean } {
  if (state.finalized[field]) return { delta: '', closed: true };
  const buf = state.buffer;
  const key = `"${field}"`;
  const keyIdx = buf.indexOf(key);
  if (keyIdx === -1) return { delta: '', closed: false };
  let i = keyIdx + key.length;
  while (i < buf.length && buf.charAt(i) !== ':') i++;
  if (i >= buf.length) return { delta: '', closed: false };
  i++;
  while (
    i < buf.length &&
    (buf.charAt(i) === ' ' || buf.charAt(i) === '\n' || buf.charAt(i) === '\t')
  )
    i++;
  if (i >= buf.length || buf.charAt(i) !== '"') return { delta: '', closed: false };
  i++;
  const valueStart = i;

  let closed = false;
  let endExclusive = buf.length;
  while (i < buf.length) {
    const ch = buf.charAt(i);
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '"') {
      closed = true;
      endExclusive = i;
      break;
    }
    i++;
  }

  // If we trail off mid-escape, drop the dangling backslash from the safe
  // window so we don't emit half-escapes the consumer can't render.
  let safeEnd = endExclusive;
  if (!closed && safeEnd > valueStart && buf.charAt(safeEnd - 1) === '\\') safeEnd--;

  const visible = buf.slice(valueStart, safeEnd);
  const already = state.emitted[field];
  let delta = '';
  if (visible.length > already) {
    const rawSlice = visible.slice(already);
    // Best-effort un-escape so the consumer sees readable text.
    delta = rawSlice
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    state.emitted[field] = visible.length;
  }
  if (closed) state.finalized[field] = true;
  return { delta, closed };
}

/**
 * Streaming coach invocation. Same prior-turn cap rules as `runCoach`:
 * `COACH_PRIOR_TURNS_MAX_COUNT` (10) turns / `COACH_PRIOR_TURNS_TOKEN_BUDGET`
 * (~6000 tokens), oldest first dropped, system-prompt prefix preserved.
 */
export async function* streamCoach(input: CoachInput): AsyncIterable<CoachStreamChunk> {
  const sensitive = await classifySensitive(input.userInput);
  const warning: CoachSensitiveWarning = sensitive.triggered
    ? { triggered: true, reason: sensitive.reason ?? 'Sensitive data heuristically detected.' }
    : { triggered: false };
  yield { type: 'sensitive', warning };

  const model = llmConfig.coachModel;

  if (isStubMode()) {
    const stubIter = stubCoachStream(input, model);
    let stubFinal: CoachOutput | undefined;
    for await (const chunk of stubIter) {
      if (chunk.type === 'sensitive') continue;
      if (chunk.type === 'final') {
        stubFinal = { ...chunk.output, sensitiveDataWarning: warning };
        continue;
      }
      yield chunk;
    }
    if (stubFinal) yield { type: 'final', output: stubFinal };
    return;
  }

  const stream = chatStream({
    model,
    messages: buildMessages(input, warning),
    temperature: 0.5,
    ...(input.userId ? { userId: input.userId } : {}),
    responseFormat: {
      type: 'json_schema',
      name: 'CoachReply',
      schema: COACH_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  });

  const state = newIncrementalState();
  let usage: ChatUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let resolvedModel = model;
  let stub = false;

  for await (const chunk of stream) {
    if (chunk.type === 'delta') {
      state.buffer += chunk.content;
      for (const field of COACH_FIELDS) {
        const { delta } = extractField(state, field);
        if (delta.length > 0) {
          yield { type: 'delta', field, content: delta };
        }
      }
    } else {
      usage = chunk.usage;
      resolvedModel = chunk.model;
      stub = chunk.stub;
    }
  }

  const data = parseCoachJson(state.buffer);
  const explanation =
    coerceString(data.explanation) ??
    (state.emitted.explanation > 0
      ? state.buffer.slice(0, state.emitted.explanation)
      : state.buffer);
  const final: CoachOutput = {
    explanation,
    sensitiveDataWarning: warning,
    model: resolvedModel,
    usage,
    stub,
  };
  const improved = coerceString(data.improvedPrompt);
  if (improved) final.improvedPrompt = improved;
  const why = coerceString(data.whyItWorks);
  if (why) final.whyItWorks = why;
  const next = coerceString(data.nextAction);
  if (next) final.nextAction = next;
  yield { type: 'final', output: final };
}
