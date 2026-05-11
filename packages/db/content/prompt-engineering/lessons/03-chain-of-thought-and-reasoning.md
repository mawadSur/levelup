---
slug: chain-of-thought-and-reasoning
title: Chain-of-Thought and Reasoning
estimatedMinutes: 13
orderIndex: 3
---

# Chain-of-Thought and Reasoning

There is a single phrase that, added to certain kinds of prompts, will measurably improve the quality of the response: **"Think step by step."** Or some variant of it — "Walk through your reasoning," "List the considerations first, then make a recommendation," "Before you answer, work through the factors that matter."

It looks like a parlor trick. It isn't. It's one of the most-studied effects in language models, and once you understand the mechanism, you can use it intentionally instead of by accident.

## Why it works

Language models generate one token at a time, and each token they emit becomes part of the input that shapes the next token. When you force the model to produce reasoning _first_, those reasoning tokens are sitting in the context when it goes to produce its final answer. The model now has more material to base its answer on — material it just generated, but material that constrains the conclusion.

A model asked "Should we approve this loan?" with no scaffolding will produce an answer optimized to _sound like_ a plausible answer. A model asked to "first list the underwriting considerations, then evaluate each one, then make a recommendation" will produce an answer that has to be _consistent with_ the considerations it just enumerated. The second answer is structurally less likely to skip something important, because skipping something important would create an obvious mismatch within the same response.

This isn't the model "thinking harder." There is no thinking. What there is, is more tokens of relevant intermediate state, and the final answer is shaped by what came before it in the same response.

## A Kapitus underwriting example

You're reviewing a merchant cash advance application. Twelve months of bank statements, decent revenue, some volatility in the last quarter, two existing positions with other lenders. You want a second opinion from the AI.

### Without chain-of-thought

Prompt:

> Based on the attached summary (12 months of revenue averaging $42K/month, dropping to $31K in the last quarter, two existing MCA positions totaling $28K in daily debits, requesting $50K from us), should we approve?

The model will likely produce a one-paragraph answer with a recommendation. It may be the right recommendation. It may also gloss over the stacking issue, or the revenue drop, or the daily-debit load relative to deposits. You won't know which of those it weighed.

### With chain-of-thought

Prompt:

> Based on the attached summary (12 months of revenue averaging $42K/month, dropping to $31K in the last quarter, two existing MCA positions totaling $28K in daily debits, requesting $50K from us), evaluate this application.
>
> Before recommending, walk through:
>
> 1. Revenue trend and what the drop in the last quarter suggests.
> 2. Total daily-debit load as a percentage of recent deposits, and whether adding our position pushes it past a comfortable threshold.
> 3. Stacking risk and what our position would be if other positions accelerate.
> 4. Any signals (positive or negative) that don't fit the above categories.
>
> Then give a recommendation: APPROVE, DECLINE, or ESCALATE, with one sentence on why.

The output is now several paragraphs long, structured, and — critically — the recommendation has to be consistent with the analysis above it. If the model wrote "daily debits are already 30% of deposits and adding our position would push it to 45%," it can't then casually recommend APPROVE without flagging that. The structure forces the conclusion to be defensible by its own reasoning.

This is also the response you would actually want for your file. You're not just getting a recommendation — you're getting a documented thought process you can review, push back on, or attach to your write-up.

## The structured CoT pattern

The version above is what's called _structured chain-of-thought_: instead of just saying "think step by step," you specify the steps. This is almost always better than the open-ended phrase, because it forces the model to consider the categories _you_ care about rather than the ones that happen to come to mind.

The pattern:

> Before answering, work through the following considerations:
>
> 1. [the thing you'd check first]
> 2. [the thing you'd check second]
> 3. [the thing that's easy to miss]
> 4. [any signals not covered above]
>
> Then provide [final output format].

You're using your domain expertise to set the agenda for the model's reasoning. The model is doing the legwork on each item; you're guaranteeing nothing important gets skipped.

## When chain-of-thought helps

CoT helps the most on tasks where the answer depends on multiple factors that interact:

- Multi-step math or financial calculations.
- Underwriting judgments that balance several risk dimensions.
- Drafting a recommendation that has to weigh trade-offs.
- Analyzing a document where the answer requires synthesizing several pieces of information.
- Anything where you'd want a human to "show their work."

## When it doesn't help (and may hurt)

CoT is the wrong tool for tasks that don't require reasoning:

- Simple lookups: "What's the formula for debt service coverage ratio?" — adding "think step by step" just produces a meandering paragraph before the formula.
- Single-step transformations: "Rewrite this paragraph in a warmer tone." — there's nothing to reason about; just do it.
- Creative tasks where you want the model to commit to a choice, not deliberate. "Give me five subject-line options for this email" doesn't benefit from a preamble explaining why each one is good.

Worse, CoT on the wrong task burns tokens (you pay for them in API contexts, and you wait for them in chat contexts) and dilutes the actual answer with filler reasoning.

A reasonable rule: if a competent human could answer this in one sentence without thinking, don't ask the model to reason. If a competent human would need a paragraph of reasoning to be sure of the answer, structured CoT is your friend.

## A note on "reasoning models"

You may have heard of newer "reasoning" models that do chain-of-thought internally by default (you don't see the intermediate steps; they reason silently before producing a final answer). For those models, you don't need to manually prompt for step-by-step thinking — they're doing it under the hood. But the _structured_ version (telling the model which considerations to weigh) is still useful even on reasoning models, because you're still setting the agenda.

For the standard models most Kapitus tools use, explicit CoT prompting is still the right move.

## What to take away

"Think step by step" is not a magic phrase. It's a way of buying the model more working memory to base its answer on. Use it when the task actually requires reasoning, specify the steps when you can, and skip it for simple transformations. The structured-CoT pattern — _enumerate the considerations, then conclude_ — is the single most useful template for any task that involves a judgment call.
