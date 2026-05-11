---
slug: the-comms-capstone
title: The Comms Capstone
estimatedMinutes: 10
orderIndex: 5
---

# The Comms Capstone

This is the lesson where it all comes together. Real scenario, real time pressure, real workflow. By the end you will have a five-prompt pattern you can use the next time a borrower email lands in your inbox at 9:14 a.m. and needs a response by tomorrow.

## The scenario

It's a Wednesday morning. An email from a Kapitus borrower hits your queue:

> Subject: Disputed fee on May statement
>
> Hi,
>
> I just looked at my May statement and there's a $75 "documentation fee" I don't recognize and don't remember agreeing to. My loan agreement from when I signed up in 2023 doesn't mention this fee anywhere I can find. I want it removed and I want an explanation of why it was charged.
>
> I've been a customer for almost three years and pay on time every month. This feels like a nickel-and-dime move and I'm pretty unhappy about it.
>
> — Daniel Reyes, Reyes Auto Body

Your job: respond within 24 hours with something that actually addresses the issue, holds up to compliance review, and doesn't make the situation worse. Here is the workflow.

## Step 1: Gather facts before you draft

Do not open an AI tool yet. Open the borrower's file. You need to know:

- Is the $75 fee in the original agreement, in an amendment, or in neither?
- When and why was it charged? Is there a trigger event (a document request, a payoff quote, an amendment)?
- Has the borrower been notified of this fee before, in any prior statement or letter?
- Is the borrower's account current? Any prior complaints?
- Did anyone at Kapitus speak with him about this on the phone? Is there a call note?

Suppose you find: the fee is authorized under Section 6.2 of his agreement, it was triggered last month when his bookkeeper requested a payoff statement, the agreement clearly references the fee in the fee schedule exhibit, and there is no record of him being told over the phone that requesting a payoff would generate a charge.

Now you know the shape of the response. The fee is contractually valid, but he has a real grievance: nobody warned him. That's a tone question, not a legal one.

## Step 2: Draft the first response with AI

**Prompt 1** — the draft.

> Draft a first response to the customer complaint below. Facts I can use: the $75 fee is authorized under Section 6.2 of his loan agreement and is listed in the fee schedule exhibit. It was triggered when his bookkeeper requested a payoff statement on April 18. We do not have a record of telling him over the phone that this request would generate a fee. The customer's account is current and he has been a customer since 2023.
>
> Structure: (1) acknowledge his specific complaint, (2) explain where the fee comes from in plain English, (3) acknowledge that we did not give him advance notice that the payoff request would trigger a charge, (4) state what we are doing about it, (5) named contact and deadline.
>
> Plain English, no boilerplate apologies, do not characterize the fee as a violation of anything, do not quantify damages, do not promise anything I haven't told you we can do.

You read the output. Most of it will be usable. Some of it won't.

## Step 3: Run the compliance check

**Prompt 2** — compliance review.

> Review the draft above for these specific risks: (a) Does it drop any required disclosure for a Kapitus servicing response? (b) Does it admit a legal violation, characterize the fee as improper, or quantify damages? (c) Does it promise an outcome (refund, waiver, account change) that I have not specifically authorized? (d) Does it change any number or date from the facts I gave you? List each risk with the exact sentence.

This is where AI is genuinely useful. The model is good at reading its own output critically when you frame the question right. You'll get back a list of three or four lines to look at, sometimes including things like "the draft says 'we should not have charged this fee without notice' — that characterization could be read as an admission."

You fix those lines yourself. Don't let the model "fix" them — it will overcorrect into corporate boilerplate.

## Step 4: Run the tone check

**Prompt 3** — tone review.

> Read the revised draft out loud in your head. Identify any phrases that are generic apologies ("we apologize for the inconvenience," "your satisfaction is our top priority," "we value your business") and any phrases that sound defensive or legalistic ("pursuant to," "in accordance with," "as set forth in"). For each, suggest a replacement that is specific to this customer and this fee. Do not change the substance, only the phrasing.

You'll get back a cleaner letter. Adopt the rewrites that work and ignore the ones that drift into hollow territory. Trust your ear over the model's.

## Step 5: Add what only you know

**Prompt 4** — human additions.

This one isn't a prompt for the AI. It's a prompt for you. Add the things the model can't see:

- The named contact is real and reachable. Use the rep on the account, not "customer service."
- The deadline is a date the contact can actually meet, not a placeholder.
- If you have decided — with the appropriate manager — that you are going to refund the fee as a goodwill gesture, say so. If you haven't, do not let the letter promise a refund.
- If the customer's tone in his email signaled real distress, soften the close. If he was matter-of-fact, match him.

## Step 6: Hand off for review

**Prompt 5** — the final check, which is also not a prompt to AI.

Before this letter leaves your queue, it goes to your team's standard review path — compliance, manager, or peer, depending on the complaint type and your team's policy. Attach the original complaint, your fact-gathering notes, and the draft. If it's a sensitive matter (the kinds named in the previous lesson — fair lending, fraud, regulator-routed), the review is mandatory, not optional. For a straightforward fee dispute like this one, the review can be quick. Either way, you do not skip it because AI helped you draft.

## The pattern, distilled

1. **Facts first, AI second.** Open the file before you open the model.
2. **Draft with constraints.** Tell the model what it can and cannot say, and supply only the facts you have verified.
3. **Compliance pass.** Ask the model to audit its own output against specific risks. Fix the issues yourself.
4. **Tone pass.** Strip boilerplate, strip legalese. Keep the specifics.
5. **Human pass.** Add what only you know, and route for review.

A response that used to take you forty-five minutes will take fifteen. The fifteen are spent on judgment, which is the part that earns your salary anyway.

## Try this

The next complaint that lands in your queue, run this exact workflow. Time each step. Notice which steps the AI made faster, which it had no effect on, and which it made slower because you had to correct it. That measurement, repeated three or four times, will give you a much better sense than any training course of where AI actually earns its keep in your specific role.
