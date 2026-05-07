---
slug: positioning-and-messaging
title: 'Positioning and Messaging with AI'
estimatedMinutes: 18
orderIndex: 1
---

## Positioning Is Not a Headline

Positioning is a strategic choice about where you want to live in a buyer's mind. The headline is just one expression of it. This distinction matters when you use AI, because AI is excellent at generating headlines and nearly useless at making the underlying strategic call. That call requires you.

What AI can do is help you stress-test a positioning hypothesis faster, surface alternatives you have not considered, and force you to articulate the choice you are making rather than letting it stay vague. Vague positioning is the single most common reason good products fail in the market. AI cannot fix it, but used well, it can expose it.

## The Frame That Makes Positioning Concrete

April Dunford's positioning framework — from her book _Obviously Awesome_ — is the most actionable one available for practitioners. It asks four questions:

- **Who is this for?** Specifically enough that someone not in that group would immediately recognize they are excluded.
- **What does our buyer do instead today?** This is the competitive alternative, which is rarely just the obvious competitor. Often it is a spreadsheet, a manual process, or doing nothing.
- **Why are we meaningfully better for our target buyer?** Not better in every way — better in the specific ways this buyer values most.
- **In what context do we perform best?** The situations or use cases where our differentiation shows up most clearly.

This frame is useful because it forces you to name the alternative. Most positioning statements fail because they are written as if the buyer has no other option. The buyer always has another option. Naming it forces clarity.

## The Positioning Prompt Pattern

Once you have a working description of your product and its target, use AI to generate competing positioning hypotheses:

```
Given this product description: {desc}

Propose 3 alternative positioning statements. For each:
- Name the competing alternative this buyer is currently using or considering
- State what makes us the obvious upgrade for buyers who are frustrated with that alternative
- Use 25 words or fewer per statement
- Write in plain English, no marketing clichés
```

Run this prompt and treat the output as raw material, not finished work. You are looking for one of two things: an alternative that is sharper than what you have, or confirmation that your current positioning is already the strongest framing. Either outcome is valuable.

### What to Watch For

AI will often suggest positioning that is technically correct but commercially inert. Phrases like "the most comprehensive platform" or "the solution built for modern teams" are positioning in shape but not in substance. They name no alternative and make no specific claim. Delete them.

The positioning statements worth keeping are the ones that would make a specific buyer say, "Yes, that is exactly what I hate about what I am using now."

## Messaging Architecture: From Positioning to Words

Once you have locked positioning, you need a messaging architecture — a set of core claims that express that positioning across channels. AI can draft this scaffold quickly if you give it sharp inputs:

```
Our positioning: {one-sentence positioning statement}
Our primary buyer: {specific role/company type/situation}
Their biggest frustration with the alternative: {specific pain}

Draft a messaging architecture with:
- One hero statement (homepage H1): ≤10 words
- Three supporting proof points: ≤15 words each
- One sentence for the "for buyers who..." qualifier
```

The output gives you a working draft to pressure-test with real buyers. It is not the final version — it is the version you take into three customer conversations to see what resonates.

## What AI Cannot Do Here

AI cannot tell you whether your positioning is true. It can tell you whether it sounds plausible. Those are not the same thing.

If your product does not actually perform better in the scenarios your positioning claims, all the AI-generated copy in the world will accelerate your churn rate. Positioning integrity requires that the claim survives customer experience. That verification is yours to own.

Also: do not paste competitive intelligence, NDA-protected customer research, or internal strategy documents into a public AI model. Use only information you would be comfortable publishing.

## Try This

Pull your current homepage hero — the H1 headline and the supporting subhead. Run the positioning prompt above using your product description. Generate three alternative positioning statements. Ask yourself: does any of them name a more specific alternative or a sharper differentiation than your current positioning? If yes, rewrite the hero using that frame, in your own voice. If not, you have validated that your current positioning is already doing the right job.

Share the new draft with one customer and one person who has never heard of your product. Note which parts they pause on. Those pauses are your revision list.
