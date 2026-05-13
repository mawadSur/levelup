import { chatComplete, classifySensitive, isStubMode } from '@levelup/llm';
import type {
  LabCriterionResult,
  LabRubric,
  LabRubricCriterion,
  LabTranscript,
} from '@levelup/types';

const GRADER_MODEL = 'gpt-4o-mini';

// Strict JSON schema the grader LLM must produce. Mirrors LabCriterionResult
// minus the per-criterion plumbing fields (id, weight) the caller fills in.
const GRADER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'score', 'note'],
  properties: {
    pass: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 1 },
    note: { type: 'string' },
  },
} as const;

export interface GraderResult {
  score: number;
  passed: boolean;
  criteria: LabCriterionResult[];
  // Full per-criterion raw responses for auditing. Persisted to LabAttempt.graderRaw.
  raw: Array<{ criterionId: string; response: unknown; stub: boolean }>;
  tokensUsed: number;
}

function transcriptForGrader(transcript: LabTranscript): string {
  return JSON.stringify(
    transcript.map((t) => ({ role: t.role, content: t.content })),
    null,
    2,
  );
}

// Deterministic stub grader. Treats the grader prompt as a keyword bag — when
// any non-trivial keyword from the prompt appears in the LEARNER's turns the
// criterion passes. This is enough to drive the UI through happy and sad
// paths without an API key.
function stubGradeCriterion(
  criterion: LabRubricCriterion,
  transcript: LabTranscript,
): { pass: boolean; score: number; note: string } {
  const learnerText = transcript
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join('\n')
    .toLowerCase();

  // Pull "keywords" — alphanumeric tokens > 4 chars — from the grader prompt.
  const keywords = Array.from(
    new Set(
      (criterion.graderPrompt.toLowerCase().match(/[a-z][a-z0-9]{4,}/g) ?? []).filter(
        (k) => !STOP_WORDS.has(k),
      ),
    ),
  ).slice(0, 12);

  if (keywords.length === 0) {
    return {
      pass: true,
      score: 1,
      note: 'Stub grader: no keywords to evaluate, defaulting to pass.',
    };
  }

  const hits = keywords.filter((k) => learnerText.includes(k)).length;
  const ratio = hits / keywords.length;
  const pass = ratio >= 0.3;
  return {
    pass,
    score: Math.min(1, Math.max(0, ratio)),
    note: pass
      ? `Stub grader: matched ${hits}/${keywords.length} criterion keywords.`
      : `Stub grader: only matched ${hits}/${keywords.length} criterion keywords (needs ≥30%).`,
  };
}

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'their',
  'there',
  'these',
  'those',
  'which',
  'while',
  'whose',
  'would',
  'should',
  'could',
  'where',
  'thats',
  'didnt',
  'doesnt',
  'wasnt',
  'shouldnt',
  'wouldnt',
  'because',
  'before',
  'between',
  'during',
  'learner',
  'criterion',
  'rubric',
  'grader',
  'evaluate',
  'response',
  'assistant',
  'system',
  'message',
  'transcript',
]);

