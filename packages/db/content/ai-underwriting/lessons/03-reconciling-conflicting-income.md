---
slug: reconciling-conflicting-income
title: Reconciling Conflicting Income
estimatedMinutes: 11
orderIndex: 3
---

# Reconciling Conflicting Income

Income reconciliation is the work that separates a competent underwriter from a fast one. The fast underwriter picks the highest plausible number; the competent one figures out why three documents disagree. AI can make you faster without making you the wrong kind of fast — but only if you ask it the right question.

## The setup

A real shape of problem you will see every week:

- **W2 for last full year:** $120,000.
- **Tax returns (last two years):** average reported income around $85,000, after depreciation, vehicle expense deductions, and a home-office line item.
- **Recent paystubs (last 30 days):** YTD figures annualize to roughly $145,000.

Three documents. Three numbers. None of them are obviously fraudulent. Each one is telling you something real about a different version of "income."

The W2 captures wages from one employer for a calendar year. The tax return captures taxable income after deductions the applicant chose to take. The paystub captures a recent run-rate that may reflect a raise, a temporary overtime spike, a commission cycle, or a seasonal high. Picking one and treating it as "the answer" is how you end up overstating capacity (paystub) or declining a creditworthy applicant (return).

## The wrong way to use AI here

You can guess what the bad prompt looks like:

> The applicant has a W2 of $120,000, returns showing $85,000, and paystubs annualizing to $145,000. What income figure should I use?

The model will give you an answer. The answer will sound reasonable. It will probably suggest something like "use a conservative blended figure of $110,000" or "use the two-year average of $85,000 to be safe" or "annualize the paystub if the trend is consistent." Each of those is a credit decision dressed up as analysis.

The model has no idea whether the paystub spike is a sustainable raise or a one-time bonus. It has not seen the rest of the file. It has not seen your portfolio's experience with this borrower profile. It is producing a number that pattern-matches what an internet article about income reconciliation would suggest.

If you use that number, two things have happened. You have abdicated the call to a system that cannot make it. And — worse — you have created an artifact that, if it ever ends up in a fair-lending audit or a quality control review, shows you took an AI recommendation on a quantitative credit input. That is not a position you want to be in.

## The right way

The right pattern is to ask the model to **lay out the signals** and to **explicitly not recommend**. You are using it as a structuring tool, not as an oracle.

A clean prompt:

> Below are three income signals for one applicant: a W2, two years of tax returns, and recent paystubs. Lay out each signal in a table with: source document, period covered, gross figure, adjustments visible in the document, and any timing factors a reader should know about. Do not propose a single qualifying figure. Do not recommend which signal to use. End with a bullet list of questions an underwriter would need to answer before reconciling these.
>
> [redacted figures pasted here, with employer names and any identifying detail removed]

Now you are asking for shape. The output you should get back is something like:

| Source     | Period                   | Gross    | Adjustments visible                        | Timing factors                                               |
| ---------- | ------------------------ | -------- | ------------------------------------------ | ------------------------------------------------------------ |
| W2         | Full prior calendar year | $120,000 | None on the form                           | Reflects wages only, one employer                            |
| Tax return | Two-year average         | $85,000  | Depreciation, vehicle expense, home-office | Schedule C indicates self-employment income separate from W2 |
| Paystub    | YTD, annualized          | $145,000 | Includes overtime line, no bonus visible   | YTD covers less than a full quarter; trend not established   |

Followed by a list of underwriter questions:

> - Is the Schedule C income from the same source as the W2, or a second activity?
> - Are the deductions on the return discretionary (depreciation choices) or genuine cash expenses?
> - Does the paystub overtime line reflect a recent change in role, or a temporary spike?
> - Are there pay stubs from earlier in the year to validate the run rate?
> - What does the bank statement deposit history show against each of these figures?

That output is genuinely useful. It compresses 20 minutes of squinting at three PDFs into a one-page picture. It also leaves the actual reconciliation — the part that requires judgment, file context, and the rest of the package — where it belongs: with you.

## The pattern, generalized

This is the move you will repeat across many parts of the underwriting workflow.

**AI maps the signals. You decide the number.**

The model is allowed to:

- List, tabulate, and reformat the data.
- Note adjustments and timing factors that are visible on the documents.
- Flag inconsistencies, gaps, or questions a human would need to resolve.

The model is not allowed to:

- Propose a qualifying figure.
- Characterize the income as "strong," "marginal," or "stretched."
- Recommend which signal to weight more heavily.
- Suggest a debt-service-coverage threshold.

If the model drifts toward any of those — and it will, because it is trained on text where someone usually offers an opinion — pull it back. Add to your prompt: "Do not characterize or recommend. Only describe what the documents say."

## A word on bank statements

Bank statements are the fourth income signal, and the most important one you usually have. The pattern still holds: ask AI to summarize deposit activity (total deposits per month, recurring versus non-recurring, identifiable sources), not to opine on whether the deposit picture supports the application.

Be especially careful about feeding bank statements through AI. They are dense with sensitive data — account numbers, full names, sometimes addresses on check images, transaction counterparties. Redact aggressively. The Kapitus Foundations rules around sensitive data apply here with full force: account numbers never leave your machine in cleartext.

## Where reconciliation goes wrong

The two most common failure modes in income reconciliation, with or without AI:

**Anchoring on the first number you saw.** If you opened the W2 first, $120k feels like the baseline. If you opened the return first, $85k feels like the truth. AI does not solve this — it can amplify it, because the model will write a smoother summary if you give it a single anchor. Cure: always read all the signals before writing or asking for a synthesis.

**Treating the highest number as "stretch but supportable."** This is where underwriting losses come from. The paystub at $145k feels achievable. If you write a memo at $145k and pay the deal, and the spike was a one-quarter overtime push that does not repeat, the debt service does not work. AI will not save you from this; in fact, if you ask "is $145k supportable given the rest of the file," the model will usually produce a paragraph that says yes. It is generating what supportive paragraphs sound like.

## Try this

Pick a file with at least two conflicting income signals — ideally a W2, returns, and recent paystubs, but any two will do.

Redact identifying information. Feed it to the AI Coach using the prompt pattern above. Read the table the model produces. Then write — in your own words, not the model's — a one-paragraph reconciliation explaining which signal you would weight and why, including which questions in the model's bullet list you would need answered first.

Save both. Compare them in three months when you have run the same exercise on ten files. The model's tables will get more useful as you tune the prompt. Your reconciliation paragraph is the part that does not change — because that is the part that is yours.
