/**
 * @levelup/types — Zod schema validation tests
 *
 * Tests valid parsing, invalid parsing with helpful error messages, and edge
 * cases (empty strings, wrong types, missing required fields) for each major
 * schema exported by the package.
 *
 * Run: pnpm --filter @levelup/types test
 *
 * NOTE: These tests run against the built package. Import from the source
 * directly because vitest resolves '.ts' before looking up package exports.
 */

import { describe, it, expect } from 'vitest';

// ---- schema imports (source-relative so vitest can resolve without build) --

import { inviteUserSchema, signInSchema, acceptInvitationSchema } from '../auth';

import { coachRequestSchema, savePromptSchema } from '../coach';

import { submitQuizAttemptSchema } from '../learning';

import { createCheckoutSessionSchema } from '../billing';

import { updatePolicySchema } from '../admin';

// ---- Role / Plan / AiLevel constants (mirrors Prisma enums) ----------------
// We use string literals to avoid importing @levelup/db (which needs Prisma).
const VALID_ROLE = 'EMPLOYEE' as const;
const VALID_PLAN = 'STARTER' as const;

// ---- helpers ----------------------------------------------------------------

function issues(result: ReturnType<typeof inviteUserSchema.safeParse>) {
  if (result.success) return [];
  return result.error.issues.map((i) => i.message);
}

