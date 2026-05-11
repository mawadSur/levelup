---
slug: applicant-follow-up-emails
title: Applicant Follow-Up Emails
estimatedMinutes: 10
orderIndex: 2
---

# Applicant Follow-Up Emails

This is the task you do twenty times a day, so it's the one most worth getting right. An applicant submitted a partial file, you need one more document, and you want to send a short, professional email that gets you the document without making the applicant feel hassled.

It is also the task where loan officers most commonly leak data. The pattern is: open ChatGPT, paste the applicant's full email thread to "give it context," and ask it to draft a follow-up. That email thread contained an SSN, an EIN, a screenshot of a driver's license, and a bank account number. Now all of it is sitting in a third-party system logged against your name.

This lesson is how to do the same task without that.

## The bad version

Here is what not to do. The loan officer opens a chatbot and types:

> _"Draft a follow-up email to John Smith, SSN 123-45-6789, owner of Smith's Auto Repair (EIN 12-3456789, account 4521-..., DOB 4/12/1978). He applied for $75k working capital, submitted only 2 of 4 bank statements (December and November missing), and his last email said he was 'getting them from the bookkeeper.' Tone: friendly but firm."_

Read that prompt. Count the things that should never have left Kapitus's systems: full legal name plus SSN plus DOB (identity theft starter pack), EIN, partial bank account number, the loan amount, the specific months of missing documents tied to a named individual. The chatbot now has, and may log indefinitely, a complete picture of one applicant's identity and financial position. None of it was necessary to draft the email.

## The good version

Here is the same task, done well.

> _"Draft a friendly but firm follow-up email to a small-business applicant who has submitted 2 of 4 required bank statements. Two months are missing. The applicant previously said they were getting them from their bookkeeper. It has been 5 business days. I need the missing documents to keep the file moving. Sign as 'Your Kapitus advisor.' Keep it under 100 words."_

No name. No SSN. No EIN. No loan amount. No account number. The model has everything it needs to produce a clean draft, and you have lost zero quality. You then paste the resulting draft into your email client, replace "Your Kapitus advisor" with your real signature, address it to the real applicant, and send.

The applicant gets the same email either way. The difference is that one version exposed five categories of regulated data to a third party and the other did not.

## The placeholder pattern

This is the single habit worth burning into muscle memory. When you describe an applicant to AI, replace every identifying detail with a generic placeholder:

- John Smith → "the applicant"
- Smith's Auto Repair → "a small-business applicant" or "an auto-services merchant"
- $75,000 working capital, 12-month term → "a working-capital product"
- SSN, EIN, DOB, account numbers → omit entirely; AI does not need them to draft an email
- November and December bank statements → "two months of bank statements"
- The applicant's specific quote → paraphrase: "the applicant mentioned a delay with their bookkeeper"

If after redaction the prompt still doesn't have enough context to be useful, that's a signal you're asking AI to do something it shouldn't — usually because the task has slipped from drafting into decision-making.

## Templates worth keeping

You will draft the same three emails over and over. Keep the prompts, not just the outputs.

**Missing-document nudge (first follow-up, day 3):**

> _"Write a short, warm follow-up email to an applicant who is missing [N] documents. Acknowledge they're busy. Be specific about what's needed. Close with an offer to help if anything is unclear. Under 80 words."_

**Missing-document nudge (second follow-up, day 7+):**

> _"Write a slightly firmer follow-up to an applicant we've already reminded once about missing documents. Stay professional and non-judgmental. Mention that the file will be paused if we don't receive the documents in the next [N] business days. Under 100 words."_

**Status check after underwriting:**

> _"Write an email letting an applicant know their file is now with underwriting and we'll have a decision within [N] business days. Reassure them no further action is needed from them right now. Under 60 words."_

Notice these prompts contain zero applicant-specific data. They produce reusable templates you fill in by hand after the model returns the draft.

## Tone calibration

A first-time applicant who missed a document because they didn't realize they needed it is not the same person as a repeat-borrower who is dodging your calls. AI is genuinely useful for matching tone — but only if you tell it which situation you're in.

- _"warm, apologetic-sounding, assume the applicant is overwhelmed"_ — for first-timers
- _"friendly but direct, the applicant has missed two prior emails"_ — for slow responders
- _"professional and brief, the applicant is a returning customer with multiple Kapitus products"_ — for repeat business
- _"warm but final — this is the last follow-up before we close the file"_ — for the goodbye email

The pattern: you describe the _situation type_, not the _individual_. The model produces a draft tuned to the situation. You apply it to the individual.

## Try this

Open your sent folder and pick the last three follow-up emails you wrote from scratch. For each one, write down the prompt you _would have_ used — using the placeholder pattern — to have AI draft it for you.

If any of those prompts contain a name, an SSN, an exact dollar amount, or a bank account fragment, rewrite them until they don't. The exercise of writing safe prompts before you ever paste them is what makes redaction automatic instead of something you remember to do half the time.
