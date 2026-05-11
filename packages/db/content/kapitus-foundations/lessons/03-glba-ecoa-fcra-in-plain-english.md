---
slug: glba-ecoa-fcra-in-plain-english
title: GLBA, ECOA, FCRA in Plain English
estimatedMinutes: 10
orderIndex: 3
---

# GLBA, ECOA, FCRA in Plain English

Three federal laws shape almost everything Kapitus does. You don't need a law degree, but you do need the 30-second version of each in your head — because when you're deciding whether to paste something into an AI tool, the answer often comes down to which of these three laws applies.

We'll go one at a time. For each: what it is, what it requires of you specifically, and where AI tools make people stumble.

## GLBA — Gramm-Leach-Bliley Act

**The 30-second version.** GLBA says financial institutions must protect customers' "nonpublic personal information" (NPI). NPI is essentially any information about an applicant or customer that isn't already public — their SSN, account numbers, income, credit history, the fact that they applied with us at all. We are required to safeguard NPI, to disclose to customers how we use it, and to limit how we share it with third parties.

**What it requires of you.**

- NPI lives inside Kapitus systems and approved-for-Restricted tools. Period.
- When you share NPI internally, you share only what's needed for that specific job. Underwriting needs the credit file; the marketing team doesn't.
- If you're not sure whether an action involves NPI, treat it as if it does and check.

**Where AI trips people up.** The "third-party service provider" question. A consumer AI chatbot is a third party. Pasting NPI into it counts as sharing NPI with that third party — and we don't have a GLBA-compliant data-processing agreement with consumer ChatGPT or Gemini. We do have one with the specific enterprise tools we've approved. That's the whole reason the tier system in lesson 4 exists.

The most common mistake under GLBA isn't intentional disclosure — it's well-intentioned convenience. "I just wanted to summarize the file faster." Doesn't matter. The information left the boundary.

## ECOA — Equal Credit Opportunity Act

**The 30-second version.** ECOA prohibits discrimination in credit decisions on the basis of race, color, religion, national origin, sex, marital status, age, receipt of public assistance, or exercise of consumer-protection rights. It also requires us to notify applicants when we take "adverse action" (a decline, a counter-offer, a smaller amount than requested) and to give specific reasons.

**What it requires of you.**

- The decision to extend or deny credit must be based on legitimate, documented factors. Not on a protected class — not even indirectly through a proxy like ZIP code that correlates strongly with one.
- When we decline or counter-offer, the applicant gets an adverse action notice with the actual reasons. The reasons must be accurate and specific.
- The reasoning that goes into a credit decision must be auditable. A regulator may, months later, ask us to explain why we made the call we made.

**Where AI trips people up.** Two places.

First: **AI in the decision path.** If you use AI to "help me decide whether this deal should be approved" and then act on its output, you've put a black-box system into a regulated decision. Even if you intended it as a second opinion, the regulator may not see it that way. AI can help you organize the file, summarize the broker notes, draft the credit memo's prose — but the _decision and the reasons_ must come from a human underwriter and be defensible without reference to AI output.

Second: **AI in adverse action notices.** The reasons in an adverse action notice have to be the real reasons, drawn from the file. If you ask an AI to "draft an adverse action letter for a denied applicant," it will produce something that _reads_ like an adverse action notice but may include reasons that aren't actually from this file — invented reasons that sound plausible. That's an ECOA violation waiting to happen. The boring legal language can be templated; the substantive reasons must be human-checked against the actual underwriting decision.

## FCRA — Fair Credit Reporting Act

**The 30-second version.** FCRA governs how consumer credit information is collected, used, and disclosed. It limits when we can pull credit, what we can do with the information once we have it, and what we owe the consumer when credit information drives an adverse action.

**What it requires of you.**

- We pull credit only for a "permissible purpose" — a legitimate application from the consumer, account review for an existing customer, or a few other narrow cases.
- The credit information we receive from a bureau is regulated data. It's Restricted in our framework. It does not leave our boundary.
- When credit information contributes to an adverse action, the consumer is entitled to specific disclosures, including the name and contact info of the credit reporting agency.

**Where AI trips people up.** The single biggest one: **don't quote a credit score in a customer-facing communication.** FCRA has specific rules about credit score disclosures, and a casual sentence in an email from a Kapitus employee — "your 612 FICO score is below our threshold" — can trigger obligations that the casual email did not satisfy. The adverse action notice template is the proper place for credit-score disclosure language. AI-generated emails that helpfully include the score are a real risk.

The second one: pasting a credit report into an AI tool to "summarize for me." This is the GLBA problem and the FCRA problem at once. The credit report is Restricted under our policy _and_ it's regulated credit information under FCRA. It does not go into any tool that hasn't been explicitly cleared.

## Putting the three together

In practice, when you're making an AI judgment call, run this internal check:

- **Is there NPI in this?** That's GLBA. → Approved-for-Restricted tooling only.
- **Is this in the path of a credit decision or an adverse action notice?** That's ECOA. → AI can help with structure and prose, but the substantive reasons and the decision itself stay with a human.
- **Does this involve a credit score, credit report, or credit-derived reason?** That's FCRA. → Stays inside our boundary; never quoted casually in customer-facing language; goes only into a tool cleared for it.

You will run into situations where two or three of these apply at once. That's fine — the answer is the most conservative of the three.

## Try this

Pick a real piece of work you've done in the last week. Walk it through the three-question check above. Did the way you handled it match the rule? If not, what would have made it match?

This isn't a gotcha exercise. Most people, the first time they do this honestly, find at least one small gap. That's the point — the time to notice is now, with no harm done, not after a regulator has asked the same question.