async function gradeOneCriterion(
  criterion: LabRubricCriterion,
  transcript: LabTranscript,
): Promise<{ result: LabCriterionResult; raw: unknown; tokens: number; stub: boolean }> {
  if (isStubMode()) {
    const stub = stubGradeCriterion(criterion, transcript);
    return {
      result: {
        id: criterion.id,
        weight: criterion.weight,
        pass: stub.pass,
        score: stub.score,
        note: stub.note,
      },
      raw: { stub: true, ...stub },
      tokens: 0,
      stub: true,
    };
  }

  // Prefix-cache invariant: the criterion-level grader prompt is stable per
  // (lab, criterion) — placing it first as a `system` message lets OpenAI
  // reuse the cached prefix across grading runs on the same criterion.
  try {
    const out = await chatComplete({
      model: GRADER_MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: criterion.graderPrompt },
        {
          role: 'user',
          content: `Grade the following learner transcript. Respond with a JSON object matching the required schema.\n\nTRANSCRIPT:\n${transcriptForGrader(transcript)}`,
        },
      ],
      responseFormat: {
        type: 'json_schema',
        name: 'CriterionGrade',
        schema: GRADER_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    });

    let parsed: { pass?: unknown; score?: unknown; note?: unknown } = {};
    try {
      parsed = JSON.parse(out.content) as typeof parsed;
    } catch {
      // Tolerate malformed responses — treat as failure with a diagnostic note.
      return {
        result: {
          id: criterion.id,
          weight: criterion.weight,
          pass: false,
          score: 0,
          note: 'Grader returned a non-JSON response.',
        },
        raw: { rawContent: out.content },
        tokens: out.usage.totalTokens,
        stub: false,
      };
    }

    const score =
      typeof parsed.score === 'number' && Number.isFinite(parsed.score)
        ? Math.min(1, Math.max(0, parsed.score))
        : 0;
    const pass = parsed.pass === true || (typeof parsed.pass !== 'boolean' && score >= 0.7);
    const note = typeof parsed.note === 'string' ? parsed.note : '';

    return {
      result: {
        id: criterion.id,
        weight: criterion.weight,
        pass,
        score,
        note,
      },
      raw: parsed,
      tokens: out.usage.totalTokens,
      stub: out.stub,
    };
  } catch (err: unknown) {
    return {
      result: {
        id: criterion.id,
        weight: criterion.weight,
        pass: false,
        score: 0,
        note: `Grader call failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      },
      raw: { error: err instanceof Error ? err.message : String(err) },
      tokens: 0,
      stub: false,
    };
  }
}

// Special-cased criterion id — labs that reference `__sensitive_classifier__`
// run our local classifySensitive() helper INSTEAD of an LLM grader so
// PII-redaction scoring stays deterministic and free of model variance.
export const SENSITIVE_CLASSIFIER_GRADER_ID = '__sensitive_classifier__';

async function gradeWithSensitiveClassifier(
  criterion: LabRubricCriterion,
  transcript: LabTranscript,
): Promise<{ result: LabCriterionResult; raw: unknown; tokens: number; stub: boolean }> {
  // Concatenate the LEARNER's outputs only — we're checking that the learner
  // didn't echo PII back to the simulated chatbot.
  const learnerText = transcript
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join('\n');

  const sensitive = await classifySensitive(learnerText);
  const pass = !sensitive.triggered;
  return {
    result: {
      id: criterion.id,
      weight: criterion.weight,
      pass,
      score: pass ? 1 : 0,
      note: pass
        ? 'No sensitive data detected in learner output.'
        : `Sensitive data detected: ${sensitive.reason ?? sensitive.categories.join(', ')}`,
    },
    raw: sensitive,
    tokens: 0,
    stub: false,
  };
}

/**
 * Run the rubric against a transcript. Aggregates each criterion's score by
 * weight; passes when weighted score ≥ rubric.passThreshold.
 *
 * In stub mode every criterion is graded by the keyword-match heuristic in
 * `stubGradeCriterion` — never throws, always returns a deterministic result.
 */
export async function gradeAttempt(
  rubric: LabRubric,
  transcript: LabTranscript,
): Promise<GraderResult> {
  const perCriterion = await Promise.all(
    rubric.criteria.map((c) =>
      c.graderPrompt === SENSITIVE_CLASSIFIER_GRADER_ID || c.id === SENSITIVE_CLASSIFIER_GRADER_ID
        ? gradeWithSensitiveClassifier(c, transcript)
        : gradeOneCriterion(c, transcript),
    ),
  );

  const totalWeight = rubric.criteria.reduce((s, c) => s + c.weight, 0) || 1;
  const weightedScore =
    perCriterion.reduce((s, r) => s + r.result.score * r.result.weight, 0) / totalWeight;

  const passed = weightedScore >= (rubric.passThreshold ?? 0.7);

  return {
    score: weightedScore,
    passed,
    criteria: perCriterion.map((r) => r.result),
    raw: perCriterion.map((r) => ({
      criterionId: r.result.id,
      response: r.raw,
      stub: r.stub,
    })),
    tokensUsed: perCriterion.reduce((s, r) => s + r.tokens, 0),
  };
}
