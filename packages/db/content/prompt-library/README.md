# Prompt Library — Starter Pack

This directory contains the seed content for the LevelUp AI Academy global prompt library. The 50 prompts in `prompts.json` are seeded into the database with `isShared: true`, meaning every organization on the platform can access and use them. Organizations can fork any global prompt into their own workspace to customize it without affecting the shared version.

---

## How a prompt is structured

Every prompt follows a four-layer pattern that produces reliable, useful output from a general-purpose LLM.

### 1. Context layer

Opens with a persona statement that tells the model what role it is taking: "You are a [role] who [relevant expertise]." This grounds the tone and domain knowledge without requiring a system prompt.

### 2. Task layer

States the specific thing to do — rewrite, generate, analyze, summarize, draft. One task per prompt. Compound tasks produce worse output than two focused prompts run in sequence.

### 3. Output layer

Describes the structure of the response: sections, tables, numbered lists, word count, format. The more specific the output instruction, the more consistent and usable the result. Vague output instructions produce vague output.

### 4. Constraints layer

Negative instructions and guardrails: what to exclude, what tone to avoid, what not to invent. These are not optional polish — they are the difference between a prompt that works once and one that works reliably.

---

## How to use placeholders

Placeholders use double-brace syntax: `{{placeholder_name}}`. Before running a prompt, replace every placeholder with the actual value. Do not leave a placeholder blank — a missing value degrades the output more than a rough draft of the value does.

**Good placeholder names are descriptive:**

- `{{customer_name}}` — not `{{name}}`
- `{{known_pain_point}}` — not `{{context}}`
- `{{review_period}}` — not `{{date}}`

Placeholder names in this library use snake_case and are chosen to make it obvious what to fill in, even without reading the full prompt.

---

## How to add a new prompt

Add an object to `prompts.json` following this exact shape:

```json
{
  "slug": "unique-stable-slug",
  "title": "Short imperative title (8 words or fewer)",
  "category": "sales | marketing | support | hr | manager | exec | engineering | general",
  "promptText": "The prompt template. Use {{placeholder_name}} for variable inputs.",
  "tags": ["tag-one", "tag-two"],
  "use_when": "1–2 sentences: when to reach for this prompt over alternatives.",
  "anti_pattern": "1 sentence: the common mistake this prompt should not be used for."
}
```

**Rules for adding a new prompt:**

1. The `slug` must be unique across the entire file. Use kebab-case. Prefix with the category (e.g., `sales-`, `hr-`).
2. `title` should be an imperative verb phrase under 8 words.
3. `promptText` must be 80–250 words. Shorter rarely provides enough structure; longer tends to be ignored.
4. Every placeholder must be descriptive. Test the prompt by filling in realistic values before committing it.
5. The `use_when` field is not optional — it helps users find the right prompt quickly.
6. The `anti_pattern` field prevents misuse. Think about the most common way someone would reach for this prompt incorrectly.

---

## Seeding behavior

These prompts are seeded by the `packages/db/seeds/prompt-library.ts` seed script. The seed script:

- Upserts on `slug` — safe to re-run without creating duplicates.
- Sets `isShared: true` on every prompt so they appear in the global library.
- Sets `orgId: null` — these are platform-level prompts, not owned by any organization.

When an organization member forks a global prompt, the platform creates a new `Prompt` record with the same content but `isShared: false`, `orgId` set to their organization, and a reference to the source `slug`. This allows the organization to customize without losing the link to the original.

---

## Category distribution

| Category    | Count  |
| ----------- | ------ |
| sales       | 8      |
| support     | 8      |
| hr          | 8      |
| manager     | 8      |
| marketing   | 6      |
| engineering | 6      |
| exec        | 3      |
| general     | 3      |
| **Total**   | **50** |
