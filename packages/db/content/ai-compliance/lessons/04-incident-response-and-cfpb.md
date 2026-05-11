---
slug: incident-response-and-cfpb
title: Incident Response and CFPB
estimatedMinutes: 12
orderIndex: 4
---

# Incident Response and CFPB

A loan officer is processing a tricky deal. The applicant has three years of tax returns and a stack of bank statements. The officer wants a summary. They paste the entire credit report — name, address, full SSN, every tradeline — into the free version of ChatGPT and ask, "What are the red flags here?"

That happened. Pick whichever quarter you like and you can find a version of it on someone's incident log. Your job is to be ready when it happens at Kapitus.

This lesson covers what counts as an incident, where the CFPB and GLBA notification thresholds sit, and the seven-step response you should be able to execute from memory.

## What just happened, in regulatory terms

When that loan officer pasted the credit report into a consumer chatbot, several things happened simultaneously:

- **An unauthorized disclosure of nonpublic personal information (NPI)** under the GLBA Safeguards Rule. The applicant's NPI left Kapitus's controlled environment and entered a third-party service that has no DPA with us and almost certainly is not in our approved vendor file at the right data tier.
- **A potential FCRA violation.** The credit report was furnished to Kapitus for a permissible purpose. Disclosing the contents of that report to a third party outside the permissible purpose can be an FCRA issue depending on what was disclosed and to whom.
- **A control failure that needs to feed back into our CMS.** Even before anyone outside Kapitus knows about it, you have a finding: the AI policy was either unclear, untrained, or unenforced for this employee. That finding has to be documented regardless of the external notification analysis.

Notice that the _severity_ of the incident does not depend on whether the AI vendor "did anything bad" with the data. The disclosure itself is the incident. Whether the vendor trained on it, leaked it, or quietly deleted it is a secondary question that matters for remediation, not for the initial classification.

## When does CFPB notification kick in?

Compliance officers tend to ask "do I have to call the CFPB?" as if it were a single threshold. It is not. There are several distinct notification regimes that may apply, and they trigger on different conditions.

**GLBA Safeguards Rule notification to FTC.** Effective 2024, certain financial institutions covered by the Safeguards Rule must notify the FTC of a "notification event" — unauthorized acquisition of unencrypted customer information involving 500 or more consumers — as soon as possible, and no later than 30 days after discovery. A single applicant pasted into ChatGPT is unlikely to clear the 500-consumer threshold by itself, but a pattern of incidents or a single bulk paste might. The threshold is acquisition, not just exposure, so the facts of what the vendor retained and whether anyone accessed it matter.

**State breach notification laws.** Many states require notification to affected consumers and, in some cases, state attorneys general, with thresholds and timelines that vary. New York's SHIELD Act, California's CCPA, and Massachusetts's 201 CMR 17 are the ones most likely to apply to Kapitus given our funded markets. The state thresholds are typically lower than the federal ones, and the affected-consumer notification clock can be as short as 30 days.

**CFPB supervisory expectations.** The CFPB itself does not run an FTC-style breach notification regime, but it does expect a regulated entity to surface significant compliance issues during examinations and supervisory engagements. A material AI-driven incident affecting consumer protection regulations (UDAAP, ECOA, FCRA) is the kind of thing that should appear in your next supervisory engagement as something you identified, contained, and remediated. Hiding it is worse than reporting it.

**Contractual notification to counterparties.** Bank partners, brokers, and other counterparties often have contractual notification clauses with their own thresholds and timelines. Treat these as on the same critical path as the regulatory ones.

The compliance officer's job is not to memorize every threshold. It is to know that several regimes may apply, and to escalate to outside counsel early enough that the analysis can run in parallel with containment, not after it.

## The seven-step response

When you are notified that an AI incident has occurred, work the steps in this order. They are designed so that the highest-leverage actions happen first.

**Step 1 — Contain.** Stop the active disclosure. If the employee is still in the chat session, instruct them to close it without further interaction. If a tool is the source of repeated incidents, restrict access at the network or SSO layer until the review is complete. Do not delete anything yet — preservation matters for step 2.

**Step 2 — Document.** Pull every artifact: the prompt, the response, the timestamps, the user account, the device, the data category involved, and the number of affected consumers. If the AI tool was approved, pull the audit trail from the vendor. If it was not, pull whatever the employee can produce — screenshots, the URL of the chat, the account they were logged into. The documentation file you build here is what regulators will eventually read.

**Step 3 — Assess scope.** Was this one applicant or many? Was the data acquired by a human or merely processed by a model? Did the prompt go to a vendor with a DPA or to a free consumer tier? Has the vendor's data retention policy already deleted the prompt or does it still exist? Did the employee paste the same data elsewhere? Scope determines which notification regimes apply.

**Step 4 — Escalate internally.** Loop in legal counsel, the CISO, and the executive sponsor of the AI program. For incidents touching customer NPI, the General Counsel and the head of risk are not optional. Outside counsel comes in early if the facts look like they may cross any notification threshold; having privilege over the analysis is valuable.

**Step 5 — Notify regulators and counterparties, if required.** This step is contingent on the analysis from steps 3 and 4. Do not skip it because the lower-severity branch felt likely; the documentation file should record the threshold analysis and the conclusion regardless of which way it went. If notification is required, it goes through legal, not directly from compliance.

**Step 6 — Remediate.** Three layers. Tactical: the affected applicant, if their information was disclosed, may be owed notification, credit monitoring, or remediation under state law. Process: the control that failed needs to be fixed — a missing technical control, a training gap, a policy ambiguity. Programmatic: the incident becomes a case study in the next round of training, with the identifying details scrubbed.

**Step 7 — Update the policy.** If the incident exposed an ambiguity in the AI Acceptable Use Policy, fix the policy. If it exposed a vendor-tier mismatch, re-tier the vendor or remove it. If it exposed a training gap, change the Academy. The policy lifecycle's "audit" phase feeds back into the "write" phase, and incidents are the highest-signal feedback you get.

## The retention obligation that nobody thinks about

Here is the wrinkle specific to AI: when an underwriter uses AI to draft an adverse action letter, you have at least three documents floating around. The original prompt. The model's draft. The final letter that was actually sent. The final letter is in your loan management system; you know how to retain that.

The _intermediate drafts_ are the question. Are they part of the record associated with the adverse action decision? In most jurisdictions, the answer leans toward "yes, if they were relied upon in the decision or contain decision-relevant information." That means the audit trail from the AI tool — the prompts and responses — needs to be retrievable for the same retention period as the underlying decision record.

This has two implications for your program:

- The audit-trail capability from Lesson 2's vendor questionnaire is not optional; it is part of how you meet the retention obligation.
- Employees should be discouraged from using ad-hoc AI tools (even Tier-3 ones) for the actual drafting of adverse action language, because the audit trail will be harder to assemble. The approved tools at the right tier are part of the record; the unapproved ones are an enforcement problem you can lose sleep over.

When an examiner asks for "all records associated with this adverse action decision," your answer needs to include the AI prompts and responses, in a retrievable format, for the right retention window. Build for that on the front end.

## What good looks like

A mature AI incident response program has three properties an examiner can verify:

1. Every incident is logged, classified, and tied to a specific control failure. The log is reviewed at a recurring governance forum, not just by you.
2. The threshold analysis for each notification regime is documented for each incident, even when the conclusion was "no external notification required."
3. The remediation feeds back into the policy and training within a defined SLA — say, 30 days for policy updates, 60 days for training revisions.

If you can show those three things, you have an AI incident program that holds up under scrutiny. The next lesson puts it to work on a realistic Kapitus scenario.
