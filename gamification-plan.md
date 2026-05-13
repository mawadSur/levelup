# Gamification & Engagement Plan

LevelUp AI Academy — engagement push. Three layers: **motivators** (already shipped), **hands-on labs** (new — the differentiator), and **story scenarios** (new — narrative wrapper). Locked decisions captured at the bottom.

---

## Layer 1 — Motivators (✅ already built, two gaps to close)

The XP / streak / badge / cert chain already fires when a learner completes a lesson via `POST /api/progress/lessons/:id/complete`. Audited path:

1. `progress.service.completeLesson` → `UserProgress` set to `COMPLETED`
2. → `gameService.awardXp({ kind: 'LESSON_COMPLETED' })` (idempotent via `@@unique([userId, kind, sourceId])`)
3. → on first ever lesson: `LESSON_FIRST_TIME` + first-lesson `Badge`
4. → `incrementQuestProgress('lesson', 1)` advances any matching `DailyQuest`
5. → `awardXp` mutates `UserGameState`: xp, level, weeklyXp, streak, longestStreak, lastActiveDate, totalLessonsCompleted
6. → if streak crosses 7 or 30 → recursive `awardXp({ kind: 'STREAK_7' | 'STREAK_30' })`
7. → if last lesson in path: `maybeCreateCertificate` writes `Certificate` row with HMAC `signedHash`, audits `progress.path_complete`, awards `PATH_COMPLETED` XP

PDF rendering (pdfkit, A4 landscape) puts `holderName` at fontSize 32 dead-center — exactly what was asked for.

### Gaps to close now (small, focused)

- **G1 — auto-render cert PDF on path completion.** `progress.service.maybeCreateCertificate` creates the `Certificate` row but never calls `enqueueCertPdf`. Only the manual `/certificates` controller does. Fix: enqueue the BullMQ `cert-pdf` job inside `maybeCreateCertificate` right after the row is created (the worker handler already exists). Idempotency is fine — the row's `pdfUrl` stays null until the worker writes it.
- **G2 — leaderboard opt-out.** Locked decision says "default on with per-user opt-out." Add `User.leaderboardOptOut Boolean @default(false)`. Filter opt-outs from `GameService.getLeaderboard` aggregation. Add `PATCH /api/users/me/leaderboard-opt-out` (toggle) and surface a toggle in `/profile`.

These are the only end-to-end fixes needed before lesson completion works exactly as designed.

---

## Layer 2 — Hands-On Labs (NEW — Sprint 2)

Sandboxed AI scenarios where the learner _does the thing_ and an LLM grader scores them. This is the feature that separates LevelUp from a Udemy clone.

**Lab types to ship**:

1. **Prompt-injection defense** — learner role-plays a support assistant; rubric checks they didn't reveal system prompt or hidden admin notes.
2. **PII redaction** — must summarize a seeded doc without echoing names, emails, SSNs (reuse `classifySensitive` from `@levelup/llm`).
3. **Policy compliance** — must answer a user question without violating the active `CompanyPolicy` (reuse `CoachService` policy loader).

**Flow**

1. Lab page shows brief + sandboxed chat window.
2. Learner sends N prompts → `LabRunService` calls `gpt-4o-mini` (locked) with seeded system prompt + context.
3. Submit → grader LLM scores transcript against rubric (pass/partial/fail per criterion + overall score).
4. `LabAttempt` row persisted. Audit `lab.attempt` + `lab.passed`.
5. **End-to-end hook**: a passing `LabAttempt` writes an `XpEvent` (new kind: `LAB_PASSED`) → game state updates exactly like a lesson completion. Streak advances. Daily-quest progress with a new `lab` kind. If the path that contains the lab is now complete, the existing `maybeCreateCertificate` fires unchanged.

**Schema additions**

```prisma
enum XpEventKind {
  // ... existing ...
  LAB_PASSED                  // new
}

enum DailyQuestKind {
  // ... existing ...
  // add 'lab' if not already in the union (it lives in @levelup/types)
}

model Lab {
  id              String       @id @default(cuid())
  organizationId  String?      // null = global content
  learningPathId  String?      // optional — lab can live inside a path
  slug            String       @unique
  title           String
  brief           String       @db.Text
  systemPrompt    String       @db.Text  // simulated chatbot prompt
  seededContext   Json                   // fake docs, DB rows, hidden secrets
  rubric          Json                   // [{ criterion, weight, graderPrompt, passThreshold }]
  estimatedMinutes Int
  modelKey        String       @default("gpt-4o-mini")  // locked
  isPublished     Boolean      @default(false)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  organization Organization?  @relation(...)
  learningPath LearningPath?  @relation(...)
  attempts     LabAttempt[]

  @@index([organizationId])
}

model LabAttempt {
  id              String   @id @default(cuid())
  labId           String
  userId          String
  organizationId  String
  transcript      Json                   // [{role, content, ts}, ...]
  graderRaw       Json                   // full grader response
  score           Float                  // 0..1
  criteria        Json                   // per-criterion result + notes
  passed          Boolean
  tokensUsed      Int      @default(0)
  createdAt       DateTime @default(now())

  lab          Lab          @relation(...)
  user         User         @relation(...)
  organization Organization @relation(...)

  @@index([userId, labId])
  @@index([labId, createdAt(sort: Desc)])
}
```

**API surface**

| Method | Path                       | Purpose                                                       |
| ------ | -------------------------- | ------------------------------------------------------------- |
| `GET`  | `/api/labs`                | List labs visible to org (global ∪ org-owned, published only) |
| `GET`  | `/api/labs/:slug`          | Brief + initial visible context                               |
| `POST` | `/api/labs/:slug/runs`     | One simulated chatbot turn (returns assistant reply)          |
| `POST` | `/api/labs/:slug/attempts` | Submit transcript → grader → result                           |
| `GET`  | `/api/labs/me/attempts`    | Learner's attempt history                                     |
| `POST` | `/api/admin/labs`          | Org-scoped lab CRUD (ADMIN)                                   |