// ============================================================================
// inviteUserSchema
// ============================================================================
describe('inviteUserSchema', () => {
  it('parses a valid invite payload', () => {
    const result = inviteUserSchema.safeParse({
      email: 'alice@example.com',
      role: VALID_ROLE,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional departmentId (cuid)', () => {
    const result = inviteUserSchema.safeParse({
      email: 'bob@example.com',
      role: 'MANAGER',
      departmentId: 'cjld2cjxh0000qzrmn831i7rn', // valid cuid
    });
    expect(result.success).toBe(true);
  });

  it('fails on missing email', () => {
    const result = inviteUserSchema.safeParse({ role: VALID_ROLE });
    expect(result.success).toBe(false);
    const msgs = issues(result as ReturnType<typeof inviteUserSchema.safeParse>);
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('fails on invalid email format', () => {
    const result = inviteUserSchema.safeParse({ email: 'not-an-email', role: VALID_ROLE });
    expect(result.success).toBe(false);
  });

  it('fails on invalid role value', () => {
    const result = inviteUserSchema.safeParse({ email: 'a@b.com', role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });

  it('fails on wrong type for email (number)', () => {
    const result = inviteUserSchema.safeParse({ email: 42, role: VALID_ROLE });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// coachRequestSchema
// ============================================================================
describe('coachRequestSchema', () => {
  it('parses a minimal valid request', () => {
    const result = coachRequestSchema.safeParse({ inputText: 'Hello AI' });
    expect(result.success).toBe(true);
  });

  it('accepts optional category and conversationId', () => {
    const result = coachRequestSchema.safeParse({
      inputText: 'Help me write a prompt',
      category: 'prompting',
      conversationId: 'cjld2cjxh0000qzrmn831i7rn',
    });
    expect(result.success).toBe(true);
  });

  it('fails on empty inputText', () => {
    const result = coachRequestSchema.safeParse({ inputText: '' });
    expect(result.success).toBe(false);
  });

  it('fails when inputText exceeds 8000 chars', () => {
    const result = coachRequestSchema.safeParse({ inputText: 'a'.repeat(8001) });
    expect(result.success).toBe(false);
  });

  it('fails when inputText is missing', () => {
    const result = coachRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when inputText is a number', () => {
    const result = coachRequestSchema.safeParse({ inputText: 123 });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// submitQuizAttemptSchema
// ============================================================================
describe('submitQuizAttemptSchema', () => {
  it('parses a valid attempt', () => {
    const result = submitQuizAttemptSchema.safeParse({
      quizId: 'cjld2cjxh0000qzrmn831i7rn',
      answers: [0, 1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it('fails on empty answers array', () => {
    const result = submitQuizAttemptSchema.safeParse({
      quizId: 'cjld2cjxh0000qzrmn831i7rn',
      answers: [],
    });
    expect(result.success).toBe(false);
  });

  it('fails on negative answer index', () => {
    const result = submitQuizAttemptSchema.safeParse({
      quizId: 'cjld2cjxh0000qzrmn831i7rn',
      answers: [-1],
    });
    expect(result.success).toBe(false);
  });

  it('fails on non-integer answer', () => {
    const result = submitQuizAttemptSchema.safeParse({
      quizId: 'cjld2cjxh0000qzrmn831i7rn',
      answers: [1.5],
    });
    expect(result.success).toBe(false);
  });

  it('fails on missing quizId', () => {
    const result = submitQuizAttemptSchema.safeParse({ answers: [0] });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// createCheckoutSessionSchema
// ============================================================================
describe('createCheckoutSessionSchema', () => {
  it('parses a valid checkout session request', () => {
    const result = createCheckoutSessionSchema.safeParse({
      plan: VALID_PLAN,
      seats: 10,
      successUrl: 'https://app.levelup.ai/billing/success',
      cancelUrl: 'https://app.levelup.ai/billing/cancel',
    });
    expect(result.success).toBe(true);
  });

  it('fails when seats is 0', () => {
    const result = createCheckoutSessionSchema.safeParse({
      plan: VALID_PLAN,
      seats: 0,
      successUrl: 'https://app.levelup.ai/success',
      cancelUrl: 'https://app.levelup.ai/cancel',
    });
    expect(result.success).toBe(false);
  });

  it('fails when seats exceeds 10000', () => {
    const result = createCheckoutSessionSchema.safeParse({
      plan: VALID_PLAN,
      seats: 10001,
      successUrl: 'https://app.levelup.ai/success',
      cancelUrl: 'https://app.levelup.ai/cancel',
    });
    expect(result.success).toBe(false);
  });

  it('fails on invalid successUrl', () => {
    const result = createCheckoutSessionSchema.safeParse({
      plan: VALID_PLAN,
      seats: 5,
      successUrl: 'not-a-url',
      cancelUrl: 'https://app.levelup.ai/cancel',
    });
    expect(result.success).toBe(false);
  });

  it('fails on invalid plan value', () => {
    const result = createCheckoutSessionSchema.safeParse({
      plan: 'PRO',
      seats: 5,
      successUrl: 'https://app.levelup.ai/success',
      cancelUrl: 'https://app.levelup.ai/cancel',
    });
    expect(result.success).toBe(false);
  });

  it('fails on missing required fields', () => {
    const result = createCheckoutSessionSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// savePromptSchema
// ============================================================================
describe('savePromptSchema', () => {
  it('parses a valid save-prompt payload', () => {
    const result = savePromptSchema.safeParse({
      title: 'My summariser prompt',
      promptText: 'Summarise the following text: {{text}}',
      category: 'summarisation',
      isShared: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isShared to false when omitted', () => {
    const result = savePromptSchema.safeParse({
      title: 'Another prompt',
      promptText: 'Do something useful.',
      category: 'misc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isShared).toBe(false);
    }
  });

  it('fails when title is shorter than 2 chars', () => {
    const result = savePromptSchema.safeParse({
      title: 'A',
      promptText: 'Something.',
      category: 'misc',
    });
    expect(result.success).toBe(false);
  });

  it('fails when promptText is empty', () => {
    const result = savePromptSchema.safeParse({
      title: 'Good title',
      promptText: '',
      category: 'misc',
    });
    expect(result.success).toBe(false);
  });

  it('fails when category is empty', () => {
    const result = savePromptSchema.safeParse({
      title: 'Good title',
      promptText: 'Some text',
      category: '',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updatePolicySchema
// ============================================================================
describe('updatePolicySchema', () => {
  it('parses a valid policy update', () => {
    const result = updatePolicySchema.safeParse({
      policyText: 'Do not share customer PII outside the organisation. '.repeat(3),
      approvedTools: [
        { name: 'ChatGPT', tier: 'approved' },
        { name: 'Claude', tier: 'approved' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('fails when policyText is shorter than 20 chars', () => {
    const result = updatePolicySchema.safeParse({
      policyText: 'Too short.',
      approvedTools: [],
    });
    expect(result.success).toBe(false);
  });

  it('fails when approvedTools contains an empty name', () => {
    const result = updatePolicySchema.safeParse({
      policyText: 'A policy text that is long enough to pass the minimum check.',
      approvedTools: [{ name: '', tier: 'approved' }],
    });
    expect(result.success).toBe(false);
  });

  it('fails when approvedTools tier is not in the allowed set', () => {
    const result = updatePolicySchema.safeParse({
      policyText: 'A policy text that is long enough to pass the minimum check.',
      approvedTools: [{ name: 'Copilot', tier: 'maybe' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts an optional uploadedFileUrl', () => {
    const result = updatePolicySchema.safeParse({
      policyText: 'Policy text that passes minimum length validation.',
      approvedTools: [{ name: 'Copilot', tier: 'approved', notes: 'GA in EU' }],
      uploadedFileUrl: 'https://storage.levelup.ai/policies/doc.pdf',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// signInSchema
// ============================================================================
describe('signInSchema', () => {
  it('parses a valid sign-in request', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts an optional redirectTo URL', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      redirectTo: 'https://app.levelup.ai/learn',
    });
    expect(result.success).toBe(true);
  });

  it('fails on invalid email', () => {
    const result = signInSchema.safeParse({ email: 'not-valid' });
    expect(result.success).toBe(false);
  });

  it('fails on missing email', () => {
    const result = signInSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails on non-URL redirectTo', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      redirectTo: '/relative-path',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// acceptInvitationSchema
// ============================================================================
describe('acceptInvitationSchema', () => {
  it('parses a valid accept-invitation payload', () => {
    const result = acceptInvitationSchema.safeParse({
      token: 'a'.repeat(16),
      name: 'Alice Smith',
    });
    expect(result.success).toBe(true);
  });

  it('fails when token is shorter than 16 chars', () => {
    const result = acceptInvitationSchema.safeParse({
      token: 'short',
      name: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('fails when name is empty', () => {
    const result = acceptInvitationSchema.safeParse({
      token: 'a'.repeat(16),
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('fails on missing fields', () => {
    const result = acceptInvitationSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
