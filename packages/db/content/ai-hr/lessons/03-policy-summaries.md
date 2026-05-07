---
slug: policy-summaries
title: Policy Summaries
estimatedMinutes: 9
orderIndex: 3
---

# Policy Summaries

HR policies are written for legal defensibility. That is legitimate — policies need to hold up under scrutiny, and the language that makes them legally sound is often the language that makes them incomprehensible to employees. The result is a document most people never read, a help desk ticket every time something comes up, and confusion at exactly the moments when clarity matters most.

AI can bridge that gap. It is one of the more reliable things language models do: take dense, structured text and render it in plain language. But there are specific failure modes you need to know before you deploy it.

## What AI does well here

A 12-page leave policy becomes a 200-word employee-facing summary. A compensation philosophy document becomes a set of clear bullets about how decisions get made. A handbook update becomes a short announcement employees might actually read.

AI is good at this because it has processed enormous amounts of this kind of writing — legal text, policy documents, plain-language rewrites — and learned the patterns well. The task of extracting structure and reformatting it for a different audience is squarely in its wheelhouse.

**Prompt pattern:**

> "Summarize this policy for an employee who has never read it before. 200 words maximum. Use three sections with H2 headings: 'In short' (2-3 sentences on what this policy covers), 'What this means for you' (3-4 bullets on the practical implications), 'When to ask HR' (2-3 bullets on the situations that require a conversation rather than a policy lookup). Keep all specific dollar amounts, dates, deadlines, and named contacts exactly as they appear in the original."

The last instruction — preserve verbatim specifics — is critical. AI will sometimes round numbers, paraphrase dates, or silently drop contacts in the interest of readability. Those are exactly the details an employee will rely on when they actually need the policy.

## What AI does not do well here

**Jurisdiction-specific nuance.** A leave policy that is legally compliant in California is not necessarily compliant in Texas, and neither may be compliant outside the US. AI does not know which version applies to which employees, and it may smooth over jurisdictional differences in ways that create legal risk. Any AI-assisted policy summary needs a legal sign-off before it goes to employees.

**Exception handling.** Policies have exceptions — situations where normal rules do not apply, where manager discretion is involved, or where an employee's specific circumstances require individualized judgment. AI summaries tend to present the general rule without clearly flagging the exception structure. If your policy has material exception language, make sure it survives the summary, even if you have to add it back manually.

**Recent changes.** AI does not know what has changed in your policy since its training data was compiled. More practically, it does not know what changed in your company's policy this year. If you are summarizing an updated document, verify the AI draft reflects the current version, not a cached version of something older.

## Sensitive data: what stays out of the prompt

This is the most important guardrail in this lesson. Never paste a policy document that contains any of the following into a public AI tool:

- Employee names or identifiers
- Individual salary or compensation figures
- Grievance details, investigation notes, or disciplinary records
- Accommodation requests or medical information
- Any document that was generated in the context of a specific employee situation

The test is simple: could someone read this document and identify a specific employee? If yes, it does not go into a public model. Policy documents that are truly generic — the general parental leave policy, the expense reimbursement policy, the code of conduct — are generally fine. Anything that started as a template and was then customized to a specific situation is not.

## The review step you cannot skip

The workflow is: you draft the summary with AI, then a human with legal context reviews it before publication. This is not optional. The human review is not looking for whether the summary reads well — it almost always will. It is looking for:

- Anything the summary omits that an employee would need to know to act correctly
- Anything the summary implies that the policy does not actually say
- Whether the jurisdiction-specific version of this policy differs in material ways from the version you gave the AI

Build this into your process as a single step, not an afterthought. A quick email to your employment counsel with the summary attached takes less time than managing the confusion that results from a misunderstood policy.

## Try this

Take the most recent policy document you have had to explain to employees multiple times — the one that keeps generating the same question in different forms. Run the summary prompt on it. Then forward the AI draft to whoever on your legal or compliance team reviews policy language. Note their edits.

You are building two things from this exercise: a ready-to-use employee-facing summary, and a sense of where AI summaries drift from what employees actually need to know. That calibration will make you faster and more precise the next time.
