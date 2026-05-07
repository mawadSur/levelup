---
slug: performance-review-drafts
title: 'AI for Performance Review Drafts'
estimatedMinutes: 14
orderIndex: 2
---

## The Review You Procrastinate On

Performance reviews are the task most managers delay the longest and feel the worst about. The delay is real: good reviews require synthesizing six months of observation into specific, fair, actionable language, under time pressure, for every person on your team. The stakes are high — these documents affect careers, compensation, and how people feel about their work.

AI can help with the drafting. It cannot help with the evaluation. The distinction matters enormously, and getting it wrong creates legal, ethical, and cultural problems.

## What AI Is For Here

AI is useful for one specific thing in the performance review process: turning your bullet notes into coherent prose.

You have been observing this person all year. You have impressions. You have specific examples. You have notes, maybe scattered across emails, a doc, a mental model of their work. The problem is converting that raw material into the kind of clear, specific, fair language that reviews require. That is a writing problem, and writing is what AI is good at.

What AI is not for: forming the evaluation itself. You should never hand AI a list of outputs and ask it to decide whether someone is meeting expectations or what rating they deserve. That judgment belongs to you. It requires knowing this person, their context, their starting point, their team dynamics, their growth over time. AI has none of that.

## The Prompt Pattern

```
I'm a manager writing a performance review for an engineer on my team.
Here are the strengths I've observed during this review period:
[your bullet list]

Here are the growth areas I've identified:
[your bullet list]

Draft a 3-paragraph performance review in a direct, specific, and kind voice.
Use the SBI structure (Situation, Behavior, Impact) where natural.
Do not invent examples — use only what I've provided.
Do not add filler phrases like "John is a valuable member of the team."
```

The instruction "do not invent examples" is not optional. Without it, AI will add plausible-sounding specifics that did not happen. You will catch most of them, but not all — and one invented example in a performance review is a serious problem.

### What goes in your bullet list

Good inputs produce good drafts. Your bullet list should include:

- Specific projects or tasks, not general impressions. "Led the migration from v1 to v2 API in Q2" not "does good technical work."
- Observable behaviors, not personality labels. "Proactively flagged the dependency risk two weeks before the deadline" not "is detail-oriented."
- Impact where you know it. "The refactor reduced deploy failures by roughly 30%" not just "improved reliability."
- Actual growth area examples. "Has missed two consecutive sprint deadlines without proactive communication" not "needs to work on communication."

If your bullets are vague, the AI draft will be vague. This is actually useful feedback — if you cannot write a specific bullet, you need to think harder about what you actually observed.

## Rewrite in Your Own Voice

The most important step is not in the prompt. It is after the draft.

Read the draft out loud. Change every sentence that does not sound like how you actually talk. Performance reviews are a trust document between you and the person being reviewed. If you send a review that sounds like it was written by a different person, that person will feel it — even if they cannot articulate why. "This doesn't sound like my manager" is a real thing people notice, and it damages the relationship the review is supposed to support.

Rewriting is not a quality check. It is how you put your actual perspective into the document. AI gave you a structure to push against. Your edits are the real content.

## Sensitive Data Warning

Performance reviews are HR data. Depending on your jurisdiction and your company's policies, they may be legally protected, discoverable in disputes, and subject to data handling requirements.

Do not input salary information, compensation discussions, or HR system data into any AI tool not approved for that purpose. Do not paste previous review text from your HR system into a public model. Do not include anything your HR team would consider a protected attribute or sensitive personal data.

If your company has an approved HR AI tool, use it. If not, keep the AI input limited to your own observational notes written in neutral language — the kind of notes you would be comfortable explaining to HR or legal.

## Try This

Find a performance review you wrote in a previous cycle. Reconstruct the bullet notes you would have given AI as input — the specific observations behind that review. Then run the prompt above and generate a new draft. Compare the two: your original and the AI-assisted draft. Ask: Does this new draft reflect what I actually think about this person? Is there anything in the AI draft that I would not have said myself, or that I am not sure is accurate?

If the AI draft improved clarity and structure but preserved your evaluation, the tool worked correctly. If the AI draft changed your evaluation — softened criticisms you meant to make, added strengths you would not have emphasized — revise until the document reflects your actual judgment. That revision is the work. AI gave you a structure to push against.
