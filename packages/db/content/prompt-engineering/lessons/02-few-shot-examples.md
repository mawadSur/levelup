---
slug: few-shot-examples
title: Few-Shot Examples
estimatedMinutes: 13
orderIndex: 2
---

# Few-Shot Examples

If you were going to learn exactly one prompt-engineering technique and ignore everything else, this would be the one. Few-shot prompting — giving the model a handful of input/output pairs before your actual request — is the single highest-impact thing you can do to improve response quality. It outperforms longer instructions, more careful phrasing, and most prompt-rewriting tricks.

The underlying idea is simple: the model is a pattern-matcher. If you describe the pattern, it does an okay job. If you _show_ the pattern, it does a great job. Show, don't tell.

## A Kapitus example: drafting decline letters

Imagine you're a loan officer who has to send several "we are unable to extend an offer at this time" letters per week. The bar is high: the tone has to be respectful, the reason has to be clear without inviting an argument, and the door has to be left open for the future. Your manager has a specific voice they want.

Let's walk this through at each level of shot count.

### Zero-shot (no examples)

> I'm a loan officer at Kapitus. Draft a decline letter to a borrower whose business is under 6 months old and whose monthly revenue is too low for our minimum loan size.

The model will produce a competent, generic decline letter. It will probably:

- Open with "We appreciate your interest in Kapitus..."
- Cite "underwriting criteria" in vague terms.
- Close with "We wish you success in your future endeavors."

It is fine. It is also not in your voice, not aligned with your manager's standards, and not differentiated from every other lender's decline letter on the internet — which is exactly what the model is averaging over to produce it.

### One-shot

Now give it one real (or anonymized) example:

> Here is an example of a decline letter I sent recently and was happy with:
>
> **Example input:** Borrower with 4-month-old business, $8K/month revenue, requested $50K.
>
> **Example output:** "Hi Sam — thanks for sending over the application for Sam's Auto Detail. I went through it carefully, and unfortunately we're not going to be able to extend an offer at this stage. Two things specifically: we typically look for businesses with at least 6 months of operating history, and our smallest standard product starts at $25K against monthly revenues that are a bit higher than what you're showing today. Both of those are things that time will solve. If you want to revisit in 4–6 months once the business is a little more established, I'd be glad to take another look — just reach back out directly to me."
>
> Now draft a decline for: borrower with 5-month-old business, $11K/month revenue, requested $40K.

The output you'll get this time is unmistakably closer to your voice: shorter opening, specific reasons stated plainly, a concrete path forward, and the personal "reach back out directly" close.

### Three-shot

The real lift happens between one example and three. With three, you start communicating the _range_ of your voice — when you use the borrower's first name vs. their business name, how you handle different decline reasons, when you offer a path forward vs. when you don't.

Provide three example input/output pairs covering meaningfully different scenarios:

1. A short-history decline (the one above).
2. A revenue-too-volatile decline with no path forward.
3. A fraud-signals decline that's polite but offers no opening.

Three good examples will get you to the point where you can ship most decline letters with light editing.

### Ten-shot (and the diminishing returns)

Ten well-chosen examples is more or less the ceiling for this technique. Beyond that you're not teaching the model anything new — you're just spending tokens. The model has already learned the pattern; additional examples only matter if they cover a genuinely new case (a new decline category, a new tone you sometimes use).

The progression in practice: zero-shot is functional, one-shot is good, three-shot is professional, ten-shot is overkill for most tasks.

## Why this works

The model treats your examples as part of the pattern it's continuing. When you provide examples, you're not "training" the model in any permanent sense — once the conversation ends, the examples are gone. But within that conversation, the model heavily weights the patterns you've just shown over its general training data.

This is why few-shot beats explicit instructions for tone, voice, and format. Telling the model "be warm but professional" is vague. Showing it three messages that _are_ warm but professional is unambiguous.

## When few-shot fails

The technique has one consistent failure mode: **contradictory examples**.

If your three examples disagree with each other in tone, length, or structure, you've made the model's job harder than it was before. The model will average across the contradictions and produce something that matches none of them.

Common ways this goes wrong:

- You grab three examples from your sent folder without re-reading them, and one of them is actually the version you sent before your manager corrected your voice.
- Two examples have signatures and one doesn't. The model will randomly include or omit a signature.
- One example is 60 words and another is 200. The model will produce something around 130 words for everything.

The fix: before pasting examples into a prompt, read them as a group and ask whether they all demonstrate the _same_ pattern. If they don't, edit them until they do, or drop the outlier.

## How to actually use this

1. **Keep a personal "good examples" file.** When you write or receive an email/document/summary that you'd want the AI to produce next time, save it. After a few weeks you'll have a small library of high-quality reference outputs categorized by task.
2. **Anonymize before pasting.** Strip the borrower's name, business name, dollar amounts you don't want in the AI's context, and any sensitive identifiers. Replace them with generic placeholders.
3. **Three is the sweet spot for most tasks.** Use one when speed matters more than precision, three when quality matters, more only when you're hitting a specific edge case.
4. **Refresh the examples when your voice evolves.** A six-month-old example file will pull your output back toward how you used to write, not how you write now.

## What to take away

If a prompt isn't producing what you want, your first move shouldn't be to add more instructions. It should be to add an example. The example will do more in 50 tokens than two paragraphs of instructions will do in 500.
