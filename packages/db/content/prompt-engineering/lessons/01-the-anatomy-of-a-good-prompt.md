---
slug: the-anatomy-of-a-good-prompt
title: The Anatomy of a Good Prompt
estimatedMinutes: 12
orderIndex: 1
---

# The Anatomy of a Good Prompt

If you have already finished the Apprentice and Practitioner tiers, you know the basic shape of working with an AI assistant: type a request, read the response, iterate. That is enough to get real work done. It is not enough to get _consistent_ work done — the kind where the first draft is usable 80% of the time instead of 30%.

The difference between an amateur prompt and a professional one is not vocabulary or politeness. It is structure. A good prompt has five components, and the absence of any one of them is the most common reason a response misses the mark.

## Why "please" doesn't matter and clarity does

Before the five components, set aside one popular myth: that being polite to the AI changes the output in any meaningful way. It doesn't. The model has no feelings, no memory of how you treated it last time, no preference for warmer language. "Please" and "thank you" are pure tokens — they take up space in the context window and produce no measurable lift in response quality.

What _does_ change the output is unambiguous specification. The model is trying to predict the most plausible continuation of your prompt. If your prompt is vague, the most plausible continuation is also vague. If your prompt locks down the audience, the format, the tone, and the constraints, the response is forced into a much narrower band — and that narrower band is almost always what you actually wanted.

## The five components

### 1. Context — who you are and what situation you're in

The model knows nothing about you when the conversation starts. Tell it the role, the audience, and the surrounding situation.

Weak:

> Write an email about the loan terms.

Strong:

> I'm a senior loan officer at Kapitus. I'm writing to a small-business owner who applied for a $75K working-capital loan and was approved at terms slightly different from what she requested. She's price-sensitive, has used a competitor before, and I want to keep her from walking away.

Same task, completely different output. The second version constrains the model to write _for that recipient_ rather than for a generic borrower.

### 2. Task — what you actually want

State the task plainly and only the task. Avoid stacking three asks into one sentence; if you need three things, list them.

Weak:

> Help me with this customer issue.

Strong:

> Draft a 150-word reply that (a) confirms her approved terms, (b) acknowledges the gap from her original request, and (c) gives her one concrete reason to move forward with us this week.

### 3. Constraints — length, tone, what to avoid

Constraints are the most under-used component. Models default to verbose, hedged, slightly formal output. If you don't push back, that's what you get.

Useful constraints to specify:

- **Length:** "under 150 words," "exactly three bullets," "two paragraphs."
- **Tone:** "warm but professional," "no marketing language," "match the tone of the customer's last email."
- **What to avoid:** "do not mention competitor pricing," "do not promise approval timelines," "no exclamation points."
- **Audience constraints:** "writing to a non-technical reader," "assume the recipient has not seen our previous emails."

The avoid-list matters more than you'd think. Telling the model what _not_ to do is often faster than re-prompting after it does the wrong thing.

### 4. Examples — what good looks like

The fastest way to get the output you want is to show the model an output you already approve of. We'll cover this in depth in the next lesson, but the headline rule is: when you can paste one good example into the prompt, your hit rate roughly doubles.

Even a quick reference helps:

> Match the voice of this prior email I sent: "Hi Maria — quick update on your file. We've approved your application at $75K over 18 months. Slight tweak from the $90K you asked for — happy to walk through why on a call this week. Best, J."

### 5. Output format — how to structure the response

Tell the model exactly how you want the response shaped. This is the single highest-leverage thing you can specify because it controls what happens _after_ the response lands.

Examples:

- "Reply in two paragraphs, no greeting, no signature — I'll add those."
- "Return a markdown table with columns: Field, Applicant Value, Source, Confidence (1–5)."
- "Respond as a JSON object with keys `summary`, `risks` (array of strings), and `recommendation` (one of: APPROVE, DECLINE, ESCALATE)."
- "Three bullets, no preamble, no closing."

When you specify the shape, the model can't ramble. We'll go deep on structured outputs in lesson 4.

## Putting it together: a Kapitus example

Here is a weak prompt:

> Write a follow-up to a borrower who hasn't responded to my last email.

Here is the same prompt with all five components:

> **Context:** I'm a loan officer at Kapitus. I sent a borrower (Marcus, runs a small construction company) approved terms eight days ago and haven't heard back. He responded quickly to my first two emails, then went quiet.
>
> **Task:** Draft a follow-up that gets him back to the table without pressuring him.
>
> **Constraints:** Under 100 words, warm tone, no language that implies he's been ignoring me, no urgency tactics, no exclamation points.
>
> **Example of voice:** "Hey Marcus — circling back on the offer we talked through last week. Wanted to check if you'd had a chance to review with your partner, or if there's anything I can clarify. Happy to hop on a quick call if it's easier."
>
> **Output format:** Just the email body. No subject line, no signature.

The second prompt is longer, and that is the point. It is also vastly more likely to produce a response you can send without editing.

## What to take away

The amateur instinct is to make the prompt shorter so the model has more "freedom." The professional instinct is the opposite: pin down the five components so the model has less freedom and produces something you can actually use.

Every prompt that fails to land usually fails because one of these five was missing. When you re-prompt, don't add adjectives — figure out which component you skipped, and add that instead.
