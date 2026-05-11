---
slug: the-compliance-officers-job-with-ai
title: The Compliance Officer's Job With AI
estimatedMinutes: 10
orderIndex: 1
---

# The Compliance Officer's Job With AI

You already know the regulatory backbone Kapitus operates against: ECOA and Regulation B, FCRA, GLBA, UDAAP, the CFPB's supervisory expectations, and the state-level licensing regimes that vary across our funded markets. You have spent a career applying those rules to humans drafting letters and humans pulling credit. Your job now is to apply them to humans who are increasingly _delegating_ parts of that work to a language model.

This is not a new compliance regime. It is your existing regime applied to a new actor in the process — one that produces fluent, plausible-sounding output and does not know that Regulation B exists.

## You are not the user. You are the reviewer.

Most of this Academy is built for the people who will type prompts into AI tools every day — underwriters, sales, support, HR. Their job is to use AI well within the guardrails. **Your job is to be the guardrails.**

That distinction matters for how you should approach the rest of this path. You are not learning to write better prompts (though you should be conversant in what good ones look like). You are learning to:

- Decide which AI tools Kapitus is allowed to adopt, and under what data tier
- Review AI-drafted communications that go to applicants and customers
- Detect, contain, and report incidents when AI is misused with regulated data
- Author and maintain the AI Acceptable Use Policy itself, and the training that flows from it

In your day-to-day, you will spend more time looking at AI _output_ than producing it. The skill you are building is calibrated skepticism, applied at scale.

## The three new responsibilities

Map the work into three buckets. The rest of this path is organized around them.

**1. Tool vetting.** A sales lead heard about a new AI prospecting tool at a conference. Marketing wants to pilot a new copywriting tool. Underwriting found a vendor that promises to summarize tax returns. None of these tools touch Kapitus systems until they have cleared a structured review: data processing agreement, data residency, audit trail, training-data opt-out, sub-processor list, breach notification SLA. Lesson 2 walks through the questionnaire and the four-tier classification you will assign.

**2. Communications review.** Underwriting and sales increasingly use AI to draft applicant-facing text — adverse action language, conditional approval notes, broker emails, follow-ups. Every one of those communications is still subject to ECOA, FCRA, and UDAAP. You need a fast, defensible review process that catches the failure modes specific to AI drafts: missing disclosures, hallucinated rates, tone that crosses into fair-lending risk, PII left in the body. Lesson 3 gives you the 60-second review pattern.

**3. Incident response.** Someone is going to paste a credit report into ChatGPT. Someone is going to upload an applicant's bank statements to a tool that was never approved. Someone is going to send a decline letter that the AI fabricated a reason for. You need to know what counts as an incident, what the containment steps are, and where the CFPB notification threshold sits. Lesson 4 covers the seven-step response.

## The AI policy lifecycle is the compliance lifecycle

The structure that ties this together is one you already know, just relabeled.

**Write → Train → Enforce → Audit.**

- **Write the policy.** Kapitus's AI Acceptable Use Policy defines approved tools, data tiers, prohibited inputs, and the review process for new tools. You own it. It should be reviewed at least annually and whenever a new tool category lands.
- **Train the org.** Every employee who has access to AI tools has to complete the Academy. Role-specific paths for underwriting, sales, support, HR, marketing, and managers are required reading. You are the program owner — you set the cadence, the attestation, and the remediation when someone fails.
- **Enforce.** This is the review, the gating of new tools, and the day-to-day "is this allowed?" judgment calls. Most of it is invisible until something goes wrong.
- **Audit.** Sample AI-drafted communications. Review the audit log for sensitive-data flags. Confirm that decline reasons in the loan management system reconcile to what was actually communicated. Confirm new tools added to the approved list have a completed vendor file.

If you have built a CMS program against the CFPB's compliance management expectations, you have built this lifecycle before for fair lending, for UDAAP, for servicing. AI is another vertical inside it.

## What's different about AI as a compliance object

Three things make AI distinct enough to deserve its own program rather than a paragraph buried in an existing policy.

**The output is fluent and confident even when wrong.** A human drafter who is unsure tends to hedge. A language model that is unsure produces the same crisp, professional paragraph it produces when it is right. Reviewers who are not calibrated for this will rubber-stamp output that a careful human draft would have failed.

**The audit trail is fragmented by default.** A loan officer who drafted a decline letter manually left a Word document with track changes. A loan officer who used an AI tool may have a chat history in a vendor's UI, a copy-pasted excerpt in our loan management system, and nothing in between. Your tool vetting standards should require that the audit trail can be reconstructed.

**The data egress surface is wide.** Every employee with a browser can, today, paste anything from their screen into a free consumer chatbot. The policy boundary is no longer "what systems can people access" — it is "what data can people copy."

## What this lesson asked of you

Internalize three things:

1. Your relationship to AI at Kapitus is supervisory, not operational.
2. The work splits into tool vetting, communications review, and incident response — and the rest of this path covers each in turn.
3. The lifecycle is the same compliance lifecycle you already run; you are extending it, not inventing it.

The next four lessons turn each of those buckets into a working playbook.
