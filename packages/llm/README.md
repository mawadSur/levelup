# @levelup/llm

Typed OpenAI client for the LevelUp AI Academy platform. The API service uses
this package for the AI coach, baseline assessments, and lesson embeddings.

## Stub mode

Every entry point works without a real API key. If `OPENAI_API_KEY` is missing
or starts with `PLACEHOLDER_`, the package runs in **stub mode**:

- `chatComplete` / `chatStream` return a deterministic echo prefixed with
  `[STUB MODE] STUB MODE — set OPENAI_API_KEY to enable real responses.`
- `embed` returns zero vectors of length 1536 (one per input).
- `runCoach` / `streamCoach` return a canned coach reply with a fake improved
  prompt and next action so the UI still has something to render.
- `classifySensitive` runs the regex stage only.

In `NODE_ENV=production` the package throws on import if stub mode is active.
In dev it `console.warn`s once.

## Environment variables

| Var                    | Default                  | Notes                                                                     |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `OPENAI_API_KEY`       | unset                    | `PLACEHOLDER_*` triggers stub mode.                                       |
| `OPENAI_MODEL_DEFAULT` | `gpt-4o-mini`            | Used by `chatComplete` / `chatStream`.                                    |
| `OPENAI_MODEL_COACH`   | `gpt-4o`                 | Used by `runCoach` / `streamCoach`.                                       |
| `OPENAI_EMBED_MODEL`   | `text-embedding-3-small` | Used by `embed`.                                                          |
| `LLM_SENSITIVE_CHECK`  | unset                    | Set to `on` to enable the LLM-backed second stage of `classifySensitive`. |
| `NODE_ENV`             | `development`            | `production` makes stub mode a hard error.                                |

`process.env` is read only inside `config.ts`. Everything else imports
`llmConfig` and `isStubMode()`.

## Public surface

```ts
import {
  runCoach,
  streamCoach,
  chatComplete,
  chatStream,
  embed,
  classifySensitive,
  isStubMode,
  llmConfig,
  withRetry,
  estimateTokens,
  recordUsage,
} from '@levelup/llm';
```

## Prompt cache invariant

`chatComplete`, `chatStream`, `runCoach`, and `streamCoach` rely on the OpenAI
automatic prompt cache. Callers MUST keep the system prompt as the FIRST
message and keep its bytes identical across turns of a conversation. Mutating
the system prompt (e.g. injecting a per-turn timestamp or rotating role data)
defeats the cache and roughly doubles cost and latency.

The coach module honours this by interpolating per-call values via
`{{job_title}}` / `{{department}}` / `{{ai_level}}` / `{{company_policy}}`
placeholders inside the constant `COACH_SYSTEM_PROMPT` — the constant itself
never moves.

## Streaming structured output

`runCoach` uses OpenAI JSON schema response format and is the canonical way to
get structured coach output.

`streamCoach` wraps the same schema-constrained streaming response with a
tolerant incremental JSON parser so the UI can render `explanation`,
`improvedPrompt`, `whyItWorks`, and `nextAction` deltas as the model emits
them. Partial JSON, half-escaped characters, and out-of-order field arrival
are all handled — the final `{ type: 'final', output }` chunk is
authoritative.

## Sensitive data handling

`classifySensitive` runs a regex stage (SSN, Luhn-checked credit cards,
phone, IPv4, IBAN, US passport, AWS keys, generic API keys, and
customer-record-shaped email clusters). If the regex stage doesn't fire and
`LLM_SENSITIVE_CHECK=on`, a 1-second-capped `gpt-4o-mini` JSON call asks
"does this text appear to contain confidential customer data, PHI, employee
PII, or secrets?" — timeouts default to not-triggered with a `console.warn`.

`runCoach` calls `classifySensitive` BEFORE invoking the model. If anything is
flagged, the coach output's `sensitiveDataWarning` is set AND a warning system
message is appended so the model still produces a response but with explicit
redaction guidance.
