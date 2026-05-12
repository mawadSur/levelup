# Assessment Flow Regression Sweep — 2026-05-12

Target: https://ailevel.app (Kapitus deployment, behind auth)
Tester: Claude Code, authenticated as existing user (mawad10101@gmail.com)
API base (observed): `https://levelup-api-xz2v.onrender.com/api`

## Scenarios run

1. **Cold start — PASS** — Cleared localStorage, navigated `/assessment` -> `/assessment/start` -> `/assessment/take`. Runner POSTed `/assessments/start` and populated localStorage with `levelup-assessment-active-id` plus a `levelup-assessment-<sessionId>` record holding 30 items. After answering 30 questions and clicking Submit, the network call to `https://levelup-api-xz2v.onrender.com/api/assessments/submit` carried `assessmentSessionId: "f0b1e65e…"` and the full `itemResponses` array. Server returned `201 { assessmentId, score, scoreByLevel, recommendedLevel, message }`. The runner cleared both the per-session key and the active pointer, then routed to `/assessment/result`. Session id is correctly threaded end-to-end (fix `c6cff06` holds).
2. **Stale-localStorage recovery — PARTIAL PASS (bug surfaced)** — Two flavors observed:
   - The pre-existing `levelup-assessment-undefined` key from a pre-fix build was present in this account's localStorage. The runner did NOT crash on it (fix `23f66d0` holds — `isValidId` rejects the literal `'undefined'` string and skips restore). PASS.
   - However, when I injected an arbitrary fake session id (`deadbeef-fake-…`) and a hand-crafted persisted run with an `itemId` like `fakeitem-1`, the runner **happily resumed** the fake session and showed "Fake question / A B C D". Clicking Submit hit the server, which responded with a raw Zod validator error body (`{"validation":"cuid","code":"invalid_string","message":"Invalid cuid","path":["itemResponses",0,"itemId"]}`). That body was rendered to the user verbatim as the error banner — see Bug #1. The runner stayed in the failed state and reloading would resume the same stale fake session indefinitely (no auto-recovery / no "clear and start over" affordance).
3. **Mid-flow resume — PASS** — Answered Q1 + Q2 (`index: 2`, `answers: 2`), navigated away to `/learn`, then back to `/assessment/take`. Runner resumed at `QUESTION 03 / 30` with the same session id and both answers intact. Same behavior on a tab-close simulation via full navigation.
4. **Double submit — FAIL (not idempotent)** — Hooked `window.fetch` to fire each `/assessments/submit` twice with the identical body. Both calls returned `201 Created` with _different_ `assessmentId`s (`cmp2kwf0u000xmf8l1ofkv91n` and `cmp2kwfci0011mf8l7st72xzq`). Two `Assessment` rows were created, two audit logs and two `assessmentSubmitted` analytics events fired for one user attempt. The first-baseline aiLevel update guard inside `maybeUpdateAiLevel` will only run on the chronologically first row, but the duplicate row exists in history and scoring/reporting. See Bug #2.
5. **Network failure mid-submit — PASS (with minor UX wart)** — Overrode `window.fetch` to throw `TypeError('Failed to fetch …')` on `/assessments/submit`. Clicked Submit; UI transitioned `submitting -> answering`, the error banner appeared inline, the Submit button became clickable again, and localStorage retained answers/session so a retry is possible. Cleanup is correct: no orphaned "Scoring…" spinner. The wart is that the raw `Error.message` ("Failed to fetch (simulated network error)") is shown unfiltered — fine for engineers, less so for end users.

## Bugs found

**Bug #1 — Stale / tampered localStorage runs are trusted and produce a raw Zod error**
_Severity: medium._ `readPersisted` only guards against the literal sentinel strings `'undefined'` and `'null'`. Any other localStorage payload that parses as `{ assessmentId, items[], answers, index }` will be restored and rendered. On submit, the server responds with the framework's Zod validation envelope (visible because `apps/api/.../ZodValidationPipe` surfaces the array of issues as the exception message). The runner pipes that array straight into the user-visible error banner. Two sub-problems:

- The runner has no server-side validation of "is this session id still alive?" before trusting the persisted record. There's no `GET /assessments/session/:id` to check, so a stale (yesterday's) session id from a real-but-expired run would hit the same path and surface the friendly-but-still-internal `BadRequestException("assessmentSessionId does not match the expected sample for today…")` to the user. Recovery requires a manual localStorage wipe.
- The error UI does not offer a "Start over" button when submission fails. The user is trapped on Q-N with no path forward beyond opening DevTools.
  Suggested fix: in `assessment-runner.tsx`, on a 400 from `/submit`, clear `levelup-assessment-<id>` + `levelup-assessment-active-id` and re-call `startAssessment`. Also catch the Zod-shaped error in `apps/web/src/lib/api/client.ts` and render a generic "Could not score your assessment — let's try again" string rather than the raw `message`.

**Bug #2 — `/assessments/submit` is not idempotent**
_Severity: medium._ The service unconditionally runs `prisma.assessment.create(...)` for every POST with a valid `assessmentSessionId`. Two consecutive submits with the same body produce two `Assessment` rows, two audit log entries (`assessment.submit`), and two analytics events. A user who double-clicks Submit, or whose retry-on-error fires after the original request already succeeded server-side (e.g. response lost mid-flight), will end up with duplicate scored attempts in their history. The frontend disables the button while `phase === 'submitting'` so double-click is unlikely in practice, but network retries are not protected.
Suggested fix: enforce a unique index on `Assessment (userId, type, assessmentSessionId)` and have the service `upsert` on that key (or 200-return the existing row when the unique violation fires). Audit log can stay as-is or be deduped via the same key. Analytics tracking should move _inside_ the upsert branch so retries don't double-count.

**Bug #3 (minor) — Raw `Failed to fetch` exposed on submit network errors**
_Severity: low._ Scenario 5 surfaced the raw `Error.message` from a thrown `TypeError`. Wrap submit errors in `assessment-runner.tsx` (`catch` block on line 315) to produce a uniform "Couldn't save your answers — please try again." string instead of forwarding `err.message`.

## Recommended follow-up

- Add a unique index `(userId, type, assessmentSessionId)` on `Assessment` and convert the submit path to `upsert` (or to a `findFirst` + early return on duplicate). This is the highest-value fix — it eliminates duplicate-attempt rows from the most plausible production failure mode (network retry).
- Harden `readPersisted` further: in addition to the existing `isValidId` check, validate that each persisted `item.id` looks like a Prisma cuid (`/^c[a-z0-9]{24,}$/i`) before restoring. If any item fails the shape check, drop the persisted run and start fresh. This kills the "fake injected session" failure mode at the source.
- Add a "Start over" button to the runner's error state. Clears `levelup-assessment-<id>` + the active pointer and re-invokes `assessments.startAssessment('BASELINE')`. Required for any user who lands in the stale-session trap without DevTools knowledge.
- Map `ZodValidationPipe` and other 400-class errors to a friendly fallback in `apps/web/src/lib/api/client.ts` before they reach the runner's error banner.
- Consider stamping the persisted run with a `schemaVersion: 2` field; bump it whenever the persistence contract changes so old keys can be invalidated on load without relying on string sentinels.
