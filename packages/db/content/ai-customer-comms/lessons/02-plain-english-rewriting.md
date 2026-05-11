---
slug: plain-english-rewriting
title: Plain-English Rewriting
estimatedMinutes: 9
orderIndex: 2
---

# Plain-English Rewriting

The single most common way Kapitus employees use AI is to take a paragraph that sounds like it was written by a lawyer or a back-office system and make it sound like it was written by a person. Done well, it saves the borrower a phone call and saves the support team a complaint. Done badly, it strips out a required disclosure or quietly changes a number. This lesson is about doing it well.

## What "plain English" actually means

Plain English isn't dumbing things down. It is a specific, measurable standard. Federal agencies, including the CFPB, target roughly a **ninth-grade reading level** for consumer disclosures. That's not an insult to your borrowers — it's a recognition that even readers with graduate degrees skim financial documents, often on a phone, often while stressed. The standard means:

- Short sentences. Aim for fifteen to twenty words on average. Break the long ones.
- Common words. "Pay" instead of "remit." "Late fee" instead of "delinquency assessment." "Decision" instead of "determination."
- Active voice. "We received your payment" beats "Your payment has been received."
- One idea per paragraph. If you need a topic sentence and three subordinate clauses, you need two paragraphs.
- Specifics over abstractions. "Call 1-800-555-0199 by May 30" beats "Contact us at your earliest convenience."

AI is genuinely good at this. The model has read enough plain-English writing to imitate the register reliably. What it is not good at is knowing which words in the original carry legal weight and must not be touched.

## A good rewrite

**Original (the kind of thing that comes out of a servicing system):**

> Pursuant to the terms of your financing agreement dated March 14, 2024, and in accordance with applicable provisions of the Truth in Lending Act, this notice serves to inform you that the regularly scheduled automated clearinghouse debit in the amount of $1,847.32 attempted on April 28, 2026 was returned by your depository institution for insufficient funds, and a returned-payment fee of $35.00 has been assessed to your account as permitted under Section 4.3 of your agreement. Failure to remediate this delinquency on or before the date specified herein may result in additional fees and adverse credit reporting.

**Rewrite (good):**

> Your April 28 payment of $1,847.32 didn't go through — your bank returned it for insufficient funds. As your loan agreement allows, we've added a $35 returned-payment fee to your account.
>
> To avoid additional fees and a late report to the credit bureaus, please pay the full $1,882.32 by May 15.
>
> You can pay online at kapitus.com/pay, by phone at 1-800-555-0199, or by mailing a check to the address at the bottom of this letter. If you'd like to talk about a different payment plan, call us at the same number — we'd rather work it out than charge another fee.

The rewrite keeps every number, every date, the fee authorization reference (now phrased as "as your loan agreement allows"), and the credit reporting warning. It loses nothing legally required, and it turns "remediate this delinquency" into "pay … by May 15."

## A bad rewrite

Here is what a careless AI prompt will produce:

> Your recent payment was returned. Please catch up on your account soon to avoid extra charges. Contact us if you have questions.

Three things are wrong. First, the amount and date are gone — the borrower no longer knows what payment, for how much, or what the new total is. Second, the credit reporting consequence is gone, which is exactly the disclosure the original was designed to make. Third, "soon" replaces a concrete deadline, which is both unhelpful and, in some regulatory regimes, non-compliant.

## The four traps to watch for

Every plain-English rewrite carries the same four risks. Check for each one before you send.

**1. Dropped disclosures.** Adverse action language, credit bureau identification, the right to dispute, the ECOA equal-credit-opportunity clause. AI summarizes these into oblivion. Keep approved disclosure paragraphs verbatim and tell the model not to touch them.

**2. Changed numbers.** Dollar amounts, dates, percentages, days. A model will round $1,847.32 to "about $1,850" because that reads more naturally. In a payment notice, that rounding is a fabrication.

**3. Shifted obligations.** "You must" becomes "we recommend." "Within 30 days" becomes "as soon as possible." Each of those shifts changes the legal posture of the letter.

**4. Oversimplified accuracy.** "Your application was declined because your business has been operating for less than the minimum time we require for this product" is a legally adequate ECOA reason. "Your business is too new" is friendly but vague enough that the borrower might misunderstand what to fix.

## A prompt that works

A reliable plain-English prompt looks like this, in your own words:

> Rewrite the paragraph below for a 9th-grade reading level, active voice, short sentences. Keep every dollar amount, date, deadline, and percentage exactly as written. Keep the paragraph in quotes verbatim — that is approved disclosure language and cannot be changed. Do not soften "must" or "will" to "may" or "should." Show me the rewrite next to the original so I can compare.

Notice what it does: it sets the standard, it lists the things the model is not allowed to touch, it asks for a side-by-side so you can diff easily. You will get a better first draft and a faster review.

## Try this

Take a real letter from your queue today. Run it through your preferred AI tool with the prompt above. Then do the four-trap check: dropped disclosures, changed numbers, shifted obligations, oversimplified accuracy. Mark each issue in the AI draft. The number of issues you find on a single letter will tell you, faster than any lecture, why this review step matters.
