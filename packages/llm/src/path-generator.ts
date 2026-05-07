/**
 * AI-generated learning path generator (CR.33).
 *
 * Given an admin's free-text intent, produces a complete 6-lesson learning
 * path skeleton — title, description, target level, lesson markdown bodies,
 * and a 3-question quiz per lesson. The output is structured JSON validated
 * against `generatedPathSchema`.
 *
 * Stub mode: when `isStubMode()` returns true (no real OPENAI_API_KEY) this
 * function returns a deterministic placeholder path so the rest of the flow
 * (queue → DB → admin UI) is fully testable without spending money.
 *
 * Cost note: this is the most expensive single LLM call in the platform —
 * 6 × ~750-word lesson bodies + 18 quiz questions easily blows past 10k
 * output tokens. The handler is configured for a single attempt (no retries)
 * for exactly this reason. See `apps/worker/src/jobs/path-generation.ts`.
 */

import { z } from 'zod';
import { chatComplete } from './chat';
import { isStubMode, llmConfig } from './config';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const TARGET_LEVELS = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'] as const;
export type GeneratedTargetLevel = (typeof TARGET_LEVELS)[number];

export const generatedQuizQuestionSchema = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});
export type GeneratedQuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;

export const generatedQuizSchema = z.object({
  title: z.string(),
  questions: z.array(generatedQuizQuestionSchema).length(3),
});
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

export const generatedLessonSchema = z.object({
  slug: z.string(),
  title: z.string(),
  estimatedMinutes: z.number().int().min(3).max(30),
  body: z.string(),
  quiz: generatedQuizSchema,
});
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

