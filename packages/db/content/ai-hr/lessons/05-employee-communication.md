---
slug: employee-communication
title: Employee Communication
estimatedMinutes: 10
orderIndex: 5
---

# Employee Communication

HR communications carry more weight than most. An email about a policy change lands differently than a marketing announcement. A message to an employee about a performance conversation, a leave request, or an organizational restructure has real consequences for how that person feels about their job, their manager, and the company. Getting the tone wrong is not a minor editing issue — it erodes trust, sometimes irreversibly.

AI can help here, but differently from the other lessons in this path. For most HR work, AI generates a first draft. For sensitive employee communications, AI is most useful as a second-pass reviewer after you have written the first draft yourself.

## The "cold HR voice" problem

HR communications written without AI often have a different but equally damaging problem: they sound like legal disclaimers. Passive voice, hedged language, excessive formality, and phrases that prioritize the organization's position over the employee's experience.

"Please be advised that your request has been received and is currently under review by the appropriate team" means "we got your email." Nobody wants to receive the first version. The second version is what you would say if the employee were sitting across from you.

AI is useful for warming up cold corporate language — it has processed enough human writing to understand the difference between formal-but-direct and formal-but-evasive. You can give it a draft and ask it to flag what sounds off.

**Prompt pattern:**

> "Review this draft message to an employee about [situation]. Flag anything that sounds: corporate and impersonal, evasive about what is actually happening, paternalistic in tone, or legally cautious in a way that reduces trust. For each flag, suggest a specific edit — not just that it is a problem, but what to say instead."

This prompt works well on the kind of HR communications that get written and then re-written five times because they never feel quite right. AI can articulate why a sentence is not landing in a way that makes the fix obvious.

## The warning on AI-generated comms that nobody talks about enough

There is a tell in AI-written text that experienced readers recognize immediately. The phrases appear across every tool, regardless of what you prompted: "I hope this message finds you well," "please do not hesitate to reach out," "we are reaching out to connect," "kindly note," "as per our previous discussion," "going forward."

These phrases are not wrong. They are worse than wrong — they signal that no human thought about this communication. When an employee receives a message from HR about something that matters to them and it opens with "I hope this finds you well," they register, consciously or not, that the message was not written for them. That is a trust cost.

Read every AI-assisted communication for these patterns before it goes out. They will be there.

## Hard rules for sensitive topics

Some communications require a different standard entirely. These include:

- Reduction-in-force notifications and role eliminations
- Performance improvement plans and formal disciplinary actions
- Communications related to employee illness, bereavement, or personal crisis
- Anything involving a workplace investigation
- Terminations

For any of these, the rule is: you write the first draft. AI does not generate the opening. The first draft needs to come from a human perspective grounded in the specific situation and relationship. AI would produce something that reads fine — but fine is not the bar when someone's job or livelihood is involved.

Once you have written that draft, AI can review it for tone — but only with all identifying information replaced with placeholders.

**Prompt pattern for sensitive review:**

> "Review this draft message. I have replaced the employee's name with [EMPLOYEE] and the manager's name with [MANAGER]. The situation is [describe it generically, no identifying details]. Flag anything that sounds evasive, coldly bureaucratic, or that might feel like the company is protecting itself at the employee's expense. Suggest specific edits."

Note what is not in that prompt: no real names, no identifying details, no case-specific information. This is the only version of this prompt that is appropriate for a public AI model.

## Protecting privacy in communication drafting

The standard that applies everywhere in HR applies doubly here: real employee names, identifiers, medical information, performance ratings, and anything that connects to a specific employment situation never goes into a public AI tool. Anonymize all content before pasting, and do not describe a situation in enough detail that a reader could identify who it is about.

If your company has an approved internal AI tool with appropriate data agreements, that is where case-specific drafting happens. The instinct to give AI more context so it can help more is understandable — but in HR communications, that instinct puts employee data at risk.

## Try this

Take three recent HR communications you sent — things like policy announcements, responses to employee inquiries, or general team updates. Nothing sensitive — no real employee-specific content. Paste them one at a time into the "flag what's cold or evasive" prompt.

Read each set of flags carefully. You are looking for your own patterns: the phrases you reach for that AI identifies as distancing, the hedge language you stopped noticing. Most people find one or two recurring tells. The goal is to see them clearly enough that you catch them before AI has to.
