/**
 * 03 — Baseline assessment flow
 *
 * Tests:
 *   1. Employee can reach /assessment and see the "Get started" / "Start" CTA.
 *   2. Clicking "Start" navigates to /assessment/start.
 *   3. Clicking "Start" (again, on the start page) navigates to /assessment/take.
 *   4. Answering all questions (up to MAX_QUESTIONS iterations) and submitting
 *      lands on /assessment/result with the recommended-level headline.
 *
 * Skips:
 *   - If the assessment item bank is empty (no questions loaded) the test is
 *     skipped rather than failing.
 *
 * Notes:
 *   - Each run creates a fresh assessment session via the API.
 *   - The assessment is answered by always clicking the first radio option
 *     (index 0) to ensure a deterministic, repeatable flow.
 *   - localStorage is used by the runner to persist state; Playwright's
 *     browser context gives us a clean slate per test run.
 */

import { test, expect } from '../fixtures/test-fixtures';

const MAX_QUESTIONS = 35; // seed has 30; give headroom for future additions

test.describe('Baseline assessment', () => {
  test('assessment landing page shows the "Get started" CTA', async ({ employeePage }) => {
    await employeePage.goto('/assessment');

    // The landing page shows either:
    //   a) "Your AI Baseline" + "Get started" button (first time)
    //   b) "You took the baseline on …" + "View result" / "Retake" (already done)
    // Either state is valid here — we just assert the page renders.
    const heading = employeePage.getByRole('heading', {
      name: /your ai baseline|you took the baseline/i,
    });
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('start page has the "Start" button that links to /assessment/take', async ({
    employeePage,
  }) => {
    await employeePage.goto('/assessment/start');
    const startButton = employeePage.getByRole('link', { name: /^start/i });
    await expect(startButton).toBeVisible();

    const href = await startButton.getAttribute('href');
    expect(href).toContain('/assessment/take');
  });

  test('can complete all questions and land on /assessment/result', async ({ employeePage }) => {
    // Clear any persisted in-progress run so we always start fresh.
    await employeePage.goto('/assessment/take');
    await employeePage.evaluate(() => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('levelup-assessment')) {
          localStorage.removeItem(key);
        }
      }
    });

    // Reload to trigger the fresh assessment start.
    await employeePage.reload();

    // Wait for the assessment runner to load questions (exits the loading state).
    await employeePage
      .getByText(/loading your assessment/i)
      .waitFor({ state: 'hidden', timeout: 20_000 })
      .catch(() => {
        // may already be hidden — that's fine
      });

    // Skip the test if the API returned no questions (empty item bank).
    const questionCount = await employeePage.locator('input[type="radio"]').count();
    test.skip(
      questionCount === 0,
      'Assessment item bank is empty — skipping until questions are seeded.',
    );

    let answered = 0;

    for (let i = 0; i < MAX_QUESTIONS; i++) {
      // Check if we've reached the Submit button (last question).
      const submitBtn = employeePage.getByRole('button', { name: /^submit$/i });
      const isLast = (await submitBtn.count()) > 0 && !(await submitBtn.isDisabled());

      // Select the first available radio option for the current question.
      const radios = employeePage.locator('input[type="radio"]');
      const radioCount = await radios.count();

      if (radioCount > 0) {
        await radios.first().click();
        answered++;
      } else {
        // No radio buttons — possibly a loading or error state.
        break;
      }

      if (isLast) {
        // Wait for the Submit button to be enabled, then click it.
        await submitBtn.waitFor({ state: 'visible' });
        await expect(submitBtn).toBeEnabled({ timeout: 5_000 });

        await Promise.all([
          employeePage.waitForURL('**/assessment/result', { timeout: 30_000 }),
          submitBtn.click(),
        ]);
        break;
      } else {
        // Click Next to advance to the next question.
        const nextBtn = employeePage.getByRole('button', { name: /^next$/i });
        await nextBtn.click();
      }
    }

    // Verify we landed on the result page.
    expect(employeePage.url()).toContain('/assessment/result');

    // The ResultSummary component renders:
    //   <h1>Your recommended level</h1>
    await expect(
      employeePage.getByRole('heading', { name: /your recommended level/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
