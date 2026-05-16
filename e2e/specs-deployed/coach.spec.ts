/**
 * Deployed regression — bounded coach round-trip.
 *
 * Validates `/api/coach/messages` streaming end-to-end through the deployed
 * Vercel rewrite + Render API + (optional) OpenAI integration. The spec sends
 * exactly ONE 1-character user message ("hi"), waits up to 30 seconds for the
 * assistant bubble to render any text, and asserts no console errors fired.
 *
 * Cost / safety:
 *   - Single user message of length 1 against gpt-4o-mini is < $0.001 per run.
 *   - If `OPENAI_API_KEY` isn't set on the deployed API the coach returns a
 *     deterministic stub response, which still validates the wiring (the
 *     point of this spec — not that the model itself answers correctly).
 *   - We never click "New conversation" or send a follow-up; the spec is
 *     idempotent in the sense that it just appends one short turn per run.
 *
 * Why no second message:
 *   The product allows multi-turn chats but every additional turn multiplies
 *   the OpenAI cost; one round-trip is enough to verify "stream opens, deltas
 *   flow, final commits, DOM stays clean."
 */
import { test, expect } from '@playwright/test';
import { DEMO_USERS, signInDeployed } from '../helpers/deployed-auth';

test.describe('Deployed coach round-trip', () => {
  test('ed@demo.test sends "hi", sees an assistant response, no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });

    await signInDeployed(page, DEMO_USERS.employee);

    // /coach is under the (learn) layout, so it shares the SSR cookie-rotation
    // race documented in login.spec.ts — one controlled retry.
    await page.goto('/coach', { waitUntil: 'domcontentloaded' });
    if (new URL(page.url()).pathname.startsWith('/sign-in')) {
      await page.goto('/coach', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(/\/coach(\/|$|\?)/, { timeout: 15_000 });

    // The composer is a <textarea> with a placeholder that includes
    // "Ask the coach anything" — stable across both tenant shells because
    // /coach itself is the same component for kapitus and ceolawyer.
    const composer = page.locator('textarea').first();
    await expect(composer, 'coach composer textarea must render').toBeVisible({
      timeout: 15_000,
    });
    await composer.fill('hi');

    // Submit button has aria-label="Send" while idle; switches to a Stop
    // button (aria-label="Stop") while the stream is in-flight.
    const sendBtn = page.getByRole('button', { name: /^Send$/ }).first();
    await expect(sendBtn, 'Send button must render').toBeVisible({ timeout: 5_000 });
    await sendBtn.click();

    // Wait for ANY assistant content. Several signals are valid:
    //   1. The "COACH" eyebrow label appears (rendered once the assistant
    //      bubble mounts — see coach-message.tsx AssistantBubble).
    //   2. The "COACH IS THINKING…" empty-state mounts mid-stream.
    //   3. A non-empty explanation/improved-prompt section renders.
    // We accept any of these as proof the stream wired up. The strongest
    // single signal is "COACH" appearing as an inline label after the user
    // bubble — present in both the thinking state and the final response.
    const coachLabel = page.getByText('COACH', { exact: true }).first();
    await expect(
      coachLabel,
      'assistant bubble (COACH label) must appear within 30s of sending "hi"',
    ).toBeVisible({ timeout: 30_000 });

    // Wait for the bubble to leave the "thinking" state — either a real
    // explanation/improvedPrompt block lands, or the stream errors and the
    // "Something went wrong" surface appears (which we then fail on).
    const thinkingState = page.getByText(/COACH IS THINKING/i).first();
    const explanationBlock = page.locator('.coach-char-delta, p.leading-relaxed').first();
    const improvedPromptHeader = page.getByText(/TRY THIS PROMPT INSTEAD/i).first();
    const errorBlock = page.getByText(/Something went wrong/i).first();

    await Promise.race([
      explanationBlock.waitFor({ state: 'visible', timeout: 30_000 }),
      improvedPromptHeader.waitFor({ state: 'visible', timeout: 30_000 }),
      errorBlock.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {
      // Fall through — assertions below will surface the actual state.
    });

    // Hard-fail if the assistant surfaced an error.
    const errorVisible = await errorBlock.isVisible().catch(() => false);
    if (errorVisible) {
      const errText = await errorBlock.innerText().catch(() => '<unreadable>');
      throw new Error(
        `Coach surfaced an error after sending "hi": "${errText}". ` +
          `consoleErrors=${JSON.stringify(consoleErrors).slice(0, 500)}`,
      );
    }

    // Soft-skip when the stream is still in "thinking" but we got the COACH
    // label — that proves the stream opened, which is what we care about.
    // (We do not consider this a failure: a cold OpenAI call on Render can
    // legitimately exceed 30s and still complete; we only need the wiring
    // to be live.)
    const haveExplanation = await explanationBlock.isVisible().catch(() => false);
    const haveImproved = await improvedPromptHeader.isVisible().catch(() => false);
    const stillThinking = await thinkingState.isVisible().catch(() => false);
    expect(
      haveExplanation || haveImproved || stillThinking,
      'assistant bubble must be in thinking-OR-rendering state — empty bubble = wiring broken',
    ).toBeTruthy();

    // No "Sensitive data detected" toast/banner — "hi" should not trip the
    // PII detector. If it does, that's a regression in the detector itself.
    const sensitiveBanner = page.getByText(/Sensitive data detected/i).first();
    expect(
      await sensitiveBanner.isVisible().catch(() => false),
      'sending "hi" must not trigger the sensitive-data banner',
    ).toBeFalsy();

    // No "Rate limited" / 429 toast.
    const rateLimitToast = page.getByText(/rate.?limit/i).first();
    expect(
      await rateLimitToast.isVisible().catch(() => false),
      'sending one message must not trigger the rate-limit toast',
    ).toBeFalsy();

    // Console error gate — same shape as login.spec.ts. We allow the
    // user-known "401 from /coach/conversations" log noise that fires on a
    // stale session (the page recovers automatically), so we only fail on
    // genuine pageerror entries or non-401 console.error messages.
    const seriousErrors = consoleErrors.filter((e) => {
      if (e.startsWith('pageerror:')) return true;
      // Network errors for the analytics endpoints are noisy and unrelated.
      if (/posthog|analytics|sentry/i.test(e)) return false;
      // Stale-session 401 chatter — recovered by the page.
      if (/401|unauthor/i.test(e)) return false;
      return true;
    });
    expect(
      seriousErrors,
      `console.error / pageerror must be empty during coach round-trip. ` +
        `Got: ${JSON.stringify(seriousErrors).slice(0, 600)}`,
    ).toHaveLength(0);
  });
});
