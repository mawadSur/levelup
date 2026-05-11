---
slug: explaining-decisions-without-violating-ecoa
title: Explaining Decisions Without Violating ECOA
estimatedMinutes: 12
orderIndex: 3
---

# Explaining Decisions Without Violating ECOA

The decline letter is the single highest-stakes piece of writing you do. A clumsy follow-up email costs you an applicant. A clumsy decline letter costs Kapitus a regulatory finding, a CFPB complaint, and in extreme cases a fair-lending lawsuit.

This is also the place where AI is most tempting and most dangerous. The applicant deserves a clear explanation, you're tired, the chatbot writes a fluent draft in three seconds — and that draft is the one most likely to contain language a regulator would flag. This lesson is about how to use AI for decline communication without ending up there.

## What ECOA and the FCRA actually require

A short, practical version. (Compliance owns the legal text; this is the working summary you need at your desk.)

- **ECOA / Regulation B** requires that when credit is denied, the applicant gets a notice with the _specific principal reasons_ for the denial. Not a generic "did not meet credit criteria." Specific reasons drawn from the actual decision factors.
- **The FCRA** requires that if the decision was based on information in a consumer report, the applicant must be told that, plus the name and contact information of the consumer reporting agency, and that they have the right to a free copy of the report and to dispute inaccuracies.
- **Both** require the notice within the timelines Kapitus's process enforces (usually 30 days). Adverse action notices in this space are not optional and not generic. They are tracked.

You do not need to memorize the regulations. You need to know that the decline letter has a _form_ and _required content_, and that drifting from it — even toward "more empathetic" language — can create a violation.

## The trap

Here is a decline-letter sentence that sounds compassionate and is also an ECOA violation:

> _"Unfortunately, your credit score of 625 is too low for our program."_

What's wrong with it:

1. **It cites a single bureau score as the reason.** ECOA reason codes are specific (e.g., "insufficient time in business," "high existing debt obligations"). A raw FICO number is not a Regulation B reason code.
2. **It does not disclose the bureau.** If a consumer report was used, the FCRA requires you to name the reporting agency and tell the applicant how to get the report.
3. **It implies a hard cutoff that may not exist.** Kapitus does not decline solely on score, and saying we did invites a fair-lending challenge — was the cutoff applied evenly across protected classes?

Here's the AI version of the same trap. You type _"draft a polite decline letter for an applicant whose credit score was too low"_ and the model produces three fluent paragraphs that sound great and contain that exact sentence. You send it. You've now produced a written, signed document with your name on it that misstates Kapitus's adverse action reasoning. The applicant forwards it to CFPB. Compliance forwards it to you.

## What to say instead

The Kapitus adverse action template exists for a reason. AI can help you draft the _cover language_ — the warm "thank you for applying, here is what comes next" framing — but the _reasons section_ comes from the underwriting decision, not the model.

Compare:

| Wrong                                                | Right                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "Your credit score of 625 is too low."               | "The principal reasons for this decision include: [pull from approved reason code list]." |
| "Your business is too risky."                        | "Insufficient time in business under our current program guidelines."                     |
| "Your bank statements weren't good enough."          | "Low average deposit balance relative to requested loan amount."                          |
| "Try again in six months when your credit improves." | "You may reapply at any time. This decision does not prevent a future application."       |

The right column comes from Kapitus's reason-code list (compliance keeps the canonical version). AI does not invent reason codes. AI does not phrase them better than they are already phrased. AI's only job in a decline letter is the surrounding tone.

## How to check an AI-drafted decline letter before sending

Run every AI-drafted decline through this four-question check before it leaves your outbox:

1. **Does it cite specific reasons from Kapitus's approved reason codes — and only those?** If the model added a reason ("your industry is high-risk"), delete it. If it dropped one underwriting flagged, add it back.
2. **Does it identify the bureau if a consumer report was used?** Including the bureau's name, address, and phone number. The model will routinely omit this or invent a bureau. Verify against Kapitus's template.
3. **Does it tell the applicant they can get a free report copy and dispute inaccuracies?** Required language. The model paraphrases it differently every time. Use the canonical Kapitus phrasing.
4. **Does it say anything about a protected class, directly or indirectly?** "Given your demographic," "for someone in your area," "applicants like you" — these are red flags. ECOA and the Fair Housing Act prohibit discrimination on race, color, religion, national origin, sex, marital status, age, receipt of public assistance, and several others. If the letter implies _any_ of these factored into the decision, do not send it.

If the letter fails any of these, do not "ask AI to fix it." Drop back to the Kapitus template and use AI only to soften the cover paragraphs.

## A safer prompt pattern for decline letters

The shape of a prompt that won't get you in trouble:

> _"I have an adverse action decision with these approved reason codes: [code 1], [code 2]. The applicant applied for a working-capital product. Draft a warm cover paragraph (3-4 sentences) that thanks them for applying, expresses regret about the outcome, and leads into a 'principal reasons for this decision' section. Do not paraphrase or add reasons. Do not include any specific financial details. Do not generate the regulatory disclosure block — I will paste in our template."_

Then you paste the Kapitus regulatory block at the end. The AI handles tone; Kapitus's template handles compliance.

## Try this

Find the Kapitus adverse action template in your compliance handbook (or ask your manager where it lives). Read it once, slowly, with this lesson in mind. Notice which sections are _fixed_ (reason codes, bureau disclosure, dispute language) and which are _flexible_ (the opening greeting, the closing sentence).

Then sketch the prompt you would use to have AI draft only the flexible parts. If you find yourself wanting to give AI the underwriting reasoning in your own words, stop — that's the trap. The reason codes come from the system, not from your retelling of them.
