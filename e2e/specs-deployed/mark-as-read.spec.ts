/**
 * Deployed regression — clicking "Mark as read" on a lesson completes it and
 * advances to the next lesson.
 *
 * Why this exists:
 *   The user reported clicking "Mark as read" and seeing "could not save —
 *   try again". The bare catch in the button (pre-d37785e) was swallowing
 *   real ApiError details and showing a generic placeholder, so we could not
 *   tell from the report whether the API was failing, the session was
 *   expired, or the button itself was broken. The hardening commit fixed
 *   the error surface; this spec locks in the happy path against deployed
 *   so the next regression is caught before users notice.
 *
 * Why we don't pin a specific lesson slug:
 *   Demo accounts complete lessons over time as tests run, and the assignment
 *   data mixes scenario/lab/read kinds with quizzes. We dynamically pick the
 *   first eligible (non-scenario, non-lab, not-yet-completed) lesson from
 *   `ed@demo.test`'s assignments via the same data the page reads from. A
 *   pinned slug would silently rot the moment the demo seed shifted.
 */
import { test, expect } from '@playwright/test';
import { DEMO_USERS, signInDeployed } from '../helpers/deployed-auth';

interface MyPathProgressRow {
  pathId: string;
  pathSlug: string;
  currentLessonId: string | null;
}

interface PathProgressLesson {
  id: string;
  slug: string;
  status: string;
}

interface LessonShape {
  id: string;
  slug: string;
  learningPathId: string;
  kind?: string;
  body?: string;
}

/**
 * The lesson page renders ScenarioRenderer (which has its own completion
 * flow) when the lesson body looks like a scenario script. Mirror the page's
 * `looksLikeScenarioBody` heuristic so we skip those lessons here — we're
 * only testing the MarkLessonReadButton path.
 */
function looksLikeScenarioBody(body: string): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (!/^##\s+[a-z0-9][a-z0-9-]*/im.test(trimmed)) return false;
  return /\[(image|narrator|sara|dev|pat|choice)\]/i.test(trimmed);
}

