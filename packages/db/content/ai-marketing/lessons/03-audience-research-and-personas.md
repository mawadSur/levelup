---
slug: audience-research-and-personas
title: 'Audience Research and Personas with AI'
estimatedMinutes: 17
orderIndex: 3
---

## The Audience Work Problem

Personas have a reputation problem. Most marketing teams have a set of them — usually named after a fictional person, complete with a stock photo and a list of demographics — and most of those personas are wrong, ignored, or both. They were built from assumptions instead of signal. They were updated never.

AI makes this worse before it makes it better. A marketer who skips the research can now generate a confident-sounding persona in 30 seconds. It will have the right structure and plausible job titles. It will also be entirely fabricated. AI does not know your buyers. It knows the statistical average of all the text it has ever seen. That is not the same thing.

Used correctly — processing real signal you have already collected — AI is one of the best tools for audience synthesis. Used incorrectly, it produces personas marketing will fight about and sales will ignore.

## The Distinction That Matters: Process vs. Invent

The rule is direct: use AI to process your real signal, not to invent signal you do not have.

Real signal includes:

- Customer interview transcripts (sanitized to remove names and company identifiers)
- NPS verbatim comments
- Sales call notes and discovery call summaries
- Win/loss interview notes
- Support ticket language
- Reviews on G2, Capterra, or equivalent

If you do not have this material, the right answer is to go get it — not to ask AI to generate substitute data. Ten customer interviews run over two weeks will produce more accurate personas than any AI output. There is no shortcut for that foundational work.

## Anonymizing Before You Prompt

Before you paste any customer-sourced material into an AI tool, you must remove identifying information. This is not optional. Customer names, company names, email addresses, specific deal details, and any information that could identify a specific person are confidential. Pasting them into a public model is a data handling violation regardless of how useful the output would be.

Sanitization does not have to be elaborate. Replace names with role descriptors ("Head of Ops at a mid-market e-commerce company"), remove company names, and strip any specific numbers tied to identifiable accounts. The themes and language patterns — which are what you actually need — survive this process intact.

Sensitive data warning: NPS data, call transcripts, and win/loss interviews are confidential business information. Use only AI tools your company has approved for this category of data.

## The Signal Processing Prompt

Once you have sanitized source material, this prompt pattern extracts usable audience insight:

```
Here are {number} customer interview excerpts (all names and company identifiers have been removed).

Analyze them and provide:
1. Three distinct buyer types based on their jobs-to-be-done — not demographics
2. For each buyer type: the primary job they are trying to accomplish, the friction they describe most often, and the outcome they most explicitly desire
3. Verbatim phrases (5 or fewer per buyer type) that best capture how each type talks about the problem
4. Any significant patterns that do not fit neatly into the three types

Do not invent quotes. Only use language that appears in the excerpts.

[paste sanitized excerpts]
```

The instruction "do not invent quotes" is essential. AI will generate plausible-sounding customer language if you do not constrain it. You want extraction, not fabrication.

## Jobs-to-Be-Done vs. Demographics

The prompt asks for buyer types based on jobs-to-be-done for a specific reason. Demographic segmentation tells you who your buyers are. Jobs-to-be-done segmentation tells you why they buy. The second is more useful for messaging decisions.

Two buyers with identical demographics can have entirely different jobs-to-be-done. A VP of Marketing at a 200-person SaaS company might be hiring your product to prove marketing's impact to the CFO. Another with the same profile might be hiring it to escape a patchwork tool stack. These are different buyers for your messaging, even though they look identical in a CRM filter.

AI is good at clustering language patterns from interview data to surface these distinctions — often sharper than a human analyst working the same raw material.

## Validating the Output

After generating the cluster output, do three things before treating it as authoritative:

Read every verbatim quote the model attributes to a buyer type and verify it appears in your source material. If it does not, the model fabricated it.

Cross-check the buyer types against your own recall. Do these clusters match the dominant patterns you remember from reading the interviews? A major disconnect means the model over-indexed on word frequency at the expense of theme weight.

Share the buyer types with one sales rep. Their gut-check on whether these sound like real buyers is the fastest calibration available.

## Try This

Collect five to eight sanitized voice-of-customer notes from interview transcripts, NPS comments, or sales call notes. Remove all identifying information. Run the signal processing prompt above. Find the verbatim quotes attributed to each buyer type and confirm each one appears in your source material. Then share the buyer descriptions with one sales rep and ask: does this sound like the people you talk to? Their pushback is your revision list.
