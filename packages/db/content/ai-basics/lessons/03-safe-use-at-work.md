---
slug: safe-use-at-work
title: Safe Use at Work
estimatedMinutes: 10
orderIndex: 3
---

# Safe Use at Work

Using AI tools at work introduces a privacy and compliance risk that most people don't think about until after something goes wrong. The risk isn't complicated. The fix isn't complicated either. You just need a clear mental model of what belongs in a public AI tool and what does not.

## The basic principle

Consumer AI tools — ChatGPT, Claude.ai, Gemini, and similar public products — run on servers managed by third-party companies. When you paste text into them, that text leaves your organization's environment.

Your IT and legal teams have spent years building walls around your company's sensitive data. A single copy-paste into the wrong tool can move confidential information outside those walls, outside your control, and potentially outside your legal compliance boundaries.

The question to ask before you paste anything is: **if this text appeared in a news story tomorrow, would I or my company have a serious problem?** If the answer is yes, it does not belong in a public AI tool.

## What never goes into a public AI tool

These categories should not be pasted into any AI tool that is not explicitly approved and configured for your organization's data:

**Customer and client data**
Names, email addresses, phone numbers, account numbers, purchase histories, support tickets, or any information that identifies a real person you serve. This is personally identifiable information (PII). In many jurisdictions, moving it to a third-party processor without proper agreements is a legal violation, not just a policy violation.

**Health information**
Medical records, insurance details, employee health conditions, or anything covered by healthcare privacy regulations. This applies whether the person in question is a customer, a patient, or a colleague.

**Financial records**
Quarterly earnings before they are public, detailed budget breakdowns, individual compensation data, or client financial details covered by a confidentiality agreement.

**Legal and contractual materials**
Privileged attorney communications, contract terms under NDA, litigation strategy, or settlement terms. Pasting these into a public tool can destroy attorney-client privilege or breach your contractual obligations.

**Source code with secrets**
Code that includes API keys, database credentials, authentication tokens, or internal service endpoints. Even if you redact the secrets themselves, pasting proprietary source code into a public tool may violate your employment agreement or open-source licensing requirements.

**HR records**
Performance reviews, disciplinary records, compensation details, hiring decisions, or anything about a specific employee's situation.

## The "if it leaked tomorrow" test

That list can feel long to memorize. In practice, a single question covers most cases:

> If this text appeared in a news article, a regulatory filing, or a competitor's hands tomorrow, would my company have a serious problem?

If yes: don't paste it. Summarize the situation in general terms, anonymize names, or use an approved internal tool.

If no: proceed, and use good judgment.

A useful corollary: if you are uncertain, the answer is no. Caution has low cost. A data breach or compliance violation has high cost.

## What about approved enterprise tools?

Many organizations have deployed AI tools specifically configured to keep your data within corporate boundaries — Microsoft Copilot connected to your Microsoft 365 tenant, a private deployment of a language model, or an enterprise contract with a provider that includes data processing agreements.

These are different. The privacy guarantees depend on the configuration, and your IT or legal team has reviewed them. Use your company's approved tools list as your guide. If you're not sure whether a tool is approved, ask before you use it with sensitive content.

This learning path cannot tell you which tools your organization has approved — that varies by company. What it can tell you is that the distinction between "approved enterprise tool" and "free public chatbot" is significant, and you should know which you are using at any given moment.

## Practical sanitization

Sometimes you genuinely need AI help with something that touches sensitive material. The right approach is sanitization: strip the sensitive elements before you paste.

If you want help drafting a difficult email to a client, remove the client's name and any identifying details. Describe the situation in general terms. "I need to tell a client their project is delayed" can be typed without any client data. The AI does not need to know who the client is to help you find the right tone.

If you want help analyzing a business problem that involves financial data, describe the structure of the problem without the actual numbers — or use made-up placeholder numbers. "Revenue was X, costs were Y, how should I think about this?" works without revealing real figures.

Most AI use cases at work can be handled with general descriptions and anonymized examples. The AI does not need the real data to be useful.

## Try this

Find a document, message, or draft that you have recently used AI to help with — or that you were about to use AI on. Read through it before pasting.

Identify anything that falls into the sensitive categories above: names of specific people, specific financial figures, client details, internal systems, or confidential project names. Practice redacting those elements and rewriting the prompt with general placeholders instead.

This is a habit worth building now, before an incident makes it urgent.
