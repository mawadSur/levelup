/**
 * 05 — AI Coach flow
 *
 * Tests:
 *   1. Employee can navigate to /coach and see the chat interface.
 *   2. Employee can type a message and see a streamed response.
 *   3. The "Try this prompt instead" improved-prompt section appears.
 *   4. Employee can save the improved prompt to the library.
 *   5. The saved prompt appears on /prompts.
 *   6. Sensitive data: pasting a Luhn-valid card number triggers the
 *      sensitive-data warning banner (or toast).
 *
 * Cleanup:
 *   - afterEach deletes any prompt titled "E2E Saved Prompt" via the API.
 *
 * Notes:
 *   - Streaming tests use page.waitForResponse or time-based waits to detect
 *     when the assistant response has settled — NOT fixed sleeps.
 *   - In stub mode (WORKOS_API_KEY=PLACEHOLDER_*) the LLM module uses a stub
 *     that returns a deterministic canned response. If the stub is not active,
 *     the streaming assertion waits up to 30s for real OpenAI output.
 *   - The sensitive-data check is performed by the coach service on the server;
 *     the test sends a payload containing the Stripe test card number
 *     4242424242424242 (Luhn-valid) and asserts the warning banner appears.
 */

import { test, expect } from '../fixtures/test-fixtures';
import { listPrompts, deletePrompt } from '../helpers/api';

const SAVED_PROMPT_TITLE = 'E2E Saved Prompt';
const COACH_MESSAGE = 'Help me draft a cold email to a CTO who just announced layoffs.';
const SENSITIVE_MESSAGE = 'Here is a test card: 4242424242424242, customer email: foo@example.com';