test.describe('Deployed Mark-as-read regression', () => {
  test('ed@demo.test marks a lesson read → advances to next lesson', async ({ page }) => {
    await signInDeployed(page, DEMO_USERS.employee);

    // Confirm /learn doesn't bounce us back to /sign-in (one controlled
    // retry for the @supabase/ssr cookie rotation race documented in
    // login.spec.ts).
    await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    if (new URL(page.url()).pathname.startsWith('/sign-in')) {
      await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(/\/learn(\/|$|\?)/, { timeout: 15_000 });

    // Walk the learner's assigned paths and pick the first incomplete lesson
    // that will render MarkLessonReadButton. The page's render condition is
    // `!isScenario && !isLab && !quizData && !isCompleted` — we apply the
    // same filter using only data the API exposes.
    //
    // Wave 5 update: GET /lessons/:lessonId/quiz now actually returns the
    // quiz (was a 404 before — fetchQuizForLesson silently fell through to
    // null and the Mark-as-read button rendered anyway). That means lessons
    // with a quiz now render the QuizRunner instead. We must filter those
    // out by probing the new endpoint and skipping any lesson that returns
    // 200 (quiz exists). 404 = no quiz = Mark-as-read renders = pickable.
    const meResp = await page.request.get('/api/progress/me');
    expect(meResp.ok(), `/api/progress/me must return 200 (got ${meResp.status()})`).toBeTruthy();
    const progressRows = (await meResp.json()) as MyPathProgressRow[];

    let pickedPathSlug: string | null = null;
    let pickedLessonSlug: string | null = null;
    let pickedLessonId: string | null = null;

    outer: for (const row of progressRows) {
      const pp = await page.request.get(`/api/progress/me/paths/${row.pathId}`);
      if (!pp.ok()) continue;
      const ppJson = (await pp.json()) as { lessons?: PathProgressLesson[] };
      const incomplete = (ppJson.lessons ?? []).filter((l) => l.status !== 'COMPLETED');
      for (const cand of incomplete) {
        const lr = await page.request.get(`/api/lessons/${cand.id}`);
        if (!lr.ok()) continue;
        const lj = (await lr.json()) as LessonShape;
        if (lj.kind && lj.kind !== 'READ') continue;
        if (looksLikeScenarioBody(lj.body ?? '')) continue;
        // If the lesson has a quiz (200 from the new endpoint), the page
        // renders QuizRunner instead of Mark-as-read — skip.
        const quizProbe = await page.request.get(`/api/lessons/${cand.id}/quiz`);
        if (quizProbe.ok()) continue;
        pickedPathSlug = row.pathSlug;
        pickedLessonSlug = lj.slug;
        pickedLessonId = lj.id;
        break outer;
      }
    }

    if (pickedPathSlug === null || pickedLessonSlug === null || pickedLessonId === null) {
      // Self-healing skip: the demo user has completed every Mark-as-read
      // candidate across their assigned paths. That's expected over time
      // because each spec run completes one and there's no automated
      // unwind. Skipping rather than failing — the regression we care
      // about (a button that swallows errors) requires an eligible
      // lesson to actually exercise, and zero eligible lessons isn't a
      // button regression. Wave 6 follow-up: add a test-cleanup route
      // that unwinds ed@demo.test's progress on a known seed lesson, or
      // ensure the demo seed always carries N never-completed READ
      // lessons.
      test.skip(
        true,
        'No Mark-as-read-eligible lessons remain for ed@demo.test on this tenant. ' +
          'Either seed more READ lessons without quizzes or add a progress-unwind route.',
      );
      return;
    }

    const startUrl = `/learn/${pickedPathSlug}/${pickedLessonSlug}`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
    if (new URL(page.url()).pathname.startsWith('/sign-in')) {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(
      new RegExp(`/learn/${pickedPathSlug}/${pickedLessonSlug}(\\/|$|\\?)`),
      { timeout: 15_000 },
    );

    // Capture the API response for diagnostics on failure.
    const completeResponses: Array<{ status: number; body: string }> = [];
    page.on('response', async (resp) => {
      const url = resp.url();
      if (url.includes(`/progress/lessons/${pickedLessonId}/complete`)) {
        let body = '';
        try {
          body = (await resp.text()).slice(0, 400);
        } catch {
          /* ignore */
        }
        completeResponses.push({ status: resp.status(), body });
      }
    });

    const markBtn = page.getByRole('button', { name: /Mark as read|Try again/i }).first();
    await expect(
      markBtn,
      `Mark-as-read button must render on /learn/${pickedPathSlug}/${pickedLessonSlug} ` +
        `(picked because lesson is incomplete, kind=READ, body is not a scenario)`,
    ).toBeVisible({ timeout: 15_000 });

    await markBtn.click();

    // The hardened button either navigates to the next lesson (or refreshes
    // when it's the last lesson) or surfaces an ApiError in the error span.
    // Race the two outcomes: success wins → advance URL; failure wins → the
    // error span becomes visible and we surface the actual message.
    const errorSpan = page.locator('span.text-danger').first();
    await Promise.race([
      page.waitForURL((u) => !u.pathname.endsWith(`/${pickedLessonSlug}`), { timeout: 15_000 }),
      errorSpan.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {
      /* fall through to assertions */
    });

    if (await errorSpan.isVisible().catch(() => false)) {
      const errText = await errorSpan.innerText();
      throw new Error(
        `MarkLessonReadButton surfaced an error: "${errText}". ` +
          `complete responses=${JSON.stringify(completeResponses)}`,
      );
    }

    // Success: either we advanced to a new lesson URL, or (last lesson in
    // path) the page refreshed and the COMPLETED badge now shows. Both are
    // valid outcomes of a healthy complete-lesson call.
    const finalUrl = page.url();
    const advanced = !finalUrl.endsWith(`/${pickedLessonSlug}`);
    const completedBadge = page.getByText(/^COMPLETED$/).first();
    const badgeVisible = await completedBadge.isVisible().catch(() => false);
    expect(
      advanced || badgeVisible,
      `After clicking Mark as read, page should either advance to next ` +
        `lesson or show COMPLETED badge. startUrl=${startUrl} finalUrl=${finalUrl} ` +
        `responses=${JSON.stringify(completeResponses)}`,
    ).toBeTruthy();
  });
});
