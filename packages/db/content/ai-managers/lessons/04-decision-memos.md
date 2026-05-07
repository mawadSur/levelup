---
slug: decision-memos
title: 'AI for Decision Memos'
estimatedMinutes: 13
orderIndex: 4
---

## Why Decisions Deserve a Document

Most management decisions happen in meetings or hallway conversations — and get re-litigated six months later because nobody remembers what was actually decided or why. "We already talked about this" is not a useful response when the other person does not remember the same conversation.

A decision memo answers: what were the options, what did we choose, why, and what would change our mind? That last part is the one most people skip, and it is the most valuable.

AI is useful in two specific ways: generating a structured first draft from your notes, and helping you stress-test your reasoning before you commit.

## The Structure of a Decision Memo

A decision memo does not need to be long. One page is ideal. Five sections:

**Context** — What situation prompted this decision? Two to three sentences. If you cannot explain the context briefly, the decision probably has not been clearly framed yet.

**Options considered** — What were the realistic alternatives? Include the option you did not choose, with enough description that someone who was not in the room can understand why it was a real contender.

**Decision** — What did you choose? State it plainly.

**Rationale** — Why this option over the others? Be specific. "Best value for the business" is not a rationale. "We chose A over B because A can be reversed if Q3 results miss, and B commits us to a 12-month contract" is a rationale.

**Reversal trigger** — What would have to be true for you to revisit this decision? Name it now, while you are clear-headed, before the choice has become part of your identity.

## The Pre-Mortem Prompt

The most useful AI prompt in this entire course is the pre-mortem. Run it before you finalize any significant decision:

```
I am about to make this decision: [describe the decision clearly].

Assume it is 6 months from now and this decision has failed badly.
Give me 5 plausible reasons why it failed, ranked from most to least likely.
Be specific — not generic risks, but failure modes that apply to this particular decision.
```

The value here is not that AI can predict the future. It is that asking "how does this fail?" forces a specific kind of thinking that "does this seem right?" does not. You will recognize some of the failure modes immediately because they are things you were trying not to think about. That discomfort is the point.

A pre-mortem is not a reason to avoid making decisions. It is a way to make decisions with your eyes open and to design in safeguards for the most likely failure modes.

## Steelmanning the Option You Rejected

When you have already decided — or when you are leaning hard in one direction — run this prompt before you close out the decision:

```
I am choosing between option A and option B. I am leaning toward A.

Steelman option B as if you are the strongest possible advocate for it.
What is the best possible case for B?
What evidence or conditions would make B clearly the right choice?
What is A's most significant weakness that B avoids?
```

This is uncomfortable by design. If you read the steelman and still feel confident in option A, you have stress-tested your position. If the steelman makes you genuinely uncertain, that is important information. Either you need more time, or you need to change your decision.

Senior managers with good track records do this instinctively. AI gives you a fast way to replicate it even when nobody in the room is willing to push back on the direction you are signaling.

## Drafting the Memo from Your Notes

Once you have done the thinking, use AI to handle the writing:

```
I've made a decision and want to document it.

Here are my rough notes:
[paste your bullet points — options considered, reasons, constraints, what you decided]

Draft a decision memo with these sections:
Context | Options Considered | Decision | Rationale | Reversal Trigger

Keep it to one page. Write it like a working document, direct and specific.
Do not add padding. Do not make it sound like a corporate press release.
```

Read the draft and rewrite any rationale that does not actually match your reasoning. AI will sometimes produce a rationale that sounds good but does not accurately represent what you were actually weighing. Fix those sentences — they are the most important part of the document.

## Try This

Pick a decision you are currently navigating — something live, not historical. Write down your rough notes: the options you have considered, what you are leaning toward, and why. Run the pre-mortem prompt. Run the steelman prompt on the option you are not choosing. Then draft the decision memo.

The reversal trigger is the section most people want to skip. Do not. If you cannot name what would change your mind, you may not have actually decided based on reasoning — you may have decided based on preference and are constructing rationale after the fact. Writing the trigger while you are still clear-headed is the most honest part of the exercise. At the end you should be able to tell someone clearly what you decided, why, and what would change your mind — or you should know that you need more time.