// ---------------------------------------------------------------------------
// Helper: wait for the assistant's "improved prompt" section to appear.
// The coach streams field-by-field; improvedPrompt appears after explanation.
// ---------------------------------------------------------------------------
async function waitForImprovedPrompt(
  page: import('@playwright/test').Page,
  timeoutMs = 30_000,
): Promise<void> {
  // "Try this prompt instead" is the label rendered in coach-message.tsx.
  await expect(page.getByText(/try this prompt instead/i)).toBeVisible({ timeout: timeoutMs });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('AI Coach', () => {
  test('coach page renders the chat interface', async ({ employeePage }) => {
    await employeePage.goto('/coach');

    // CoachChat renders <h1>AI Coach</h1> in its header.
    await expect(employeePage.getByRole('heading', { name: /ai coach/i })).toBeVisible({
      timeout: 10_000,
    });

    // The textarea composer should be present.
    await expect(
      employeePage.getByRole('textbox', {
        name: /ask the coach|coach is responding/i,
      }),
    ).toBeVisible();
  });

  test('sending a message produces a streamed response', async ({ employeePage }) => {
    await employeePage.goto('/coach');

    const textarea = employeePage.getByRole('textbox', {
      name: /ask the coach|coach is responding/i,
    });
    await textarea.fill(COACH_MESSAGE);

    // Cmd+Enter triggers send (keyboard shortcut in CoachChat).
    await textarea.press('Control+Enter');

    // The user message bubble should appear immediately.
    await expect(employeePage.getByText(COACH_MESSAGE)).toBeVisible({ timeout: 5_000 });

    // Wait for the assistant's explanation section to start streaming.
    // The assistant bubble starts with a "Coach is thinking…" state, then
    // transitions to showing content.
    await expect(employeePage.getByText(/coach is thinking|try this prompt instead/i)).toBeVisible({
      timeout: 15_000,
    });

    // Wait for the full response to settle (improvedPrompt section).
    await waitForImprovedPrompt(employeePage);
  });

  test('"Try this prompt instead" section is visible after response', async ({ employeePage }) => {
    await employeePage.goto('/coach');

    const textarea = employeePage.getByRole('textbox', {
      name: /ask the coach|coach is responding/i,
    });
    await textarea.fill(COACH_MESSAGE);
    await textarea.press('Control+Enter');

    await waitForImprovedPrompt(employeePage);

    // The section header uses the text "Try this prompt instead".
    await expect(employeePage.getByText(/try this prompt instead/i).first()).toBeVisible();
  });

  test('employee can save the improved prompt to the library', async ({
    employeePage,
    employeeCookie,
  }) => {
    await employeePage.goto('/coach');

    const textarea = employeePage.getByRole('textbox', {
      name: /ask the coach|coach is responding/i,
    });
    await textarea.fill(COACH_MESSAGE);
    await textarea.press('Control+Enter');

    await waitForImprovedPrompt(employeePage);

    // Click "Save to library" button inside the improved prompt section.
    const saveBtn = employeePage.getByRole('button', { name: /save to library/i });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
    await saveBtn.click();

    // The SavePromptDialog opens.
    await expect(employeePage.getByRole('heading', { name: /save this prompt/i })).toBeVisible({
      timeout: 5_000,
    });

    // Fill the title.
    const titleInput = employeePage.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill(SAVED_PROMPT_TITLE);

    // Click the "Save" submit button inside the dialog.
    const dialogSaveBtn = employeePage.getByRole('button', { name: /^save$/i });
    await dialogSaveBtn.click();

    // A success toast appears: "Prompt saved to your library".
    await expect(employeePage.getByText(/prompt saved to your library/i)).toBeVisible({
      timeout: 10_000,
    });

    // Verify the prompt exists via the API.
    const prompts = await listPrompts(employeeCookie, { q: SAVED_PROMPT_TITLE });
    const found = prompts.find((p) => p.title === SAVED_PROMPT_TITLE);
    expect(found).toBeDefined();
  });

  test('saved prompt appears on /prompts page', async ({ employeePage, employeeCookie }) => {
    // Ensure the prompt exists (create via UI if not).
    const existing = await listPrompts(employeeCookie, { q: SAVED_PROMPT_TITLE });
    const alreadyExists = existing.some((p) => p.title === SAVED_PROMPT_TITLE);

    if (!alreadyExists) {
      // Create it via the coach flow.
      await employeePage.goto('/coach');
      const textarea = employeePage.getByRole('textbox', {
        name: /ask the coach|coach is responding/i,
      });
      await textarea.fill(COACH_MESSAGE);
      await textarea.press('Control+Enter');
      await waitForImprovedPrompt(employeePage);

      await employeePage.getByRole('button', { name: /save to library/i }).click();
      await employeePage
        .getByRole('heading', { name: /save this prompt/i })
        .waitFor({ timeout: 5_000 });
      const titleInput = employeePage.getByLabel(/title/i);
      await titleInput.clear();
      await titleInput.fill(SAVED_PROMPT_TITLE);
      await employeePage.getByRole('button', { name: /^save$/i }).click();
      await employeePage.getByText(/prompt saved to your library/i).waitFor({ timeout: 10_000 });
    }

    // Navigate to /prompts.
    await employeePage.goto('/prompts');
    await expect(employeePage.getByText(SAVED_PROMPT_TITLE)).toBeVisible({ timeout: 15_000 });
  });

  // ── afterEach cleanup ──────────────────────────────────────────────────────
  test.afterEach(async ({ employeeCookie }) => {
    try {
      const prompts = await listPrompts(employeeCookie, { q: SAVED_PROMPT_TITLE });
      for (const p of prompts) {
        if (p.title === SAVED_PROMPT_TITLE) {
          await deletePrompt(p.id, employeeCookie);
        }
      }
    } catch {
      console.warn('[05-coach] afterEach cleanup failed');
    }
  });
});

// ---------------------------------------------------------------------------
// Sensitive data detection
// ---------------------------------------------------------------------------

test.describe('Sensitive data warning', () => {
  test('pasting a Luhn-valid card number triggers the sensitive-data banner or toast', async ({
    employeePage,
  }) => {
    await employeePage.goto('/coach');

    const textarea = employeePage.getByRole('textbox', {
      name: /ask the coach|coach is responding/i,
    });
    await textarea.fill(SENSITIVE_MESSAGE);
    await textarea.press('Control+Enter');

    // The user message should appear.
    await expect(employeePage.getByText(SENSITIVE_MESSAGE)).toBeVisible({ timeout: 5_000 });

    // Wait for the response to complete (up to 30s for real LLM; stub is instant).
    await expect(employeePage.getByText(/coach is thinking|sensitive data detected/i)).toBeVisible({
      timeout: 15_000,
    });

    // The sensitive-data warning may manifest as:
    //   a) An inline SensitiveWarningBanner (AlertTitle: "Sensitive data detected")
    //   b) A toast notification ("Sensitive data detected in your prompt.")
    // We accept either.
    const bannerOrToast = employeePage.getByText(/sensitive data detected/i);
    await expect(bannerOrToast.first()).toBeVisible({ timeout: 30_000 });
  });
});
