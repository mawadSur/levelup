---
slug: the-underwriter-capstone
title: The Underwriter Capstone
estimatedMinutes: 14
orderIndex: 6
---

# The Underwriter Capstone

This is the lesson that ties it together. We will walk through a realistic scenario end to end, showing exactly how the patterns from the previous five lessons compose into a single workflow. You will see what to prompt, in what order, and where you have to stop and do the underwriting yourself.

## The scenario

It is 12:30 PM. Committee meets at 2:00. You have been handed one more deal to add to the pre-read.

The file: a $400k working capital request from a specialty food distributor in the mid-Atlantic. The applicant has two entities. The owner is a 60% / 40% partnership between two individuals, one of whom recently bought out a third partner — that buyout is funded by a seller note that is six months in. The financial picture has the usual mid-market mess: a W2 for one of the principals from a side employer, K-1s from the operating entity, two years of tax returns showing modest profitability with significant depreciation, and 90 days of bank statements showing deposits that materially exceed the K-1 income.

You have 90 minutes. AI is not going to make you faster than you can think. It is going to make every minute you spend produce more output.

## Step 0: Read the file (15 minutes)

There is no shortcut here. You open the file and read it. All of it. You are looking for the gestalt — the feel for what kind of business this is, what kind of principals these are, what the deal is really about underneath the request. You are also looking for the things that are not in the application: gaps, missing documents, statements that contradict each other on first read, anything that pings the part of your brain that says "go look at that more carefully."

You do not prompt anything yet. Reading first is not negotiable.

By the end of this step, you should have a tentative call in your head. Not a finished one — a working hypothesis. Tentatively: approve at a reduced amount with stronger guarantees, decline, refer to senior, whatever it is. Write it on a post-it. This anchors everything that follows.

## Step 1: Redact and prep (10 minutes)

Pull out the documents you will feed to AI in subsequent steps. For each one:

- Strip names, replace with role labels (Principal A, Principal B, Former Partner, OpCo, RealEstateCo).
- Strip EINs, SSNs, account numbers, addresses, phone numbers.
- Strip the legal name of the business — replace with a generic industry descriptor only if relevant.
- Keep all numbers, dates, percentages, and structural facts.

You are doing this once, upfront, for the whole deal. It is faster to redact everything you might use than to redo it three times across separate prompts. Save the redacted version in a scratch document on your machine. Do not save it to a shared drive — even redacted, the source content is sensitive.

## Step 2: Capital structure summary (8 minutes)

First AI pass. The prompt:

> Redacted capital structure follows. Two-entity applicant with a recent partnership buyout funded by a seller note. Produce a structured summary in four sections: (1) entity map with one-line role per entity, (2) ownership and partnership history, (3) related-party and intra-deal financial flows, (4) recent material capital events in the last 12 months. Restate only. Do not assess, do not recommend, do not characterize.
>
> [redacted structure]

Read what comes back. Apply the lesson-2 checks: inverted flows, invented precision, smoothed-over weirdness, missed cross-references, genre boilerplate. Fix the errors. What you have now is a usable draft of your committee memo's deal-overview section plus the structural facts you will need for the risk section.

The seller note from the buyout is going to be one of your key risk threads. Mark it.

## Step 3: Income reconciliation (10 minutes)

Second AI pass. You have W2 income from one principal, K-1s from the operating entity, tax-return-reported income, and bank statement deposits. They do not agree.

Prompt:

> Below are four income signals for Principal A and the operating entity: a W2 (side employer), two years of K-1s, tax returns including depreciation and other adjustments, and 90 days of bank deposits. Lay out each signal in a table with: source document, period covered, gross figure, adjustments visible on the document, and timing factors. Do not propose a qualifying figure. Do not recommend which signal to use. End with a bullet list of questions an underwriter would need to answer before reconciling these.
>
> [redacted figures]

The model returns a table and a question list. You scan both. The question list is genuinely useful — at least one or two of the questions are things you would have wanted to ask but had not yet articulated. Note them.

Now — and this is the load-bearing moment — **you write the reconciliation paragraph yourself, in your own words.** Which signal you weight. Why. What follow-up documentation you would condition the deal on if the call were tight. Maybe four sentences. This goes in your scratch notes for the risk summary section.

## Step 4: Risk and mitigant bullets (5 minutes, yourself)

No AI yet. You sit and write, in plain bullets:

