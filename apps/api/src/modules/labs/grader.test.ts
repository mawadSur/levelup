/**
 * apps/api — labs grader (stub-mode) unit tests
 *
 * Exercises the keyword-matching stub grader and the sensitive-classifier
 * shortcut. No DB / no real LLM — runs without OPENAI_API_KEY.
 *
 * Run: pnpm --filter @levelup/api test --testPathPattern=labs
 */

import { gradeAttempt, SENSITIVE_CLASSIFIER_GRADER_ID } from './grader';
import type { LabRubric, LabTranscript } from '@levelup/types';

const FORMER_KEY = process.env.OPENAI_API_KEY;

beforeAll(() => {
  // Force stub mode for the whole suite. classifySensitive's regex stage runs
  // either way, but the LLM-fallback path is short-circuited under stub mode.
  process.env.OPENAI_API_KEY = 'PLACEHOLDER_OPENAI_API_KEY';
});

afterAll(() => {
  if (FORMER_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = FORMER_KEY;
  }
});

function mkRubric(overrides: Partial<LabRubric> = {}): LabRubric {
  return {
    passThreshold: 0.7,
    criteria: [
      {
        id: 'mentions-policy',
        weight: 1,
        graderPrompt:
          'Grade whether the learner referenced the company policy clearly. Look for words like policy, compliance, governance, redacted, approved.',
      },
    ],
    ...overrides,
  };
}

describe('gradeAttempt (stub mode)', () => {
  it('passes when learner mentions enough rubric keywords', async () => {
    // Hit ≥70% of the criterion's keywords by repeating them across turns —
    // the stub grader's score is the keyword-coverage ratio.
    const transcript: LabTranscript = [
      {
        role: 'user',
        content:
          'I followed company policy and used approved redacted formats for compliance. The governance guidance was clearly referenced. I will grade myself: whether I covered the policy compliance.',
      },
      { role: 'assistant', content: 'Good — that aligns with governance.' },
    ];
    const result = await gradeAttempt(mkRubric(), transcript);
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0]!.pass).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.3);
  });

  it('fails when learner does not match enough keywords', async () => {
    const transcript: LabTranscript = [
      { role: 'user', content: 'just a chat about the weather' },
      { role: 'assistant', content: 'it is sunny.' },
    ];
    const result = await gradeAttempt(mkRubric(), transcript);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(0.7);
  });

  it('flags PII via the __sensitive_classifier__ criterion', async () => {
    const rubric: LabRubric = {
      passThreshold: 0.7,
      criteria: [
        {
          id: SENSITIVE_CLASSIFIER_GRADER_ID,
          weight: 1,
          graderPrompt: SENSITIVE_CLASSIFIER_GRADER_ID,
        },
      ],
    };
    const transcript: LabTranscript = [
      { role: 'user', content: 'Summarize this: SSN is 123-45-6789.' },
      { role: 'assistant', content: '[summary]' },
    ];
    const result = await gradeAttempt(rubric, transcript);
    expect(result.passed).toBe(false);
    expect(result.criteria[0]!.pass).toBe(false);
    expect(result.criteria[0]!.note).toMatch(/sensitive|SSN|pii/i);
  });

  it('passes sensitive classifier when no PII leaks', async () => {
    const rubric: LabRubric = {
      passThreshold: 0.7,
      criteria: [
        {
          id: SENSITIVE_CLASSIFIER_GRADER_ID,
          weight: 1,
          graderPrompt: SENSITIVE_CLASSIFIER_GRADER_ID,
        },
      ],
    };
    const transcript: LabTranscript = [
      { role: 'user', content: 'Summarize the record at [CUSTOMER_NAME] with [SSN_REDACTED].' },
      { role: 'assistant', content: '[summary]' },
    ];
    const result = await gradeAttempt(rubric, transcript);
    expect(result.passed).toBe(true);
    expect(result.criteria[0]!.pass).toBe(true);
  });

  it('never throws in stub mode for an empty grader prompt', async () => {
    const rubric: LabRubric = {
      passThreshold: 0.7,
      criteria: [{ id: 'noop', weight: 1, graderPrompt: '???' }],
    };
    const result = await gradeAttempt(rubric, [{ role: 'user', content: 'hi' }]);
    expect(result).toBeDefined();
    expect(typeof result.score).toBe('number');
  });
});
