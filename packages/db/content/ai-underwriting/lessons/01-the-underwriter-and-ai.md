---
slug: the-underwriter-and-ai
title: The Underwriter and AI
estimatedMinutes: 10
orderIndex: 1
---

# The Underwriter and AI

You have already learned what a language model is and how Kapitus expects you to handle data inside one. This path is about the part of your job AI is actually good at — and the larger part it is not. Underwriting is one of the highest-leverage places in this company to use AI well, and one of the most dangerous places to use it badly. Both of those facts trace back to a single distinction.

## Synthesize versus decide

Read this carefully because it is the load-bearing idea for the next five lessons.

**AI is excellent at synthesizing complexity. AI is unreliable at making credit decisions.**

Synthesizing means: restating, summarizing, reorganizing, reformatting, cross-referencing, drafting. Taking a 40-page file and producing a one-page picture of what the applicant looks like. Taking three conflicting income documents and laying out the signals side by side. Taking your own narrative judgment and turning it into a polished memo paragraph.

Deciding means: reaching a conclusion about whether this applicant is a good credit. Recommending an approval, a decline, a structure change, a price. Calling the deal.

The first set of tasks is where AI returns hours of your day. The second set is where AI causes regulatory, reputational, and portfolio damage. The difference between an underwriter who uses AI well and one who creates a problem is whether they keep these two activities cleanly separated in every prompt they write.

## Why "should I approve?" is the wrong question

A language model does not have your loss data, your portfolio context, your committee's appetite, the seasoning of the broker, the tone of the call you had with the principal last Tuesday, or the regulator your shop reports to. It has patterns from the open internet. When you ask it "should I approve this deal," it produces text that pattern-matches what credit recommendations sound like. That output will read fluently. It will sound confident. It may even cite a framework that looks reasonable.

It is not a credit recommendation. It is a generated artifact that resembles one. The model has no ground truth about whether this applicant will pay. It has no view on whether your fund prices for this risk. It does not know that the industry code on the application is wrong because you have funded this borrower's cousin three times.

When you let AI's framing become your framing, two things happen. First, you drift toward whatever the model's training distribution thinks a typical answer looks like — which on credit topics skews toward approving the visible income and missing the structural risk. Second, you stop being the underwriter. Your name is on the memo. The model's name is not.

So the question you never ask is **"should I approve this?"** The question you always ask is some variant of **"summarize what this applicant looks like."** Then you make the call.

## What good underwriter prompts share

Across every prompt pattern you will learn in this path, the well-formed ones share four properties.

**They ask for restatement, not judgment.** "Lay out the capital structure," "summarize the income signals," "list the inconsistencies between these documents." Never "is this strong," "is the income solid," "should we go forward."

**They contain only what the model needs.** You never paste a tax return wholesale. You redact identifying fields — SSN, EIN, full legal names, addresses — and feed the numerical and structural content. The Kapitus Foundations path covered the redaction pattern; assume it from here forward.

**They constrain the form of the answer.** A good prompt says "give me a one-paragraph summary suitable for a credit memo, no recommendation" or "list each income figure with its source document on its own line." You are using the model for shape. Shape is what it is good at.

**They expect verification.** Whatever the model produces, you check the numbers against the source documents before any of it touches a committee deck. Every figure. Every entity name. Every date. The model can — and on long files, will — silently invent a debt service number that looks plausible. Your verification habit is the difference between a tool and a liability.

## Verification expectations at Kapitus

Specifically, when you use AI on an underwriting file, the expectations are:

- Every dollar figure that appears in a deliverable is traced back to a source document by you, not the model. You do not paraphrase the model's number; you read the source.
- Every entity, guarantor, or principal mentioned in AI output is checked against the application package by you.
- Every conclusion the model draws — explicit or implied — is removed or rewritten in your own words. The model's job ended at synthesis.
- The fact that AI was used to draft any section is noted in your work file. This is not a confession; it is a record. The model logs your interactions in the AI Coach anyway.
- Anything you would not be comfortable defending verbatim to a regulator does not go in the memo.

If any of those feel heavy: that is correct. They are. The reason AI buys you so much time on underwriting work is that the synthesis steps are slow and the verification steps are fast. The trade only works if you actually do the verification.

## Try this

Pull a closed file you underwrote in the last 30 days — one you remember well, where the call ended up being right.

Open a fresh AI Coach session and paste only the redacted financial summary. Ask: "Lay out the capital structure and the top three risks visible in this picture, in bullet form, no recommendation."

Read what comes back. Two questions: which parts of the synthesis are accurate restatements of what you already knew? And — more importantly — what did the model miss that you, sitting in your seat with your portfolio context, caught at the time? That gap is your job. Everything below the gap is what AI is for. Everything above it is why you still have one.
