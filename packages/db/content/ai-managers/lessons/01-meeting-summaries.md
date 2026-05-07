---
slug: meeting-summaries
title: 'AI-Assisted Meeting Summaries'
estimatedMinutes: 12
orderIndex: 1
---

## The Meeting Summary Problem

Most meeting summaries are either missing or useless. Either nobody writes one, or someone produces a dense wall of notes that nobody reads. In both cases, the team leaves the meeting with five different interpretations of what was decided and who owns what. Two weeks later, you are relitigating a conversation you already had.

AI can break this pattern. Not by doing the thinking for you, but by doing the formatting — taking a rough transcript or notes and turning them into the structure your team needs to act. The catch is that AI is genuinely good at structure and genuinely bad at accuracy. You need both.

## The Structure That Works

A useful meeting summary has four sections, not a paragraph of prose:

**TL;DR** — Two sentences maximum. What happened in this meeting and why it matters. If you cannot write this in two sentences, the meeting probably lacked a clear purpose.

**Decisions made** — A numbered list of explicit decisions. Not "we discussed the budget" but "we approved a $40K allocation for Q3 tooling, pending CFO sign-off." Specificity is the whole point.

**Actions** — A table with three columns: owner, task, and due date. Each row is one commitment. If a commitment does not have an owner and a date, it is not a commitment; it is a wish.

**Parking lot** — Questions that came up but were not resolved. These need to be answered before the next relevant meeting, or they will get relitigated in that meeting too.

This structure is not new. What AI adds is the ability to generate a first draft of it in under a minute.

## The Prompt Pattern

```
Summarize this meeting transcript. Output the following sections:

TL;DR: Two sentences describing what happened and the outcome.
Decisions: Numbered list of explicit decisions made, including any conditions.
Actions: Table with columns Owner | Task | Due Date. List every commitment made.
Parking lot: Questions or topics that came up but were not resolved.

Transcript:
[paste transcript here]
```

If you have notes rather than a transcript, the same structure works — just substitute "notes" for "transcript."

### Adjusting for meeting type

Different meetings need slightly different prompts. For a 1:1, you probably do not want a formal action table, but you do want to capture the key topics discussed and any follow-ups. For a stakeholder update, the TL;DR is the entire product. For a retrospective, you want themes, not a verbatim list.

Add one sentence to the prompt to guide the tone: "This was an informal 1:1 — keep the tone conversational." or "This was an exec-level update — optimize for clarity over completeness."

## What AI Gets Wrong Here

AI gets the structure right. AI gets the facts wrong. This is not a minor caveat — it is the reason you cannot skip the review step.

Specific failure modes you will encounter:

**Name confusion.** If two people with similar names or roles were in the meeting, the model will mix up who said what. Always check action item owners against what you actually remember.

**Number fabrication.** AI sometimes inserts numbers that were not in the transcript — dates, dollar amounts, percentages — because numbers fit the pattern of the sentence. Every number in your summary needs a source.

**Invented decisions.** The model will occasionally produce a "decision" that was actually a discussion point. It sounds authoritative. It is not what happened. If you send this summary to your team, you have now created a false record.

**Missing nuance.** Hesitation, disagreement, and "we agreed to try this but we're not convinced" do not survive summarization well. If something was contentious, you need to add that context yourself.

## The Data Safety Constraint

Do not paste meeting recordings or transcripts into a public AI model unless that model has been approved by your company for that purpose.

Meeting transcripts contain names, internal strategy, HR context, budget numbers, and sometimes things people said that they expected to stay in the room. Pasting a performance-related conversation transcript into a consumer AI tool is an HR data leak. Pasting a Q3 planning meeting into an unapproved tool is a strategy leak.

The right approach: use the AI tooling your company has approved for internal data. Many modern meeting tools (Zoom, Teams, Google Meet) now have built-in AI summary features that keep data within your company's tenant. Use those if they are available and approved. If you are using a standalone AI model, use only notes you wrote yourself, not verbatim transcripts.

## Try This

Take a real meeting from this week — use your own notes if you do not have an approved transcript source. Run the prompt above. Read the output carefully and do one specific thing: mark every fact that you cannot immediately verify from memory. Names, decisions, dates, numbers. If you find even one that is wrong or unsupported, you have learned the core skill of this lesson. The goal is not to distrust AI. It is to calibrate exactly where AI ends and your judgment begins.

Then send the corrected summary to your team. Notice how much clearer the alignment is compared to a typical meeting without a summary.
