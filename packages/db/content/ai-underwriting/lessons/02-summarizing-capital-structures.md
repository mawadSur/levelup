---
slug: summarizing-capital-structures
title: Summarizing Capital Structures
estimatedMinutes: 12
orderIndex: 2
---

# Summarizing Capital Structures

A clean capital structure summary is one of the most valuable things you can put in a committee deck and one of the most time-consuming things to assemble by hand. This lesson walks through how to use AI to compress that work without compressing the rigor.

## The example

You are looking at a deal for a $750k working-capital advance. The applicant is a regional HVAC operator. The file shows three entities:

- **Comfort Services Holdings LLC** — holding company. Holds the real estate. No operations.
- **Comfort Services Operating Inc.** — the operating company. This is the borrower of record on the request.
- **Comfort Services Fleet LLC** — a separate entity that owns the trucks, leases them back to OpCo on a monthly fee.

The principal, the same individual, owns 100% of all three.

There is intercompany debt. OpCo owes HoldCo roughly $410k on a note that has been "rolling" for the last four years (interest accrues, principal does not amortize). FleetCo invoices OpCo $38k/month in lease payments, which is essentially the debt service on the fleet's underlying secured loan from a community bank.

The principal has a personal guarantee on the existing community bank loan and on a prior Kapitus advance that paid off in March. There was a refinance six months ago: the community bank consolidated two truck loans into one note at a slightly lower blended rate but a longer amortization, which improved the monthly fleet payment by about $4k.

That is the structure. Try to hold it in your head. Most underwriters can, on a good day. Most readers of your memo cannot. That is the synthesis problem.

## Feeding it to AI safely

You never paste the actual file. The Kapitus Foundations path covered redaction; the short version for this kind of summary task:

- Replace entity legal names with role labels: HoldCo, OpCo, FleetCo. The model does not need "Comfort Services."
- Replace the principal's name with "Principal" or "Guarantor."
- Strip EINs, SSNs, account numbers, physical addresses.
- Keep all dollar figures, dates, ownership percentages, rates, and amortization schedules — these are the content of the synthesis.
- Keep the industry (HVAC) only if it is load-bearing for the summary. For pure structure, it usually is not.

A reasonable prompt looks like:

> Below is a redacted capital structure for a small-business credit applicant. Three entities, common ownership, intercompany debt, a recent refinance. Produce a structured summary suitable for a credit committee memo. Format as: (1) entity map with one-line role per entity, (2) related-party flows in plain language, (3) external debt obligations with rate and amortization, (4) recent material changes in the last 12 months. Do not recommend, do not assess risk, do not characterize the deal. Restate only.
>
> [redacted structure pasted here]

Notice what the prompt does. It asks for shape. It constrains the sections. It explicitly forbids the two things the model will otherwise drift into: recommending and characterizing.

## What a good output looks like

The model will return something close to:

> **Entity map.** HoldCo holds real estate, no operations. OpCo runs the business and is the borrower on the request. FleetCo holds rolling stock and leases to OpCo.
>
> **Related-party flows.** OpCo pays FleetCo $38k/month under a fleet lease. OpCo owes HoldCo approximately $410k on an intercompany note; interest accrues, no principal amortization in the last four years.
>
> **External debt.** Community bank note to FleetCo, secured by trucks, consolidated six months ago from two prior notes into a single facility at a blended rate; longer amortization, monthly payment lower by approximately $4k. Prior Kapitus advance, paid in full in March.
>
> **Recent changes.** Truck loan refinance six months ago is the only material capital event. No new external debt since.

That is a strong synthesis. It compresses a five-minute verbal explanation into a sub-paragraph each committee member can read in 30 seconds. The numbers came from you. The shape came from the model.

## What is likely wrong

Read AI capital-structure output the way you read a junior analyst's first pass: assuming there is at least one error in it.

The error categories, in order of how often they show up:

**Inverted flows.** The model will sometimes describe OpCo as owing money to a party it is owed by, or invert the direction of a lease payment. The relationships are dense; the model occasionally gets the direction wrong because both directions are linguistically plausible. Always verify direction.

**Made-up specifics.** If your input said "approximately $410k," the model may produce "$413,500" in its summary. The precision did not come from a source — it came from the model's sense of what a typical intercompany balance looks like. Strip invented precision and re-anchor to what the source documents actually say.

**Smoothed-over weirdness.** The "rolling note that has not amortized in four years" is a real risk indicator. The model may quietly recast it as "an intercompany note in good standing." That is a fluency artifact: the model is writing toward what credit memos usually sound like, not toward the structural anomaly you flagged. When you read the output, look specifically for places where the language got smoother than the underlying facts deserved.

**Missed cross-references.** If the principal's personal guarantee on the prior Kapitus advance was released in March, the model may not connect that to current guarantor capacity for a new advance. Cross-references between facts are one of the things models miss most often, and one of the things underwriters add most.

**Industry boilerplate creeping in.** If you left "HVAC" in the prompt, you may get a sentence about "the seasonal nature of HVAC cash flow" that you did not ask for and is not in your file. The model is filling in genre conventions. Delete.

## What the underwriter still owns

The summary is not the analysis. After the model gives you the four-section restatement, you still write:

- Whether the intercompany note matters for debt service capacity.
- Whether the FleetCo arrangement is a structural strength (assets isolated from operating liability) or a structural concern (related-party payments that could be modified to dress up OpCo financials).
- Whether the refinance freed up real cash flow or just deferred it.
- Whether the personal guarantee picture supports the size of this request.

Each of those is judgment. None of those is something you let the model write.

## Try this

Pick a closed file with at least two entities and intercompany activity. Redact it using the Foundations pattern. Feed it through the prompt above.

Compare the model's four-section output against your original memo. Count the errors — inverted flows, invented precision, smoothed-over risks, missed cross-references, genre boilerplate. The count is informative. If it is zero, your file was unusually clean or you stopped reading too soon. If it is more than five, you may have given the model too much in one pass; try splitting the structure and the debt into two prompts.

The point of the exercise is to build a feel for where this tool reliably helps and where it reliably needs you. That feel is what makes the next four lessons usable in production.
