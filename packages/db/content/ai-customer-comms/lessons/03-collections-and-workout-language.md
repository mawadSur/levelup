---
slug: collections-and-workout-language
title: Collections and Workout Language
estimatedMinutes: 10
orderIndex: 3
---

# Collections and Workout Language

Of every surface where AI can help at Kapitus, collections and workout comms carry the most risk. The borrower is already stressed. The regulator is already paying close attention. The contract is the only thing that defines what you can and cannot threaten. And the model — trained on a vast diet of debt-collection writing scraped from the open internet — has absorbed a lot of language that is illegal in the contexts where Kapitus operates.

You can absolutely use AI here. You just have to keep tight hold of the steering wheel.

## What collections comms actually are

When most people hear "collections," they picture the call from a third-party agency. The Kapitus version is broader. Any of the following counts as a collections or workout comm:

- A reminder that a payment is past due.
- A formal demand for the full balance.
- An offer to defer one or more payments.
- A proposal to modify the loan — extended term, reduced rate, capitalized arrears.
- A forbearance agreement.
- A notice that the account is being transferred to a collections team or agency.
- A response to a borrower who is asking for help because they can't pay.

Each of these has different legal constraints. A forbearance offer must accurately describe what happens to interest, principal, and the term. A modification notice triggers TILA disclosures if material terms change. A transfer notice is RESPA-governed if real estate is involved. AI will produce confident drafts for all of them, and the model does not know which type you are writing.

**Step one is always to identify the comm type yourself and tell the model.** "This is a forbearance offer, not a collection demand." That single instruction prevents most of the worst outputs.

## The three lines you cannot cross

There are three traps in collections comms that AI walks into almost every time. Memorize them. They will save you from the worst Monday morning of your career.

**1. Never expose another borrower's terms.** It sounds obvious until you see how it happens. You ask AI to "draft a forbearance offer like the one we sent to Acme Logistics last quarter," and you paste in the Acme letter as an example. Now Acme's specific terms are in your prompt. The AI may reuse them — dollar amounts, payment changes, account references — in the new letter. You have now potentially leaked one customer's loan terms into another customer's correspondence. The fix: never use real prior letters as examples in a public AI tool. Build a sanitized template library with placeholder values, and reference that.

**2. Never imply a consequence that is not in the contract.** The model has read a million debt-collection letters. Many of them threaten things — "this may affect your ability to obtain credit in the future," "we may pursue all available legal remedies," "this could result in seizure of business assets." Some of those threats are accurate for some products. None of them are accurate for all of Kapitus' products. The Fair Debt Collection Practices Act, state-level analogs, and UDAAP doctrine all prohibit threatening action the lender cannot or will not actually take. If the contract does not authorize confessions of judgment in this borrower's state, the letter cannot reference them. If acceleration requires a specific notice period, the letter cannot imply that today's missed payment means immediate full balance due. **Read the contract before you trust the draft.**

**3. Never use AI-generated "urgency" framing without review.** Ask AI for "a more urgent version" of a payment reminder and you'll get language designed to pressure — "final notice," "immediate action required," "your account will be referred." If the account is not actually a final notice, if action is not actually required today, if no referral is in fact teed up — those phrases are deceptive. UDAAP enforcement is built on exactly this kind of language. Urgency is a fact about the timeline, not a tone choice.

## Templates that work

The pattern for a workable AI-drafted workout comm has four parts, in this order.

**Acknowledge the situation specifically.**
"We received your call on May 3 letting us know your business has had a slow month."

**State the offer in concrete terms.**
"We're offering to defer your next two payments of $1,847.32 each (due May 15 and June 15). Those amounts will be added to the end of your loan, extending your term by two months."

**Disclose what doesn't change and what does.**
"Your interest rate stays at 12.5%. Total interest paid over the life of the loan will increase by approximately $312 because of the extended term. Your contractual obligations otherwise remain in force."

**Make the next step obvious and human.**
"If you'd like to accept this offer, reply to this email or call Maria at 1-800-555-0199 by May 12. If this won't work for you, call anyway — we can talk through other options."

That structure is something an AI can fill in reliably, given accurate inputs. What you supply is the borrower's situation, the actual offer terms, and the constraints. What the model supplies is the prose. You review for accuracy, missing disclosures, and the three lines above.

## A prompt that works

> Draft a forbearance offer for a Kapitus borrower based on the bullet points below. The borrower has not been threatened or accelerated. Do not imply any consequence beyond what I list. Use a respectful, plain-English tone. Keep every dollar amount, date, and percentage exactly as I provide them. The letter must include: a specific acknowledgment of the borrower's situation, the offer terms, what doesn't change, and a named contact with phone and deadline.

You will still review the output. But you have shaped it so the easy mistakes are no longer easy to make.

## Try this

Find one collections or workout letter your team has sent in the last quarter. Read it with the three lines in mind: other borrowers' terms (could anything in this letter have leaked from another file?), consequences (is every consequence mentioned actually in the contract?), and urgency (is every "must" and "immediately" supported by a real deadline?). If you can't say yes to all three, you've just found work for your team's template library.
