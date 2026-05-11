---
slug: the-loan-officer-capstone
title: The Loan Officer Capstone
estimatedMinutes: 12
orderIndex: 6
---

# The Loan Officer Capstone

Five lessons in, you have the parts. This one is the assembly. We're going to walk through one applicant relationship — start to finish, four to five AI prompts across two weeks — the way it actually unfolds. The goal isn't to memorize the script. It's to see what an integrated, safe workflow looks like so you recognize it (or its absence) in your own work tomorrow.

## The scenario

Monday morning, an applicant submits a Kapitus working-capital application. Call them Applicant A. They run a small services business. They've uploaded two of the four required documents — a YTD profit-and-loss and one month of bank statements. Missing: two additional months of bank statements and a voided check.

The file is yours. Walk it through.

## Prompt 1 — The first follow-up email (Monday afternoon)

You've reviewed the partial file. The applicant hasn't done anything wrong; they just submitted before realizing the full doc list. Standard first follow-up.

Bad version (don't do this):

> _"Hey ChatGPT, draft a follow-up to Acme Plumbing for their $60k application. They submitted 1 of 3 bank statements (April only, missing Feb and March) and no voided check. Owner is Joe Martinez. Make it friendly."_

Good version:

> _"Draft a short, warm first follow-up email to a small-business applicant who has submitted a partial document set. They are missing two months of bank statements and a voided check. Acknowledge they may have submitted before seeing the full list. Be specific about what's needed. Offer to help if anything is unclear. Under 100 words. Sign as 'Your Kapitus advisor.'"_

Take the AI output, paste it into your email client, replace the signature, address it to the applicant, send. Elapsed time: about three minutes. Identifiers exposed to a third party: zero.

## Prompt 2 — The reminder (Thursday)

Three business days pass. The applicant hasn't responded. Time for a polite nudge.

Good version:

> _"Draft a friendly second follow-up to a small-business applicant. We sent a first email 3 business days ago about missing documents — two months of bank statements and a voided check — and haven't heard back. Acknowledge they may be busy. Be slightly more specific about the timeline (we need the docs to keep the file moving). Stay non-judgmental. Under 90 words."_

Again: no name, no business, no loan amount, no specific months. The model produces a clean draft, you personalize it inside Kapitus's system, and it goes out.

## Prompt 3 — The summary for underwriting (Friday)

The applicant comes through. They send everything by end-of-week. Now you have a complete file: P&L, three months of bank statements, voided check. Underwriting needs a one-paragraph summary in the file note.

This is where lesson 5 lights up. You don't paste the documents into AI. You read them, extract the facts, and use AI only for the writing.

Your extraction (done by you, by hand):

- 3 months of business bank statements
- Avg daily balance: ~$28k
- Lowest balance: ~$6k in mid-March
- NSF events: 0
- Avg monthly deposits: ~$55k
- Deposit pattern: roughly weekly inflows, no large irregular deposits
- P&L: YTD gross revenue ~$640k, net margin ~14%

Your prompt:

> _"Draft a 4-sentence summary for an underwriting file note. Stick to facts only. Do not infer whether the applicant qualifies. Facts: 3 months of business bank statements; avg daily balance ~$28k; lowest balance ~$6k in mid-March; 0 NSF events; avg monthly deposits ~$55k with weekly inflows; YTD P&L shows ~$640k gross revenue, ~14% net margin."_

The model returns a clean 4-sentence summary. You read it carefully — no judgment words, all numbers match your bullets, nothing invented. You paste it into the file note inside Kapitus's system. Underwriting takes it from there.

## Prompt 4 — The decline (Wednesday of week 2)

Underwriting comes back: declined. The approved reason codes are "insufficient time in business" and "industry concentration above program threshold." You need to send the adverse action notice.

This is the highest-stakes prompt in the entire applicant relationship. Lesson 3 governs everything that follows.

What you do **not** do: ask AI to "draft a decline letter for an applicant whose business is too new and in a risky industry." That prompt invites the model to paraphrase the reasons in its own words, add reasons that weren't there, drop the bureau disclosure, and generate hallucinated regulatory language. Any one of those is a violation.

What you **do** instead:

> _"I have an adverse action decision with these two approved reason codes — exact wording, do not paraphrase: 'Insufficient time in business under program guidelines' and 'Industry concentration above program threshold.' The applicant applied for a working-capital product. Draft a warm 3-4 sentence cover paragraph that thanks them for applying, expresses regret, and leads into a 'Principal reasons for this decision' section that will list the two reason codes above verbatim. Do not paraphrase the reasons. Do not add reasons. Do not generate any regulatory disclosure language — I will paste in our adverse action template for the rest of the letter."_

The AI produces a cover paragraph. You paste it at the top of the Kapitus adverse action template. The template's reason codes section already has the exact code wording. The template's regulatory block already has the FCRA bureau disclosure and the dispute-rights language.

Then you run the four-question check from lesson 3:

1. Specific reasons from approved codes only? Yes — the template has them verbatim.
2. Bureau identified if a consumer report was used? Yes — the template includes it.
3. Free-report and dispute-rights language present? Yes — the template includes it.
4. Anything about protected class, directly or by proxy? Read the cover paragraph again. Anything like "given your industry's typical profile" or "in your area"? If yes, strip it. If no, send.

Letter goes out. Compliance is happy. The applicant has a clear, complete, lawful explanation.

## Prompt 5 — The closeout note (Wednesday afternoon)

Last piece. You're closing the file in Kapitus's system and want a one-sentence summary for the audit trail.

Good version:

> _"Draft a one-sentence file-closure note for an adverse action outcome. Tone: factual and neutral. Mention the application date, the product type (working capital), and that the adverse action notice has been delivered with the approved reason codes."_

You take the output, fill in the date inside Kapitus's system, and click close.

## The pattern, looking back

Five prompts across two weeks. Add them up:

- **Two follow-up emails** drafted in minutes, with no identifying data ever leaving Kapitus's systems.
- **One underwriting file summary** that took ten minutes instead of an hour, with the reading and judgment kept by humans and the writing handed to AI.
- **One ECOA-safe decline letter** where AI wrote the cover paragraph and Kapitus's template did the regulatory work.
- **One closeout note** for the audit trail.

Time saved across the relationship: probably an hour and a half versus writing it all from scratch. Identifiers exposed to a third party: zero. Regulatory violations introduced: zero. Decisions made by AI: zero.

That last number is the one that matters. AI helped with every step. AI decided nothing.

## Try this

Take the next applicant relationship that lands on your desk. Before doing anything, sketch the prompt sequence you expect to need across the file — follow-ups, summary, decision communication, closeout. Use the placeholder pattern. Note where AI helps and where it must not.

Then work the file. After it closes, look back at your sketch and your actual prompts. Where did you stick to the pattern? Where did you drift? The drift is where the next month of practice goes.

This is the work now. Welcome to the AI-assisted version of your job.
