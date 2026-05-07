# Baseline Assessment Item Bank

This directory contains the assessment items used to score employees at first sign-up and recommend a starting `aiLevel`.

---

## Level Definitions

| Level            | One-sentence definition                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **BEGINNER**     | Understands basic AI safety hygiene, can recognize hallucinations, and writes functional prompts for simple tasks.                            |
| **PRACTITIONER** | Applies AI effectively to real work tasks, crafts structured prompts, and interprets AI output critically before acting.                      |
| **POWER_USER**   | Designs multi-step AI workflows, selects appropriate tools (RAG, agents, embeddings), and manages context and output format programmatically. |
| **CHAMPION**     | Leads AI adoption at an organizational level: builds governance frameworks, measures ROI, manages change, and models responsible use.         |

---

## Files

- `items.json` — The authoritative item bank (40 items). Each item matches the `AssessmentItem` Prisma model and includes additional seed fields (`slug`, `explanation`).

---

## Scoring Algorithm

The assessment presents a 30-item adaptive sample drawn proportionally from all four levels. Items are weighted by the level at which they appear.

**Recommended starting level = the highest level where the user scored at least 60% correct on items at that level.**

Concretely:

1. Score each level independently: `score[L] = correct_at_L / total_presented_at_L`.
2. Starting from CHAMPION and moving down, find the first level where `score[L] >= 0.60`.
3. If the user does not reach 60% at any level above BEGINNER, recommend **BEGINNER**.

### Example scoring table (30-item sample, proportional draw)

| Items presented by level | Pass threshold (60%) | Approx raw score range |
| ------------------------ | -------------------- | ---------------------- |
| 7 BEGINNER               | 5/7                  | —                      |
| 9 PRACTITIONER           | 6/9                  | —                      |
| 8 POWER_USER             | 5/8                  | —                      |
| 6 CHAMPION               | 4/6                  | —                      |

A user who scores 7/7 on BEGINNER, 8/9 on PRACTITIONER, 3/8 on POWER_USER, and 1/6 on CHAMPION would be placed at **PRACTITIONER** (last level with >= 60%).

---

## Category Distribution

| Category     | BEGINNER | PRACTITIONER | POWER_USER | CHAMPION | Total  |
| ------------ | -------- | ------------ | ---------- | -------- | ------ |
| safety       | 4        | 2            | 0          | 0        | 6      |
| prompting    | 3        | 3            | 3          | 0        | 9      |
| verification | 3        | 2            | 1          | 0        | 6      |
| application  | 0        | 5            | 0          | 0        | 5      |
| tooling      | 0        | 0            | 6          | 0        | 6      |
| governance   | 0        | 0            | 0          | 8        | 8      |
| **Total**    | **10**   | **12**       | **10**     | **8**    | **40** |

---

## How to Add New Items

1. Open `items.json`.
2. Append a new object conforming to the schema below. All fields are required.
3. Choose a `slug` that is unique, kebab-case, and descriptive (for example, `safety-paste-customer-data`).
4. Ensure the item does not duplicate a concept already tested by an existing item.
5. Run the seed script to validate and import the new items.

### Item schema

```json
{
  "slug": "kebab-case-unique-id",
  "prompt": "Single-sentence question with no preamble.",
  "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctIndex": 0,
  "level": "BEGINNER | PRACTITIONER | POWER_USER | CHAMPION",
  "category": "safety | prompting | verification | application | tooling | governance",
  "explanation": "Why the correct answer is correct, two sentences maximum."
}
```

### Writing guidelines (summary)

- Exactly 4 choices. Exactly one correct answer.
- Distractors must be plausible — no obviously absurd options.
- No "all of the above" or "none of the above" choices.
- Questions must be answerable without company-specific policy knowledge.
- US English. No emojis.

---

## Seed script

The item bank is consumed by `packages/db/src/seed-assessment.ts` (or equivalent), which reads `items.json`, strips the `slug` and `explanation` fields (which are not columns in the Prisma model), and upserts by slug into the `assessment_items` table.
