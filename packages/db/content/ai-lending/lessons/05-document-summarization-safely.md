---
slug: document-summarization-safely
title: Document Summarization Safely
estimatedMinutes: 10
orderIndex: 5
---

# Document Summarization Safely

An applicant emails you 40 pages of bank statements. Or a P&L. Or a stack of leases. Or all three. Underwriting needs a clean summary of the underwriter-relevant facts, and they need it today.

This is one of the genuinely transformative use cases for AI — the moment where a tool that would have taken you an hour can take ten minutes. It is also one of the easiest places to slip from "summarizing safely" into "exposing the entire file." This lesson is how to capture the speedup without the exposure.

## The two questions to ask before you summarize anything

Before you do anything else with a long document, ask:

1. **Do I understand what underwriting needs from this document?** Not "what's in the document" — what facts about the document feed the decision. For a bank statement, that's average daily balance, NSF events, and deposit patterns. For a paystub, it's gross pay, frequency, and employer stability. For a lease, it's term length and monthly obligation. If you don't know the answer, **summarization is not your task yet** — your task is to talk to your underwriting partner first.
2. **Can I extract those facts myself by reading the document?** Almost always yes, with practice. If yes, then AI's job is to help you _write_ the summary, not to _read_ the document.

This sequence matters. If you skip question 1 and ask AI "summarize this 40-page bank statement for an underwriter," you'll get a summary that sounds confident, hits the wrong details, and reads convincingly enough that you'll forward it without noticing what it missed.

## The summary-vs-decision distinction

This is the line that matters most.

A **summary** is a restatement of facts present in the document, with no judgment about what those facts mean for the application. _"The applicant's last 3 months of statements show an average daily balance of $42k and 2 NSF events in the period."_

A **decision** is a judgment about whether those facts qualify the applicant. _"The applicant has sufficient balance and acceptable NSF activity for the requested loan size."_

AI can help you write a summary. AI cannot make a decision. The difference is whether the sentence ends in _"...is what the document shows"_ or _"...therefore the applicant qualifies."_

If you ever notice an AI-generated summary slipping across that line — using words like "sufficient," "acceptable," "weak," "concerning" — strip them. Replace them with facts. Underwriting reads the facts and applies the judgment.

## The right workflow

Here's the safe pipeline for a long document.

**Step 1: Read it yourself.** Yes, the whole thing. This is non-negotiable for now. Not because AI couldn't extract the facts — it can — but because (a) you need to spot identifiers AI shouldn't see, (b) you'll catch document-level oddities AI won't (handwriting, alterations, missing pages, transactions that pattern-match to something concerning), and (c) you'll know whether the summary AI produces is actually accurate.

**Step 2: Extract the underwriter-relevant facts.** Five to ten bullet points. Numbers rounded. No names, no account numbers, no addresses.

For a 3-month bank statement set, that might look like:

- Average daily balance: ~$42k
- Lowest balance in period: ~$11k, mid-month in February
- NSF events: 2 (both in February)
- Average monthly deposits: ~$85k, weekly cadence
- Largest single outflow: ~$32k, vendor payment in March
- No transfers to personal accounts

**Step 3: Hand those facts to AI.** "I have an applicant's 3-month business bank statement summary with these facts: [paste anonymized bullets]. Draft a 4-sentence summary I can paste into the underwriting note. Stick to facts, no judgment."

**Step 4: Read what AI produced.** Confirm it matches the bullets exactly. Confirm it added no judgment words. Confirm it invented no numbers. Then it goes into Kapitus's system, not back to the chatbot for "another pass."

The full pipeline takes ten to fifteen minutes for a document that would have taken you an hour to summarize from scratch. The reading and extraction are still yours. The AI-as-writer step is the speedup.

## When to bail and ask underwriting directly

There are documents AI should not be near, even with redaction. Develop the instinct to recognize them.

- **The applicant sent a credit report or 4506-T tax transcript.** These are the most sensitive documents in lending. Don't summarize them with AI. Forward the underwriter-relevant question to underwriting and let them work with the raw document inside Kapitus's systems.
- **Something looks altered or forged.** Inconsistent fonts, mismatched dates, suspicious math. AI is the wrong tool for this — fraud review is a human (and Kapitus-internal) workflow. Flag it to underwriting and stop.
- **The document is in a foreign language and you don't read it.** AI translation looks fluent and can drop or invent numbers without you noticing. Get a human translator (or underwriting) involved instead of trusting machine translation on a regulated document.
- **The document concerns a protected class.** Disability accommodation letters, child support records, religious-exemption documents. The mere existence of these in a chatbot log is a regulatory exposure separate from any data inside them. Handle in-system only.
- **You can't articulate what underwriting needs from it.** This is the most important one. If you cannot finish the sentence "underwriting cares about this document because..." then summarization is the wrong next step. Ask underwriting first.

The rule of thumb: if you're tempted to use AI on a document and you feel a small voice saying _"I should probably ask first,"_ that voice is right. The marginal speedup is never worth the wrong call here.

## The prompt template

A reliable shape for summarization prompts:

> _"I have an applicant's [document type, generic]. Here are the underwriting-relevant facts in bullet form: [anonymized bullets]. Draft a [N]-sentence summary for the underwriting note. Stick to facts only. Do not infer whether the applicant qualifies. Do not add details I didn't include."_

The "do not add details I didn't include" line is doing more work than it looks like. Without it, AI will helpfully invent context — "this is consistent with a healthy small business" — that you did not ask for and that drifts into judgment.

## Try this

Pick a document type you summarize often (bank statements are the most common). Write down the five to seven facts underwriting actually wants from that document type. Tape it to your monitor.

The next time one of those documents lands, you have a pre-built extraction template. You skim the document, fill in the template, and hand the filled template — not the document — to AI. You will save real time and you will not expose a single identifier in the process.
