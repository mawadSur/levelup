export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export interface JsonSchemaResponseFormat {
  type: 'json_schema';
  name: string;
  schema: Record<string, unknown>;
}

export type ResponseFormat = 'text' | JsonSchemaResponseFormat;

export interface ChatCompleteOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  responseFormat?: ResponseFormat;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompleteResult {
  content: string;
  model: string;
  usage: ChatUsage;
  finishReason: string | null;
  stub: boolean;
}

export type ChatStreamChunk =
  | { type: 'delta'; content: string }
  | { type: 'usage'; usage: ChatUsage; model: string; finishReason: string | null; stub: boolean };

export type AiLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * A single prior turn in a multi-turn coach conversation. Only `user` and
 * `assistant` roles are allowed — the system prompt is owned by the coach
 * builder and must never be re-templated mid-conversation (cache invariant).
 */
export interface CoachPriorTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachInput {
  userInput: string;
  jobTitle: string;
  department: string;
  aiLevel: AiLevel;
  companyPolicy: string;
  /** @deprecated use `priorTurns` for multi-turn conversations. */
  conversation?: ChatMessage[];
  /**
   * Prior turns from the same conversation, threaded between the system
   * prompt and the new user input. Capped by callers to the most recent N
   * turns plus a token budget — see `runCoach` / `streamCoach` JSDoc.
   */
  priorTurns?: CoachPriorTurn[];
  userId?: string;
}

export type SensitiveCategory = 'pii' | 'phi' | 'payment' | 'credentials' | 'customer_data';

export interface SensitiveResult {
  triggered: boolean;
  categories: SensitiveCategory[];
  reason?: string;
}

export type CoachSensitiveWarning = { triggered: true; reason: string } | { triggered: false };

export interface CoachOutput {
  explanation: string;
  improvedPrompt?: string;
  whyItWorks?: string;
  nextAction?: string;
  sensitiveDataWarning: CoachSensitiveWarning;
  model: string;
  usage: ChatUsage;
  stub: boolean;
}

export type CoachStreamChunk =
  | {
      type: 'delta';
      field: 'explanation' | 'improvedPrompt' | 'whyItWorks' | 'nextAction';
      content: string;
    }
  | { type: 'sensitive'; warning: CoachSensitiveWarning }
  | { type: 'final'; output: CoachOutput };

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
}

export interface UsageRecord {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LlmConfig {
  apiKey: string | undefined;
  defaultModel: string;
  coachModel: string;
  embedModel: string;
  llmSensitiveCheck: boolean;
  nodeEnv: string;
}
