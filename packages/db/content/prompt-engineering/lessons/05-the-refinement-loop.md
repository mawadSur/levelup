---
slug: the-refinement-loop
title: The Refinement Loop
estimatedMinutes: 12
orderIndex: 5
---

# The Refinement Loop

Almost no good prompt works the first time. This is the single most important thing to internalize as a Specialist-tier user: the people who get great output from AI are not the people who write a magic prompt in one shot. They are the people who have a _workflow_ for getting from a mediocre first response to a great final one in three or four iterations — and who do it fast enough that the total time is still less than starting from scratch.

This lesson is about that workflow. It's less about a specific technique and more about a professional habit.

## The instinct to fix the output by hand

When the first response comes back and it's 80% right, your brain wants to do one thing: open the response in your editor and fix the 20% by hand.

Resist this. Every time you fix output by hand, you have:

- Lost the information about _what went wrong_ in the prompt.
- Lost the chance to make every future use of that prompt better.
- Created a one-off result that's only as good as your manual edit.
- Spent your effort on the symptom (this one response) instead of the cause (the prompt).

The professional move is the opposite: when you spot a problem in the output, the first question is "what would I add to the prompt to prevent this?" Then you edit the prompt and re-run.

The hand-edit is the _last_ step, when the prompt is doing as much as it can and there's residual cleanup to do. It is not the first step.

## The refinement loop, in five steps

1. **Draft the prompt.** Get the five components in (lesson 1). Don't try to be perfect — get something that's plausibly close.
2. **Run it.** Read the entire response, not just the first line.
3. **Identify exactly what's wrong.** Be specific. Not "this isn't quite right" — "the tone is too formal in the second paragraph," or "the recommendation contradicts the analysis in the third bullet," or "it invented a statistic about industry growth rates."
4. **Patch the prompt.** For each specific issue, add the constraint, example, or instruction that would have prevented it. Don't start over; edit.
5. **Re-run.** Compare. If it's better but still imperfect, go back to step 3 on whatever's left.

The whole loop should take 30 seconds per iteration. If you find yourself spending two minutes per iteration, you're probably over-engineering. Cut and ship.

## A Kapitus example, in iterations

Task: Summarize a long email thread between a borrower and a loan officer into a one-paragraph CRM note.

### Iteration 1

> Summarize this email thread into a CRM note.

Output: A four-paragraph essay about the relationship history. Way too long.

**Diagnosis:** No length constraint, no format spec.

### Iteration 2

> Summarize this email thread into a single-paragraph CRM note under 80 words.

Output: One paragraph, right length. But it includes phrases like "valued client" and "going forward" — marketing-speak that has no place in a CRM note.

**Diagnosis:** No tone/voice constraint. Need to specify "internal note" tone.

### Iteration 3

> Summarize this email thread into a single-paragraph CRM note under 80 words. Tone: internal-only, factual, no marketing language. Write like you're informing a colleague who'll pick up the file next.

Output: Right length, right tone. But it omits the dollar amount the borrower mentioned in their second email, which is the most important detail in the thread.

**Diagnosis:** Need to specify what to _include_, not just how to phrase.

### Iteration 4

> Summarize this email thread into a single-paragraph CRM note under 80 words. Tone: internal-only, factual, no marketing language. Always include: any dollar amounts, any explicit timelines, the borrower's stated next step, and any unresolved questions.

Output: Tight, factual, includes the relevant facts. Ship it.

The whole process took less than three minutes and produced a prompt you can save and reuse next time you need a CRM note from an email thread. The next thread will take 30 seconds, not three minutes.

## Keeping a personal prompt library

If you find yourself iterating to the same shape of prompt repeatedly, save it. A "personal prompt library" is the highest-leverage thing a power user can build, and almost no one does.

What this looks like in practice:

- A simple text file (or Notion page, or wherever you keep notes) with one section per task.
- Each entry has: a label, the prompt template, and a note about what variables to fill in.
- Examples: "Decline letter — short-history," "CRM note from email thread," "Underwriting memo — MCA," "Reply to borrower silence," "Extract fields from referral profile."

When you start a task, your first move is to check the library. If there's a template, you fill it in. If there isn't, you build one in the refinement loop and add it to the library at the end. After a few months, your library covers most of your repetitive work, and your first-iteration quality jumps because you're not starting from zero.

This is also the artifact that lets you share what works with teammates. A good prompt is reusable across people in the same role.

## How to diagnose what's wrong

The four most common diagnoses, in rough order of frequency:

1. **Missing constraint.** The output is the wrong length, wrong tone, or includes something it shouldn't. Fix: add the missing constraint.
2. **Missing example.** You can describe what you want but the model isn't getting there. Fix: add a one-shot or three-shot example (lesson 2).
3. **Missing reasoning structure.** The model jumped to a conclusion without weighing the right factors. Fix: add structured chain-of-thought (lesson 3).
4. **Missing output schema.** The output is loose, hard to compare across runs, contains hedge language. Fix: specify the output format (lesson 4).

Each of the four lessons in this path is a tool for a specific diagnosis. The refinement loop is how you decide which tool to reach for.

## When to give up

There is a category of task where the refinement loop is the wrong tool, and you should stop iterating and just write the thing yourself:

- **Tasks shorter than the prompt.** If your prompt is going to be 200 words and the response is going to be 50, you're better off writing the 50 words.
- **Tasks where the input is mostly context only you have.** If 90% of the email you need to write is information that isn't on the page anywhere — recent verbal commitments, internal politics, a backstory the AI can't infer — typing it into a prompt as context is the same effort as just writing the email.
- **Tasks where the audience is one specific person you know well.** The AI doesn't know that this borrower hates being called by their first name in writing, or that your manager wants every memo to start with the recommendation. By the time you've explained all of that, you've written the thing.
- **High-stakes tasks where verifying the output costs more than producing it from scratch.** If you'd have to read every word three times to trust it, you're not actually saving time.

The mark of a Specialist-tier user is recognizing these tasks quickly and not wasting 15 minutes refining a prompt for something they could have written in 5.

## What to take away

The refinement loop is the meta-skill. You will use it on every non-trivial prompt for the rest of your career. The instinct to fix output by hand is the wrong instinct — fix the prompt instead, so every future run is better. Keep a personal library of what works. And know when to put the AI down and just write the thing yourself.

That's the whole craft.