**Rate + cost**

- Reuse `RateLimitGuard` with a labs bucket (10 attempts/min/user, Redis sliding window via `@levelup/queue/checkRateLimit`).
- Grader system prompts are stable per lab → use OpenAI prefix cache (preserve the prompt-cache invariant — never mutate the prefix).
- Sandbox model: **`gpt-4o-mini`** (locked). Grader: same.
- Stub mode: `PLACEHOLDER_OPENAI_API_KEY` returns a deterministic score from regex match against rubric keywords.

**Content authoring**

- `packages/db/content/labs/<slug>.lab.json` — JSON spec with brief, system prompt, seeded context, rubric.
- Seed loader extends to idempotently upsert.

---

## Layer 3 — Story Scenarios (NEW — Sprint 3)

Narrative wrapper for select lessons. Cast: **Sara** (PM), **Dev** (intern), **Pat** (CISO). Branching choice points so learners experience consequences instead of being told about them.

**Content format** — `packages/db/content/<path>/<lesson>.scenario.md`:

```yaml
---
slug: leak-via-prompt
title: Don't paste customer data into ChatGPT
kind: scenario
estimatedMinutes: 7
characters: [sara, dev]
imageMode: ai          # ai | static | none — locked: ai, pre-generated at seed time
---

## Scene 1 — Friday, 4:50pm
Dev: "Can I just paste the customer export into ChatGPT to summarize it?"

[Choice]
- "Sure, save us time"        → scene-2-bad
- "Not without redacting"     → scene-2-good
- "Let's check the policy"    → scene-2-policy
```

**Renderer** — new component in `(learn)/lessons/[slug]`. Chat-bubble UI. Reads choice tree, branches on click. Final scene completion still routes through `POST /api/progress/lessons/:id/complete` — so XP/streak/badge/cert flow is identical to text lessons.

**Image pipeline (locked: pre-generate + store)**

1. At seed time, the scenario loader walks every `imageMode: ai` scene and generates an image via Vercel AI Gateway (image model — pick one stable model and pin it).
2. Image is uploaded to Vercel Blob keyed by `sha256(scene-prompt + scene-id + character-set)`. Idempotent — same scene re-seeded re-uses the cached blob.
3. Stored URL written to a new `LessonSceneAsset` table (or embedded in the scenario JSON after generation).
4. Stub mode returns a styled SVG title card so dev never blocks on an image model key.

```prisma
model LessonSceneAsset {
  id         String   @id @default(cuid())
  lessonId   String
  sceneSlug  String
  promptHash String   @unique
  blobUrl    String
  createdAt  DateTime @default(now())

  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([lessonId, sceneSlug])
}
```

Branching scenarios are still single `Lesson` rows in the DB — the scenario tree lives in the markdown. So no progress-tracking changes.

---

## Locked decisions

1. **Certification** — already issued automatically on path completion via `Certificate` row + HMAC `signedHash`. PDF renders learner name (fontSize 32 centered) + path title + org + verify URL. **Gap G1** closes the auto-render hookup.
2. **Leaderboards** — default **on**, per-user opt-out via `User.leaderboardOptOut` flag. **Gap G2** adds the schema + UI toggle + leaderboard filter.
3. **Image pipeline** — **pre-generate at seed time, store in Vercel Blob, cache by prompt hash.** Predictable cost, repeatable, no first-view latency.
4. **Lab sandbox model** — **`gpt-4o-mini`** for both simulated chatbot and grader. Cheap enough to run grader twice per attempt; reuse Anthropic-style prefix caching via OpenAI prompt cache.

---

## Phasing

| Sprint             | Ship                                                                                                                                                          | Notes                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **0 (close gaps)** | G1: cert PDF auto-enqueue on path complete · G2: leaderboard opt-out flag + toggle + filter                                                                   | ~1 day. Makes existing end-to-end actually fire.     |
| **1 (labs)**       | `Lab` + `LabAttempt` schema · `LabsModule` (NestJS) · grader pipeline · 3 seeded labs · `/learn/labs/[slug]` UI · XP hook on `LAB_PASSED` · audit + analytics | ~1 sprint. Largest cost.                             |
| **2 (scenarios)**  | `LessonSceneAsset` schema · scenario markdown loader · branching renderer · image generation worker job · 2 pilot scenarios on existing lessons               | ~half sprint. Lower risk now that infra is in place. |

---

## End-to-end completion flow (target state, after gap closes)

```
User finishes last lesson of "AI Basics for Every Employee"
  → POST /api/progress/lessons/:id/complete
    → UserProgress.status = COMPLETED
    → XpEvent(kind=LESSON_COMPLETED)        — awarded
    → DailyQuest progress incremented
    → UserGameState.{xp, level, streak} updated
    → STREAK_7 / STREAK_30 cascade if crossed
    → maybeCreateCertificate detects path complete
      → Certificate row created with HMAC signedHash
      → ✨ G1: enqueueCertPdf({ certificateId })   — NEW
      → AuditLog: progress.path_complete
    → XpEvent(kind=PATH_COMPLETED)          — awarded
  → Worker renders PDF → Certificate.pdfUrl populated
  → Learner sees: XP up, level up (if applicable), streak preserved,
                  cert in /profile, downloadable PDF with their name.
```

Want me to close G1 + G2 now, then queue Sprint 1 (labs) for the next pass?
