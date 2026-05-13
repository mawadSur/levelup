# Curriculum Rework — 0-to-Hero Engagement Plan

The goal: turn the curriculum from "read these lessons, take a quiz, mark complete" into a structured 0-to-hero progression where every course mixes engaging narrative, illustrative imagery, and hands-on labs that actually teach AI fluency.

## Levels (mirrors the existing `AiLevel` enum)

| Tier             | Skill outcome                                                 | Path tier             |
| ---------------- | ------------------------------------------------------------- | --------------------- |
| **BEGINNER (0)** | "I know what AI is and won't accidentally leak data"          | Core onboarding paths |
| **PRACTITIONER** | "I can write a useful prompt and iterate"                     | Role-specific paths   |
| **POWER_USER**   | "I can chain prompts, evaluate outputs, work with tools/data" | Advanced paths        |
| **CHAMPION**     | "I can lead AI initiatives, audit work, train others"         | Leadership paths      |

Each tier gates the next via path-completion certificates.

## Curriculum structure per course

Every course follows the same pattern after the rework:

```
Course (path) = sequence of mixed-kind lessons:

  1. READ      — narrative intro (1–2 images)
  2. READ      — concept lesson (1–2 images)
  3. LAB       — practice what you just read (✦ skill checkpoint)
  4. READ      — deeper concept (1–2 images)
  5. SCENARIO  — branching workplace situation
  6. LAB       — apply both
  7. READ      — wrap-up + transfer
  8. LAB       — capstone (✦ skill checkpoint)
```

- **Reading lessons** are narrative, not lecture. Each opens with a workplace scene, introduces the concept by following someone navigating it, ends with a clear takeaway.
- **Images** illustrate the cast/scene per `[image]` directives parsed by the scenario engine (or new lesson-image generator for `kind: READ`).
- **Labs** at positions 3, 6, 8 are skill checkpoints — the learner can't move past a lab-lesson without passing it. Passing emits `LAB_PASSED` XP and advances the streak.
- **Scenarios** introduce branching decisions to test judgment without an LLM grader.

## Path coverage in this rework

| Path                             | Current                 | After rework                                                                                                       |
| -------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **AI Basics for Every Employee** | 6 reads + 3 inline labs | 8 lessons (5 READ + 3 LAB), 1 capstone SCENARIO. Images on every lesson.                                           |
| **AI for Sales Teams**           | 6 reads                 | 8 lessons (5 READ + 3 LAB). Labs: cold email rewrite, deal-PII handling, account-research synthesis.               |
| **AI for Managers**              | 6 reads                 | 8 lessons (5 READ + 3 LAB). Labs: 1:1 feedback drafting, performance-review summarization, coaching-prompt design. |
| **AI for Customer Support**      | 5 reads                 | Deferred to phase 2 (path not in seed.ts yet — re-author after phase 1).                                           |
| **AI for HR**                    | 5 reads                 | Deferred to phase 2.                                                                                               |
| **AI for Marketing**             | 6 reads                 | Deferred to phase 2.                                                                                               |

## Engineering tasks

1. **Image pipeline fix** — `seedScenarios` reports `scenesEnqueued: 0`. The bug means scene art isn't being generated even though the scenario parser sees the files. Fix the enqueue path.
2. **Per-lesson image generation** — New BullMQ job `generate-lesson-image`. Called from the seed for every `[image]` directive in a READ lesson body. Uploads to Supabase Storage `scene-assets` bucket (or a new `lesson-images` bucket). Cached by prompt hash.
3. **Curriculum visualization** — `/curriculum` becomes a visual progression view: levels grouped as horizontal swim-lanes, paths inside each level, mixed-kind lesson icons (📖 read, ⚙️ lab, 🎭 scenario), checkpoint markers on labs, user progress overlaid.

## Agent dispatch

Four parallel agents:

- **A1 — AI Basics rework.** Re-author content + add image directives + author lab specs.
- **A2 — Sales + Managers rework.** Same pattern across two paths.
- **A3 — Image pipeline.** Fix `seedScenarios` zero-enqueue + ship per-lesson image generator.
- **A4 — Curriculum frontend.** Build the visual progression view at `/curriculum`.

Coordinator (me) wires anything cross-cutting (new module imports, new seed entries, migration if schema needs another tweak).

## Out of scope for this phase

- AI for Support / HR / Marketing rework (phase 2)
- Skill-tree-style unlocks (phase 3 — would require unlock state on user)
- Lesson-image generation for the deferred paths
- Voice walkthroughs / narrated reads (phase 3+)

## Done criteria

- AI Basics, AI for Sales, AI for Managers each have 8 lessons mixing READ/LAB/SCENARIO with images on every lesson.
- Image pipeline actually generates art (no more `scenesEnqueued: 0`).
- `/curriculum` page renders the 0-to-hero progression visually.
- Migration applied to Supabase. Seed re-run cleanly. Web + API typechecks green. Pushed to main.
