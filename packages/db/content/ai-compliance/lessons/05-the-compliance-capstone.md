---
slug: the-compliance-capstone
title: The Compliance Capstone
estimatedMinutes: 12
orderIndex: 5
---

# The Compliance Capstone

This lesson is a working exercise. You will read a realistic scenario, walk through the analysis the way you would on a Tuesday afternoon at Kapitus, and — importantly — see how to use AI itself as a productivity tool in the response. The compliance officer who refuses to use AI for their own work while regulating its use by others is leaving leverage on the table.

## The scenario

It's 3:47 PM on a Wednesday. A senior underwriter, Maria, walks into your office looking pale. She tells you the following:

> "I was processing the Riverside Auto Body file this morning. The applicant got a decline. I used the approved Kapitus drafting tool to write the adverse action letter — that part's fine. But before I drafted it, I pasted the applicant's full Experian report into ChatGPT, the free one, on my personal account, because I wanted a second opinion on whether the tradeline pattern was as bad as our model said. I didn't paste it into the Kapitus tool because I wasn't sure if we're allowed to use it for that. The letter went out at 11:30 AM. About an hour later the applicant's broker called and said the applicant was upset because the letter mentioned that 'the pattern of recent auto-finance inquiries' was a factor — but the applicant says they only have one auto loan and never had multiple inquiries. I just pulled the Experian report again and the applicant is right; there's only one inquiry. I think the AI made up the 'pattern of recent auto-finance inquiries' part, and I didn't catch it."

You have two distinct problems on the desk. Walk through them in order.

## Problem one: was this an incident, and if so, what kind?

Apply Lesson 4's seven-step response framework. The relevant question for steps 1-3 is what actually happened.

**The data disclosure.** Maria pasted a full Experian credit report — including, by definition, the applicant's name, address, full SSN, and complete tradeline history — into the free version of ChatGPT, on her personal account. That is an unauthorized disclosure of NPI under GLBA. The fact that it was Maria's personal account rather than a Kapitus account makes it worse, not better — the data has now left Kapitus's controlled environment entirely, and we have no DPA, no audit trail, and no retrieval capability with the vendor.

Scope: one applicant. Acquisition: by the consumer chatbot for processing; whether anyone at OpenAI has accessed it is unknown and probably unknowable. Most state breach notification regimes scale by number of consumers affected — at one applicant, you are likely below the threshold for FTC notification under the GLBA Safeguards Rule (500-consumer threshold), and you are also likely below most state attorney general notification thresholds. You may still owe notification _to the applicant_ under one or more state laws depending on residency; that is the legal-counsel call.

This is an incident. It is reportable internally regardless of the external notification analysis. It is going in the log.

**The communication defect.** The adverse action letter sent at 11:30 AM contained a fabricated factor — "pattern of recent auto-finance inquiries" — that does not appear in the actual Experian report. Apply Lesson 3's four-check pattern in reverse: the disclosure block was probably fine (because the approved drafting tool was used), the PII was probably fine, the tone was probably fine — but the _factual content_ of the principal reason for the decline is wrong. A fabricated principal reason in an ECOA/Regulation B adverse action notice is a Regulation B violation in its own right. The applicant has been told the wrong reason for the decline.