export const generatedPathSchema = z.object({
  title: z.string(),
  description: z.string(),
  targetRole: z.string().nullable(),
  targetLevel: z.enum(TARGET_LEVELS),
  lessons: z.array(generatedLessonSchema).length(6),
});
export type GeneratedPath = z.infer<typeof generatedPathSchema>;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface GeneratePathInput {
  /** Admin's free-text intent. e.g. "Help my sales team navigate enterprise discovery calls". */
  prompt: string;
  /** Optional target audience. e.g. "Sales reps", "Managers". */
  audience?: string;
  /** Injected for personalization in the user message. */
  organizationName: string;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/**
 * Stable system prompt — must be byte-identical across calls so OpenAI's
 * automatic prompt caching matches the leading prefix. Per-call data goes in
 * the user message below.
 */
const PATH_SYSTEM_PROMPT = `You are a curriculum designer for an enterprise AI training platform. You produce
practical learning paths grounded in real workflows. Each lesson is markdown with
H2/H3 sections, real prompt examples in fenced code blocks, and a "Try this" exercise.

Constraints:
- 6 lessons total. Each 600-900 words of body markdown.
- Each lesson includes one 3-question quiz with 4 choices each. correctIndex is 0-3.
- Tone: experienced practitioner. No marketing fluff. No emojis. US English.
- Real, useful content. No placeholder copy.
- Lesson slugs must be kebab-case, lowercase, unique within the path.
- Choose targetLevel based on the prompt's audience.

Return strictly valid JSON conforming to the supplied schema. No prose outside JSON.`;

/**
 * JSON Schema mirroring `generatedPathSchema`. Hand-written rather than
 * derived from zod-to-json-schema to keep the LLM-facing contract explicit
 * (and to avoid pulling in another dep). Update both side-by-side.
 *
 * `additionalProperties: false` and `required` are listed for every object —
 * OpenAI's `strict: true` structured-output mode demands it.
 */
const GENERATED_PATH_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'targetRole', 'targetLevel', 'lessons'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    targetRole: { type: ['string', 'null'] },
    targetLevel: { type: 'string', enum: [...TARGET_LEVELS] },
    lessons: {
      type: 'array',
      minItems: 6,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'title', 'estimatedMinutes', 'body', 'quiz'],
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          estimatedMinutes: { type: 'integer', minimum: 3, maximum: 30 },
          body: { type: 'string' },
          quiz: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'questions'],
            properties: {
              title: { type: 'string' },
              questions: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['prompt', 'choices', 'correctIndex', 'explanation'],
                  properties: {
                    prompt: { type: 'string' },
                    choices: {
                      type: 'array',
                      minItems: 4,
                      maxItems: 4,
                      items: { type: 'string' },
                    },
                    correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
                    explanation: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function buildUserMessage(input: GeneratePathInput): string {
  const audience =
    input.audience && input.audience.trim().length > 0 ? input.audience.trim() : 'general staff';
  return `Organization: ${input.organizationName}
Audience: ${audience}
Topic / intent: ${input.prompt}

Generate the learning path now.`;
}

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

const STUB_TARGET_LEVEL: GeneratedTargetLevel = 'PRACTITIONER';

function stubLesson(prompt: string, index: number): GeneratedLesson {
  const slugBase = `stub-lesson-${index + 1}`;
  const title = `Lesson ${index + 1}: Stub for "${prompt.slice(0, 30).trim()}"`;
  const body = [
    `## Lesson ${index + 1} — stub content`,
    '',
    `This is placeholder content generated in **STUB MODE**. Set \`OPENAI_API_KEY\` to enable real curriculum generation.`,
    '',
    '### Why this matters',
    '',
    `Real path generation would expand on the prompt: "${prompt}". The full lesson is roughly 600-900 words with prompt examples and an exercise.`,
    '',
    '### Example prompt',
    '',
    '```text',
    'Write a stub example prompt.',
    '```',
    '',
    '### Try this',
    '',
    '1. Wire a real OpenAI key.',
    '2. Re-run path generation.',
    '3. Review the produced lessons.',
  ].join('\n');

  const quiz: GeneratedQuiz = {
    title: `Stub quiz ${index + 1}`,
    questions: [0, 1, 2].map((q) => ({
      prompt: `Stub question ${q + 1} for lesson ${index + 1}?`,
      choices: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: 'Stub explanation — replace once a real key is configured.',
    })),
  };

  return {
    slug: slugBase,
    title,
    estimatedMinutes: 10,
    body,
    quiz,
  };
}

function buildStubPath(input: GeneratePathInput): GeneratedPath {
  const titleHint = input.prompt.slice(0, 40).trim();
  return {
    title: `[STUB] Path: ${titleHint}`,
    description: `Stub-generated path placeholder. Set OPENAI_API_KEY to enable real generation. Source intent: ${input.prompt}`,
    targetRole: input.audience ?? null,
    targetLevel: STUB_TARGET_LEVEL,
    lessons: [0, 1, 2, 3, 4, 5].map((i) => stubLesson(input.prompt, i)),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a complete 6-lesson learning path from an admin's prompt.
 *
 * Validates the LLM response with `generatedPathSchema.parse(...)`. If parsing
 * fails the underlying ZodError bubbles up — the caller is expected to mark
 * the path-generation request FAILED and surface the message.
 *
 * Stub mode: returns a deterministic placeholder structured exactly like a
 * real response so save-flow and UX paths can be exercised without an API key.
 */
export async function generateLearningPath(input: GeneratePathInput): Promise<GeneratedPath> {
  if (isStubMode()) {
    const stub = buildStubPath(input);
    // Parse the stub anyway to keep both paths exercising the schema validator.
    return generatedPathSchema.parse(stub);
  }

  const result = await chatComplete({
    model: llmConfig.coachModel,
    temperature: 0.6,
    // 6 × ~900-word lessons × ~1.4 tokens/word ≈ 7.5k output tokens. Quizzes,
    // metadata, and JSON overhead push to ~10k. 12k is a generous cap that
    // still bounds runaway responses.
    maxTokens: 12_000,
    messages: [
      { role: 'system', content: PATH_SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(input) },
    ],
    responseFormat: {
      type: 'json_schema',
      name: 'GeneratedLearningPath',
      schema: GENERATED_PATH_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content) as unknown;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Path generator returned non-JSON content: ${reason}`);
  }

  return generatedPathSchema.parse(parsed);
}
