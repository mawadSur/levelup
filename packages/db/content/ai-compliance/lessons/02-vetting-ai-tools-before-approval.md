---
slug: vetting-ai-tools-before-approval
title: Vetting AI Tools Before Approval
estimatedMinutes: 12
orderIndex: 2
---

# Vetting AI Tools Before Approval

A department head will, sooner or later, walk into your office with a free trial and a deadline. "We want to use this AI tool starting Monday. It will save us ten hours a week. Can you sign off?"

The right answer is almost never "yes by Monday." It is also rarely "no." The right answer is "here is the questionnaire, here is the timeline, here is the data tier we are going to assign, and here is what changes about how your team can use it."

This lesson gives you the questionnaire, the four-tier classification, and the red flags that should make you walk away from a vendor entirely.

## The vendor questionnaire

Every AI tool — every one, including the ones that look like "just a Chrome extension" — has to clear the same set of questions before it touches Kapitus data. Treat this as the minimum bar. Higher-risk tools get a deeper review on top of it.

**1. Is there a signed Data Processing Agreement (DPA)?** If the vendor cannot produce a DPA, the conversation is over. The DPA needs to name Kapitus as controller, the vendor as processor, list the categories of data we may submit, and bind the vendor to GLBA Safeguards-equivalent protections. Free consumer tiers of major AI products generally cannot offer this — that is why employees cannot paste applicant data into the free version of ChatGPT, even though many of us use it for personal tasks.

**2. Where does the data live?** US data residency is the default expectation for anything touching applicant or customer information. EU residency may be acceptable for non-PII operational use. Anything else — particularly model-training infrastructure in jurisdictions without an adequacy framework we recognize — requires a documented exception with a sunset date.

**3. Is there an audit trail we can retrieve?** Can Kapitus pull, on demand, the full set of prompts and responses submitted by a named user over a date range? "We retain logs for our own purposes" is not the same as "you can retrieve them in a regulator-readable format within ten business days." Confirm the format, the SLA, and the cost.

**4. Is training-data opt-out the default?** The vendor's training pipeline must not, by default, incorporate Kapitus prompts or outputs to improve their model. If opt-out is available but not the default, that is a configuration line item, not a yes. If opt-out is not available at all on the tier we are evaluating, escalate to the enterprise tier or walk away.

**5. What is the sub-processor list?** Most AI vendors are wrappers around one or two foundation-model providers (OpenAI, Anthropic, Google, AWS Bedrock, Azure OpenAI). The sub-processor disclosure should name them, name their region, and commit to notifying Kapitus before adding new sub-processors. A vendor that cannot tell you who runs their inference is not yet ready for a regulated customer.

**6. What is the breach notification SLA?** Per GLBA Safeguards Rule, we need notification of a security event within 72 hours, and notification of a confirmed breach involving customer information without unreasonable delay. The DPA should reflect at least the 72-hour standard; faster is better. Build the obligation into the contract, not into a "best efforts" clause.

**7. What is the model and version transparency?** When the vendor swaps the underlying model — moving from one provider to another, or upgrading a major version — does Kapitus get notice? Model swaps change the behavior of the output. A summarization tool that was reliable on the old model may begin hallucinating on the new one. You need the right to test before the change is forced.

A "yes" on all seven is the minimum to enter the next step. The next step is data-tier assignment.

## The four-tier model

Once a tool passes the questionnaire, you assign it to a tier. The tier governs what data employees are allowed to send to it. The Kapitus AI Acceptable Use Policy enumerates these; the Academy's role-specific paths refer back to them.

**Tier 1 — Restricted-OK.** The tool is approved for the most sensitive Kapitus data, including applicant PII, credit reports, bank statements, SSNs, tax returns, and any nonpublic personal information under GLBA. This tier requires the full questionnaire, an executed DPA, US residency, contractual training-data opt-out, and integration into Kapitus SSO with audit logging piped to our SIEM. Very few tools start at this tier; most graduate to it after a pilot in a lower tier.

**Tier 2 — Confidential-OK.** The tool is approved for internal Kapitus information that is not customer PII: deal pipelines without names attached, internal performance data, drafts of policy documents, anonymized portfolio statistics. Still requires a DPA and US residency. Most enterprise tools that pass vetting land here first.

**Tier 3 — Internal-OK.** The tool is approved for general business use — internal communications, generic drafting, summarizing publicly available documents — but not for any data that could identify an applicant, employee, or counterparty. Many widely used AI productivity tools live here.

**Tier 4 — Public-only.** The tool may be used only with information that Kapitus could publish on its website without consequence. Free consumer chatbots and most ad-hoc Chrome extensions live here by default. The fact that an employee finds something "useful" is not a reason to upgrade the tier.

A given employee's allowed tier is also a function of their role and training completion. An employee who has not completed the role-specific Academy path cannot send Tier-1 data to a Tier-1-approved tool — the tool's approval is necessary but not sufficient.

## Red flags that end the conversation

Some vendor responses should make you stop the review and decline the tool. Recognize them by sight.

- **"We use your prompts to improve our model."** Even if opt-out is offered later in the conversation, the fact that this is the default is a posture issue. It means their product team is not yet building for regulated customers.
- **"Our infrastructure is global; we cannot guarantee where any specific request is processed."** This is a non-starter for anything above Tier 3.
- **"We don't have a formal DPA but our terms of service cover this."** Terms of service are not contracts negotiated by a regulated counterparty. Require a real DPA.
- **"We don't retain logs after 30 days."** This may suit the vendor's data-minimization story but it conflicts with our retention obligation for records associated with an adverse action decision.
- **"Our sub-processor list is confidential."** A processor that will not name its sub-processors cannot be a processor for a GLBA-covered entity.
- **"We're SOC 2 in progress."** "In progress" is not a control. A Type II report with a current observation period is the bar; a Type I plus a roadmap may be acceptable for lower-tier tools with documented compensating controls.

When you see these, the request is not "approve it anyway." The request is to either escalate to the vendor's enterprise sales team to renegotiate the posture, or to find a different tool.

## The output of vetting

Every approved tool ends with a one-page summary in the AI vendor file: tool name, vendor, tier, allowed data categories, allowed user groups, audit-trail retrieval procedure, breach notification path, and the renewal date. Lesson 5's capstone scenario will reference this file; build the habit of producing it for every tool you bless.