> Risks:
>
> - Seller note from buyout six months in; behind Kapitus in priority, not yet seasoned.
> - Bank deposits materially exceed K-1 income; reconciliation incomplete without owner draws history.
> - Operating entity profitability thin after add-backs; debt service tight at requested amount.
> - Industry has narrow margins; sensitivity to a single large customer concentration is visible in 90-day deposits.
>
> Mitigants:
>
> - Both principals on personal guarantee, with one carrying a strong second income.
> - Seller note is subordinated by written agreement (verify document is in file).
> - Operating entity has been in business 11 years; this is not a new venture.
> - Existing relationship with broker has performed across three prior advances.

This is your judgment. Do not outsource it. It takes five minutes if you have read the file.

## Step 5: Expand the bullets into memo prose (8 minutes)

Third AI pass.

> Below are four risks and four mitigants I have identified for a credit applicant. Expand each into one to two sentences of memo-quality prose suitable for a credit committee. Maintain the order I have listed. Do not add risks or mitigants I have not listed. Do not soften the risk language. Do not characterize the applicant.
>
> [paste bullets]

The model gives you a draft of the risk-summary and mitigants sections. Read carefully. Watch for the things lesson 5 flagged: softening of risk language, invented mitigants, inflated word counts. Cut and reshape.

## Step 6: Recommendation (10 minutes, yourself)

You write this. No AI. The post-it from step 0 is in front of you; your reconciliation paragraph from step 3 is in your scratch notes; the risks and mitigants from step 4 are clear in your head.

Three to six sentences. State the call. Name the one or two factors that tipped it. Name the conditions, if any, that are part of the recommendation (advance rate, additional guarantee, covenant on the seller note, documentation requirement). Name the trigger that would cause you to revisit.

This is the part of the memo that has your name on it in the way the rest does not.

## Step 7: Fair-lending review (5 minutes)

Apply the lesson-4 checklist to anything in the memo that could end up in front of the applicant. For this scenario, the most likely applicant-facing artifact is a condition letter — "to proceed, we need X documentation and Y modification to the seller note." Run the checklist:

- Specificity of reasons: yes, named documents and specific structural change.
- Numbers preserved: yes.
- Neutral tone: read once for any phrase that characterizes the applicant or their partners.
- No prohibited basis: check.
- Reasons match the file: check.
- Every sentence defensible as your own: check.

If you used AI to draft the condition language, double-check that "more decisive" did not creep in.

## Step 8: Verify (10 minutes)

Every dollar figure that appears in the memo, you verify against the source documents. Not the redacted scratch document. The actual source. Every figure. Every date. Every entity name. The seller-note balance. The K-1 income. The bank deposit totals. The proposed advance.

This is the step that fails the most often when someone is rushed. Do not rush it. The verification is the entire reason the synthesis steps were safe to use AI for in the first place.

## Step 9: Final read and submit (5 minutes)

Read the memo from top to bottom as if you are the committee chair. Does the deal overview tell you what this is? Do the risks make sense? Do the mitigants address the risks rather than dancing around them? Is the recommendation specific and defensible? Are there any sentences that feel like they came from a stranger?

That last question is the AI-residue check. The model has a voice — slightly formal, mildly hedged, prone to certain transitional phrases ("furthermore," "it is worth noting," "from a credit perspective"). If a sentence sounds like that and you did not write it that way, rewrite it. The memo is yours.

Submit.

## What you have done

You have produced a committee-ready memo on a complex deal in roughly 85 minutes instead of the 120+ it would have taken unassisted. You have used AI on the four tasks it does well: capital structure synthesis, income signal mapping, risk-and-mitigant prose expansion, and applicant-facing language drafting. You have done by hand the four tasks it does badly: reading the file, deciding the call, writing the reconciliation, writing the recommendation. You have verified every number. You have run the fair-lending review.

You did not save time by skipping work. You saved time by spending your minutes on the parts of the job that only you can do.

## Try this

The next deal you are assigned, run this workflow. Time each step. After the deal is submitted to committee, write down two things in your work file:

- One step where AI gave you more than you expected.
- One step where you had to push back on the model's output and would not have caught the issue without the discipline from this path.

Do this for five deals. Then look at your notes. You will see your own pattern emerge — the specific places this toolkit fits your style, the specific places where the model's drift requires your particular kind of attention. That pattern is what makes you fast and safe. That pattern is what this path was designed to build.
