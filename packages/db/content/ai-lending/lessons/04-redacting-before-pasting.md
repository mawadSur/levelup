---
slug: redacting-before-pasting
title: Redacting Before Pasting
estimatedMinutes: 9
orderIndex: 4
---

# Redacting Before Pasting

If you only develop one new habit from this entire learning path, make it this one: **redact before pasting**.

The single highest-impact thing a loan officer can do to use AI safely is to never paste raw applicant data into a general-purpose chatbot. Not once. Not "just to test something." Not "just for context." The moment regulated data leaves Kapitus's systems and lands in a third-party tool, you have created an exposure event that compliance has to track and possibly disclose.

The good news: redaction is fast once you have the pattern. This lesson is the pattern.

## What counts as "data you should never paste"

The list is longer than people assume. Treat all of the following as untouchable:

- **Identifiers**: Full legal name, SSN, EIN/Tax ID, driver's license number, passport number, DOB
- **Account data**: Bank account numbers (even partial — last 4 are still identifying), routing numbers, credit card numbers, MCA account numbers
- **Contact data**: Home address, personal phone, personal email (business email is a softer line; still avoid when not needed)
- **Health or family data**: Anything an applicant volunteered about their health, family situation, or protected-class status
- **Specific financial facts tied to a named entity**: "Smith's Auto Repair grossed $312,403 in 2024" — the combination of business name and exact number is identifying
- **Full document scans**: Paystubs, bank statements, tax returns, credit reports, government IDs, voided checks — even partially-redacted ones

If you're not sure whether something belongs on this list, assume it does.

## The placeholder pattern

The trick is that AI does not need any of that data to be useful. It needs the _shape_ of the data. Replace every identifying detail with a generic label.

A worked example. Here is a paystub line:

> _"Maria Gonzalez, Employee #4471, gross pay $4,832.10 for pay period 4/16-4/30/2025, YTD gross $42,118.40, employer: Westside Logistics Inc."_

Here is the same paystub line, redacted for AI:

> _"Applicant A's most recent paystub shows gross pay of $X for a two-week period, YTD gross of approximately 9x that amount, single employer for the full period."_

The AI can now help you summarize "this applicant's income appears stable and consistent with a $X annual run-rate" — which is what the underwriter needs — without ever knowing Maria's name, employee number, employer, or exact dollar figures.

The mental shift is small but important: you are not "hiding data from the AI." You are **only sending it the parts of the data that matter for the task.** Names, numbers, and addresses don't help AI draft better text. They just create exposure.

## Document-type playbook

A quick guide for the four documents that come across your desk most.

### Paystubs

What underwriting actually needs: gross pay, frequency, YTD totals, employer stability (single vs multiple employers in the YTD period).

What to share with AI: _"Applicant A's paystubs show gross pay of $X per two-week period, YTD $Y, single employer across the year."_

What never to share: name, SSN, employee ID, employer name, full pay stub image.

### Bank statements

What underwriting actually needs: average daily balance, lowest balance, count of NSF events, deposit patterns, large outflows.

What to share with AI: _"Applicant A's last 3 months of business bank statements show an average daily balance of $X, lowest balance of $Y on [day of month] in [month], Z NSF events across the period, and consistent weekly deposit inflows of around $W."_

What never to share: account number, account holder name, transaction-by-transaction detail, the PDF itself.

### Credit reports

What underwriting actually needs: the relevant tradeline summary, the specific reason codes underwriting flagged, derogatory marks if any.

What to share with AI: almost nothing. Credit report data is the most regulated data on this list. If you need to draft language about a credit factor, ask for help on the _phrasing_ of the underwriter-provided reason code, not the credit data itself.

What never to share: the bureau report itself, the raw FICO number, account-level detail, the applicant's identifiers.

### Government IDs

What underwriting actually needs: confirmation of identity verification — which is a yes/no your system handles, not something AI is involved in.

What to share with AI: nothing. There is no AI use case for a driver's license image. If you find yourself about to paste one, stop and ask why.

What never to share: the image, the ID number, the address, the DOB, any field on it.

## A redaction-first prompt template

When you need AI to help with anything that touches an applicant, start the prompt with the structure, not the data:

> _"I'm working with an applicant's [document type]. Here are the underwriting-relevant facts, anonymized: Applicant A — [fact 1: $X], [fact 2: $Y], [fact 3: condition]. Help me [task]."_

The placeholder "Applicant A" is a habit worth forming. If you ever need to reference two applicants in the same conversation, they become "Applicant A" and "Applicant B." The model will follow your convention.

## The five-second check

Before pressing enter on any prompt that contains applicant data, scan the prompt for:

1. Any string of digits longer than 4 characters
2. Any first name + last name combination
3. Any business name
4. Any street address or city
5. Any reference to a Kapitus internal ID (loan number, applicant number, file number)

If you see any of those, edit them out. It takes five seconds. It is the difference between a normal Tuesday and a conversation with your manager and compliance.

## Try this

Open the last three applicant files you worked on. For each one, write a one-sentence "Applicant A" summary that captures everything underwriting cared about — with zero names, dollars to the nearest thousand, and no identifiers.

If you can write that summary in under thirty seconds, you have internalized the placeholder pattern and the rest of this path will be straightforward. If it takes longer, that's a signal you're still thinking of applicants as "Maria with the auto-repair shop" instead of "Applicant A with these three facts" — and the next time you ask AI for help with Maria, that's how you'll prompt it.
