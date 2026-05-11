---
slug: the-committee-memo-pattern
title: The Committee Memo Pattern
estimatedMinutes: 11
orderIndex: 5
---

# The Committee Memo Pattern

The committee memo is the artifact your work is judged on. It is what the committee reads, what audit pulls, what a regulator sees, and what your successor reviews when the deal is up for renewal in 18 months. AI can help you draft three of its four sections quickly. It cannot help you write the fourth — and the fourth is the one that matters most.

## The structure

A Kapitus committee memo has four sections. Across the industry the names vary; the structure does not.

**1. Deal overview.** What is the applicant, what is the request, what is the use of funds. Two to four sentences. The committee should know what they are about to discuss before the end of this section.

**2. Risk summary.** The three to five things that concern you about this credit, in order of severity. This is not a list of every possible risk; it is the picture an experienced reader needs to understand the deal's character.

**3. Mitigants.** For each risk, what makes you comfortable enough to recommend the deal anyway. Structural mitigants (guarantees, collateral, covenants), behavioral mitigants (payment history, time in business), or pricing mitigants (rate, term, advance rate adjustments).

**4. Recommendation.** The call. Approve, decline, approve with structure changes, refer up. With your name on it.

Sections one through three are synthesis. Section four is judgment. The split matters.

## Where AI helps

**Deal overview.** This is restatement work. You have a file; the overview is a compressed version of the file's first page. Feeding the application and a redacted summary into AI with the prompt "Produce a four-sentence deal overview suitable for a credit committee memo: applicant description, request, use of funds, key structural facts. No recommendation, no characterization" gets you 80% of a usable draft in 30 seconds. You polish.

**Risk summary.** Trickier. The risks themselves are your judgment — you decide what is on the list and in what order. But once you have decided, AI is good at turning your bullet list into prose that reads at committee. The prompt pattern: "Below are the four risks I have identified for this deal. Expand each into one to two sentences of memo-quality prose, in the order given. Do not add risks I have not listed. Do not rank them differently than I have. Do not soften."

That last instruction matters. The model will, by default, soften risk language toward what credit memos usually sound like. If you wrote "obligor's prior bankruptcy is unresolved in our file," the model may produce "the obligor's credit history includes a prior bankruptcy event." Notice the change: yours says we do not know the story, theirs says there is a story but in neutral terms. Keep the bite.

**Mitigants.** Same pattern. You list the mitigants; the model writes the prose. Do not let the model invent mitigants. If you wrote three mitigants, the output should have three — not four with a generic fourth like "the borrower has demonstrated commitment to the business through continued operations." The model adds that kind of sentence freely. Cut it. A mitigant that did not occur to you is not a mitigant; it is genre filler.

## Where AI does not help

**The recommendation. Ever.**

There are three reasons, in order of importance.

**One: it is the most consequential paragraph in your work product.** It is what the committee votes on. It is what audit pulls. It is what — if things go wrong — gets read back to you across a conference room table. The model has no skin in any of that. You do.

**Two: a recommendation is the integration of factors only you have access to.** The portfolio's current concentration in this industry. The other deals from this broker that have or have not seasoned. The conversation with the principal that you remember the texture of. The senior underwriter's offhand comment last week about a similar applicant. These do not live in the file. They live in you. A recommendation written without them is missing the actual underwriting.

**Three: the model will produce a recommendation that pattern-matches the strongest visible facts in your synthesis.** If your synthesis emphasized cash-flow strength, the recommendation will lean approve. If your synthesis emphasized industry headwinds, it will lean decline. The model is following the rhetorical gradient. You are supposed to be doing the opposite — weighing the things the synthesis underweights, catching the things the synthesis missed, applying portfolio judgment the synthesis cannot.

So the rule: **you write the recommendation in your own words, without AI assistance, every time.** This includes "polishing" — do not paste your own recommendation into a model and ask for cleanup. The recommendation is the one piece of writing in your job where the words being yours, not the model's, is part of the deliverable's integrity.

## A workable workflow

Here is a sequence that produces a committee-ready memo in roughly 40-60 minutes on a normal-complexity deal, instead of the 90-120 you might spend without AI:

1. **Read the file fully first.** Yourself. Do not summarize anything yet. You are forming the underwriter's gestalt — the feel for the deal. This takes 20-30 minutes and there is no shortcut.
2. **Decide your call.** Before drafting anything. Approve, decline, approve-with-conditions. Write it on a post-it. This is the anchor. Everything that follows is supporting the call you have already made.
3. **List the risks in your own words.** Three to five bullets, brief.
4. **List the mitigants matched to each risk.** Same format.
5. **Use AI to draft the deal overview.** Feed redacted file content with the prompt above.
6. **Use AI to expand your risk bullets into prose.** Feed your bullets with the "do not soften, do not add, do not reorder" prompt above.
7. **Use AI to expand your mitigant bullets into prose.** Same constraints.
8. **Write the recommendation yourself.** Three to six sentences. The structure of the recommendation, generally: restate the call, name the one or two factors that tipped it, name the conditions or structure changes if any, name the trigger that would cause you to revisit.
9. **Verify every number in the AI-drafted sections against the source documents.** Every one.
10. **Run the fair-lending review from lesson 4 if any applicant-facing language is involved.**

Steps 5 through 7 are where AI saves you time. Steps 1, 2, 3, 4, 8, 9, and 10 are not changing. They are the job.

## Format and tone

Two notes on form.

Committee memos at Kapitus are read fast. Most committee members have eight to fifteen of them in a pre-read. Short sentences, specific numbers, no adjectives that do not earn their place. AI tends to inflate — to produce paragraphs where a sentence will do, and adjectives where none are needed. After it drafts a section for you, cut. A memo that is 30% shorter is almost always 30% better.

Tone is even. Not boosterish ("strong cash flow"), not punitive ("weak collateral coverage"). Boosterish language reads as advocacy, which is not your role. Punitive language reads as bias, which is forbidden. The committee wants the picture, not the pitch.

## Try this

Take a memo you wrote in the last quarter. Pull out just your recommendation paragraph.

Now run an exercise: paste your full deal overview and risk summary into the AI Coach, and ask it to "produce a credit recommendation." Read what it gives you.

Compare its recommendation to yours. The model's version will be smoother. It will probably reach a similar conclusion. Look for the gap — the factor in your recommendation that came from outside the visible file. That gap is the case for why you, not the model, write the section that ends with the call.