This means we have a UDAAP exposure layered on top of the data incident: the applicant relied on an inaccurate stated reason. They may now make decisions (apply for different financing, dispute something with Experian that isn't actually there) based on a Kapitus letter that was wrong.

**Combined classification.** This is a Tier-1 incident: NPI disclosure plus a defective adverse action notice. Escalate to General Counsel, head of risk, and the executive sponsor of the AI program before you go home today.

## Problem two: what is the response plan?

Walk the seven steps.

**Step 1 — Contain.** Confirm Maria has closed the ChatGPT session and logged out. Confirm she has not pasted similar data anywhere else today or this week. Pull her recent activity log if available. Suspend the use of any non-approved AI tool for her team pending review.

**Step 2 — Document.** Maria writes a contemporaneous account of exactly what she did, in her own words, with timestamps. The original Experian report and the AI-drafted letter both go into the incident file. If she can produce a screenshot of the ChatGPT chat, that goes in too — preservation is more important than embarrassment.

**Step 3 — Assess scope.** One applicant, one disclosure event, one defective letter. Confirm the rest of Maria's recent files do not show similar fabricated reasons (sample her last twenty letters as a sanity check).

**Step 4 — Escalate.** Today, before 5 PM: General Counsel, CISO, head of risk. Outside counsel within 24 hours given the dual nature of the incident (data and communications).

**Step 5 — Notify.** The applicant needs a corrected adverse action notice with the actual reason for the decline. That is a regulatory requirement under Regulation B regardless of the data incident, and it should go out within a few business days. State-law applicant notification on the data disclosure is a legal call. FTC notification is unlikely required at this scope.

**Step 6 — Remediate.** Tactical: corrected adverse action notice; offer the applicant credit monitoring (one year is the customary minimum) given the disclosure. Process: Maria's team gets refresher training on the approved-tool-tier policy and the no-paste-into-consumer-AI rule, immediately. Programmatic: this scenario, scrubbed, becomes a case study in the next Academy refresh.

**Step 7 — Update the policy.** The incident exposed at least one ambiguity: employees do not all understand that "I'm just getting a second opinion" is still a regulated disclosure if the data is NPI. The policy language and the underwriting-path lesson on sensitive data both get a paragraph clarifying that no quantity of NPI may be pasted into any tool that is not on the approved list at the appropriate tier, for any purpose, including "second opinions."

## Meta-application: use AI to help with this response

You have an incident memo to write, a notification analysis to draft, a corrected adverse action letter to coordinate, and a board-level briefing to prepare by Friday. All of that is text work that AI can accelerate — _if you use it the way this entire Academy has been teaching_.

**Use the approved Kapitus tool, at the right tier.** Per Lesson 2, your Tier-1-approved tool can take applicant context. Your Tier-3 tool can take redacted summaries and policy excerpts. Do not paste the Experian report into anything to draft this memo. You do not need to; the regulatory analysis is about the _fact_ of the disclosure, not about the contents of what was disclosed.

**Draft the incident memo with AI assistance.** Open the approved tool. Give it the structure you want (chronology, regulatory analysis, scope assessment, threshold analysis, remediation plan), give it your scrubbed facts, and let it draft the body. Then run Lesson 3's four-check pattern on the draft: disclosures (this is internal so the check is "does it cite the right regulations correctly?"), PII (should be none — scrubbed already), tone (is it factual and non-defensive?), hallucinations (cross-check every regulatory citation against the actual rule, because the model will absolutely invent a CFR section that sounds plausible).

**Summarize the policy section.** Ask the AI to summarize the relevant section of the Kapitus AI Acceptable Use Policy and the relevant Regulation B requirements for the briefing audience. This is a Tier-3 use; the policy text is internal, not customer NPI. Verify every regulatory citation in the summary against the actual policy and the actual regulation. This is exactly the kind of task where AI shines — synthesizing, summarizing, reframing — and exactly where you need to verify the specifics.

**Draft the corrected adverse action notice.** Use the approved Tier-1 drafting tool. Pull the _actual_ underwriting factors from the loan management system, not from anyone's recollection. Run the four-check pattern before it goes out. Treat this letter as the one that will be Exhibit A if anything escalates.

**What not to delegate.** The judgment calls. Whether a particular state requires applicant notification. Whether the scope analysis is complete. Whether outside counsel needs to be involved. Whether Maria's situation calls for HR action or coaching. The AI can draft the words; you make the calls.

## What you have learned across this path

Step back from the scenario for a moment. Five lessons in, you should now be able to:

- Articulate your role at Kapitus as a reviewer and policy author rather than a primary AI user, and map the work into tool vetting, communications review, and incident response.
- Run a new AI tool through the seven-question vendor questionnaire and assign it to one of the four data tiers, with a defensible rationale.
- Apply the 60-second four-check pattern to any AI-drafted customer communication and catch the failure modes specific to AI drafts.
- Execute the seven-step incident response from memory, with a clear-eyed sense of which notification regimes may apply at which thresholds.
- Use AI tools yourself for the leverage they provide on memos, summaries, and drafts — at the right tier, with the same scrutiny you apply to everyone else's output.

The CFPB is going to spend the next decade catching up with what financial-services AI looks like in practice. The institutions that come through that period with clean records will be the ones whose compliance officers built the program before they had to. You are now equipped to be one of those compliance officers at Kapitus.
