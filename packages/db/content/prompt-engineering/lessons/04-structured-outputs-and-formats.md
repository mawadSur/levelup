---
slug: structured-outputs-and-formats
title: Structured Outputs and Formats
estimatedMinutes: 13
orderIndex: 4
---

# Structured Outputs and Formats

There is a striking property of language models that doesn't get talked about enough: **the tighter the output format you demand, the better the output tends to be.** Asking for a paragraph gives you a paragraph that may wander. Asking for a JSON object with three named fields gives you something the model has to fit into a shape — and fitting into a shape leaves less room for hallucination, padding, and hedge language.

For a Specialist-tier user, structured output prompting is the technique that turns AI from a writing assistant into a data tool. Anything you currently extract from documents by hand, anything you currently reshape from one format to another, anything you summarize into a fixed template — these are all jobs that work dramatically better when the prompt specifies the output shape with precision.

## Why structure suppresses hallucination

When a model generates free-form prose, it's filling space. If it doesn't know an answer, it can produce a sentence that sounds confident, contains a plausible-looking detail, and reads naturally — because flowing text rewards confidence.

When a model has to produce a JSON object with the field `confidence: 1-5` next to every claim, the dynamic changes. It now has to put a number next to its own assertion. It's still a generated number, but the structure forces a self-evaluation pass that doesn't happen in prose.

Even more powerfully: if you require a field like `"source_in_doc": string` next to every extracted value, the model now has to produce a verbatim quote from the source it's drawing from. Models can still get this wrong, but they get it wrong much less often, because the format demands evidence alongside the claim.

The principle: structure forces the model to commit. Commitments are auditable. Prose is not.

## A Kapitus example: extracting fields from an applicant document

Imagine you have a one-page applicant profile — a free-form summary written by a referral partner. You need to pull six fields out of it into your system.

### The bad way

> Read this profile and tell me the applicant's name, business type, monthly revenue, time in business, requested loan amount, and any red flags.

You'll get back a paragraph or a loose bulleted list, half of which contains hedge words like "approximately" or "appears to be." Some fields will be missing if they're not in the source document. Others will be confidently filled in based on what the model thinks should be there. You'll spend more time verifying than if you'd just read the document yourself.

### The good way

> Read this profile and extract the following fields. Respond in exactly this JSON format:
>
> ```
> {
>   "applicant_name": string,
>   "business_type": string,
>   "monthly_revenue_usd": number | null,
>   "time_in_business_months": number | null,
>   "requested_loan_amount_usd": number | null,
>   "red_flags": string[],
>   "source_quotes": {
>     "monthly_revenue": string | null,
>     "time_in_business": string | null,
>     "requested_loan_amount": string | null
>   },
>   "confidence": {
>     "monthly_revenue": 1 | 2 | 3 | 4 | 5,
>     "time_in_business": 1 | 2 | 3 | 4 | 5,
>     "requested_loan_amount": 1 | 2 | 3 | 4 | 5
>   }
> }
> ```
>
> Rules:
>
> - If a field is not stated in the document, use `null` and confidence 1.
> - `source_quotes` must be verbatim from the document. If you cannot produce a verbatim quote, set the value to null.
> - `red_flags` is an empty array if there are none. Do not invent red flags.
> - Do not return any text outside the JSON object.

Now the model has a job with edges. It cannot produce a monthly_revenue without either grounding it in a quote (and showing the quote) or marking confidence as 1 and the source as null. The output is parseable, comparable across applicants, and dramatically less likely to contain a fabricated number presented confidently.

## The formats that work

The model can reliably produce, in roughly this order of robustness:

1. **JSON** — Most structured, easiest to parse, easiest to validate. Always specify the schema and explicitly forbid extra text outside the JSON.
2. **Markdown tables** — Good for human-readable structured output. Tell the model exactly which columns and how many rows.
3. **YAML** — Cleaner-looking than JSON for nested data; tolerated by most LLMs. Slightly more error-prone than JSON.
4. **CSV** — Useful for tabular data going into a spreadsheet. Specify the header row and the delimiter explicitly.
5. **Fixed-template prose** — "Respond in exactly two paragraphs. Paragraph 1: [X]. Paragraph 2: [Y]."
6. **Strictly-formatted bullets** — "Respond as three bullets, each one sentence, no preamble, no closing line."

For each of these, the single most important add-on is: **forbid extra text.** Models love to wrap structured output in conversational scaffolding ("Sure! Here's the JSON you requested: ..."), which breaks any downstream parsing. Always include a line like "Do not include any text outside the JSON object."

## Schema-driven prompting

The professional version of structured output is what's sometimes called schema-driven prompting: define the schema first, then ask the model to populate it. The schema is the contract.

Pattern:

> You will extract data from the document below into the following schema:
>
> ```typescript
> type Output = {
>   fact: string; // a single factual claim from the document
>   source_in_doc: string; // verbatim quote supporting the fact
>   confidence: 1 | 2 | 3 | 4 | 5;
> };
> ```
>
> Return an array of `Output` objects. One object per distinct fact. Do not include any text outside the array.
>
> [document here]

This pattern works whether you're extracting facts, classifying items, scoring submissions, summarizing meetings, or producing decision recommendations. The same schema-then-populate structure applies.

## Where this matters for Kapitus workflows

Specific places this technique pays off:

- **Document review:** Extracting fields from referral profiles, bank statement summaries, applicant write-ups.
- **Underwriting memos:** Asking the model to populate a fixed memo template (Summary, Strengths, Risks, Recommendation) rather than write free-form.
- **Pipeline tracking:** Summarizing a long email thread into a small JSON object you can paste into your CRM notes.
- **Report generation:** Turning narrative source material into a structured table you can drop into a deck.
- **Internal tooling:** Any time you might wire AI into an actual application, you must have structured output. Free-form prose is unparseable.

## A few tips that catch people out

- **Be explicit about nulls.** If you don't tell the model what to do when a field is missing, it will invent something. "Use null if the field is not stated in the document" is one of the highest-value sentences you can add to a prompt.
- **Specify types, not just field names.** `"monthly_revenue_usd": number` is much more reliable than `"monthly_revenue": "the revenue"`. The type signal in the schema tells the model what shape of value goes there.
- **Don't let the model invent fields.** Tell it to use _only_ the fields in the schema and ignore information that doesn't fit. Otherwise it will helpfully add extras.
- **Validate before you trust.** Even with all the above, run the output through a parser before treating it as data. If you're using this in a workflow, build in a re-prompt step for invalid responses.

## What to take away

If you're using AI to produce prose, structure is optional. If you're using AI to produce data — to extract, classify, score, or compare — structure isn't optional; it's the entire technique. The model is much better at filling a shape than at writing one. Give it the shape.
