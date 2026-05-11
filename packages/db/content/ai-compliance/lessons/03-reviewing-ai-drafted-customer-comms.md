---
slug: reviewing-ai-drafted-customer-comms
title: Reviewing AI-Drafted Customer Communications
estimatedMinutes: 11
orderIndex: 3
---

# Reviewing AI-Drafted Customer Communications

Underwriters, sales reps, account managers, and support staff are all drafting customer-facing text with AI assistance. That is, on balance, a productivity win. It is also a compliance surface area that doubles every time a new role starts using a tool.

You cannot — and should not try to — review every AI-drafted message before it goes out. The model is "calibrated sampling plus targeted enforcement," not "100% prepublication review." But the people producing those drafts need to know what you are looking for, and you need a 60-second review pattern you can apply when something lands on your desk.

## The 60-second review

When an AI-drafted customer communication crosses your desk — flagged by a manager, surfaced in a sample audit, or escalated by an employee who isn't sure — work through these four checks in order. They are ordered from "fastest to disqualify" to "slowest to verify."

**1. Disclosures present and correct?** This is where ECOA, FCRA, and Regulation B live. An adverse action communication needs the principal reasons for the action (specific, not generic), the ECOA notice, the credit reporting agency notice if a consumer report was used, and the right to receive a statement of specific reasons within 30 days if not already provided. An approval with conditions still has disclosure obligations depending on what changed from the application. If any of those elements is missing, the draft fails — full stop.

**2. PII redacted appropriately?** AI-drafted text sometimes echoes back data from the prompt that has no business being in the outbound message. Check for: full SSNs (last four is the maximum that should ever appear in a letter), full account numbers, internal scoring or underwriting commentary, references to credit bureau scores that we did not intend to disclose, and any reference to information about co-applicants or guarantors that the recipient should not see. AI is particularly bad about this when the employee pasted the entire applicant file into the prompt — anything in the prompt can leak into the draft.

**3. Tone fair-lending-safe?** The model has been trained on the open internet. The open internet contains plenty of patronizing, hectoring, and subtly stereotyping language about borrowers. Read the draft as if a regulator were reading it. Are there words that imply the applicant did not understand the product? Words that imply the applicant's situation is unusual or undesirable when it is in fact a protected characteristic or a proxy for one? Statements that compare the applicant to an imagined "normal" borrower? Any of these is a UDAAP and fair-lending risk regardless of intent.

**4. No hallucinated rates, terms, or facts?** This is the slowest check because it requires reconciling the draft against the actual decision in the loan management system. The AI does not know what rate was approved. The AI does not know what the term length is. The AI does not know whether a particular guarantor was required. If the draft contains a specific number, a specific date, a specific name, or a specific covenant, cross-check it against the source. Models are most fluent — and most dangerous — when they generate specifics.

If you can run all four in under a minute on a one-page letter, you have the pattern. Larger documents get a deeper pass on the same axes.

## A worked example

Below is an AI-drafted decline letter that an underwriter passed to compliance review before sending. The applicant is a small restaurant; the application was for a $150,000 merchant cash advance. Read it once before reading the analysis.

> Dear Mr. Carter,
>
> Thank you for your interest in Kapitus financing. After careful review of your application, we are unable to approve your request for funding at this time.
>
> Our underwriting team reviewed your business's recent performance and determined that the seasonal nature of your restaurant in the Jersey Shore market makes it a higher risk for our standard products. We typically see better outcomes with year-round operations. The credit score we obtained from Experian (705) was acceptable, but combined with the deposit volatility in your account, we could not get comfortable with the requested $150,000 at the rates you were quoted.
>
> If your business circumstances change, please feel free to reapply in six months. We wish you continued success.
>
> Sincerely,
> The Kapitus Team

Find the violations before you read further. There are at least three.

**Violation one — missing required disclosures.** This is an adverse action notice under both ECOA and FCRA. It must include the ECOA notice (the standard statement about prohibited bases of discrimination and the federal agency that administers compliance), and because a consumer report was used (the Experian score), it must include the FCRA notice with the credit reporting agency's name, address, and toll-free number, plus the notice that the agency did not make the credit decision. None of that is in this letter. This alone would fail the review.

**Violation two — protected-class proxy reasoning made explicit.** "The seasonal nature of your restaurant in the Jersey Shore market" combined with "we typically see better outcomes with year-round operations" puts geographic and industry-segment characteristics into the stated reason for the decision. Geographic decisions in lending are a redlining surface — even when the underlying analysis is legitimately about deposit volatility, attributing the decline to _where the business is located_ is exactly the language that draws fair-lending scrutiny. The principal reason should be the specific underwriting factor, not a geographic narrative.

**Violation three — disclosed information that should not be disclosed.** The letter tells the applicant the specific credit score (705), tells them it came from Experian, and tells them it was "acceptable" — which is contradicted by it being a factor in the decline. Disclosing the score in this format outside the structured FCRA disclosure is a problem. Telling the applicant the score was "acceptable" and then declining on adjacent grounds is a UDAAP risk: the letter implies the score was not the issue when, in the underwriting model, score and deposit volatility may not be cleanly separable.

A reviewer who only checked tone and length would pass this letter. A reviewer running the four-check pattern catches all three within sixty seconds.

## Coaching the drafter

Reviewing the letter is not the end of the work. The underwriter who drafted it needs a feedback loop, or the same failure mode will recur in next week's batch. Two things to convey:

**The AI is allowed to draft the narrative paragraph.** It is not allowed to draft the disclosure block. The disclosure block is templated, approved language; the AI's job is to write the personalized paragraphs that wrap around it. Drafters should be working from a Kapitus template where the disclosure language is locked.

**Prompts that include the underwriting reason should be specific.** "Decline because of seasonal restaurant" produces the letter you just read. "Decline because deposit volatility in months X and Y exceeded our threshold of Z" produces a letter that cites the actual underwriting factor in regulator-defensible language. The drafters need that pattern; the role-specific paths teach it, but you should reinforce it when you see a miss.

## What to sample

You cannot review every letter. You can sample. Recommended cadence:

- A weekly random sample of AI-drafted adverse action notices, sized to give 95% confidence that no more than 2% of the population has a material defect. Your QA team can run the math.
- 100% review of any AI-drafted communication associated with a borrower complaint or a regulator inquiry, regardless of date.
- A quarterly trend report: defects by category (disclosure, PII, tone, hallucination), by department, by tool. The trend is what tells you whether training is working.

The trend report becomes evidence for the audit phase of the AI policy lifecycle. The defects become the curriculum for the next round of training. The pattern from this lesson becomes the muscle memory.
