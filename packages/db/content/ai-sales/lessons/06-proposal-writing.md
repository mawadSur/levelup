---
slug: proposal-writing
title: 'Proposal Writing with AI'
estimatedMinutes: 14
orderIndex: 6
---

## The Proposal That Wins and the One That Does Not

Most sales proposals fail not because the product is wrong but because the proposal is written for the wrong audience. It leads with features instead of the customer's situation. It buries the business case. It uses pricing as a reveal instead of a confirmation. The person who receives it has to do too much work to understand why it matters to them.

AI will not fix a weak discovery process. If you do not know your customer's stated goals, their constraints, and the business impact of solving their problem, no amount of AI scaffolding will produce a proposal that converts. What AI can do is help you take what you learned in discovery and structure it into a proposal that communicates clearly and professionally — fast.

## The Structure That Persuades

A strong proposal follows a narrative logic, not a product catalog logic:

1. **Situation** — here is what we heard when we talked to you. What you are dealing with, in your language.
2. **Desired outcome** — here is what you told us success looks like. Specific and measurable where possible.
3. **Approach** — here is how we would address your situation to reach that outcome.
4. **Why us** — the specific capabilities or experiences that make us the right choice for this situation (not a generic "why us" section).
5. **Next step** — one clear action with a timeline. Not "let us know if you have questions."

This structure matters because it mirrors the way a buyer evaluates a purchase: does this vendor understand my situation, do they have a credible path to my goal, and do they have the evidence to back it up?

## The Proposal Outline Prompt

This prompt generates a working outline from your discovery notes:

```
Draft a proposal outline for [customer company name or description].

Their stated goal: [e.g., reduce sales cycle length by 20% before end of Q3]
Their constraint: [e.g., limited IT bandwidth for implementation, CFO scrutiny on new SaaS spend]
Named stakeholders: [e.g., VP of Sales is champion, CFO is economic buyer]
We sell: [1-sentence product description]

Format as 5 sections (Situation, Desired Outcome, Approach, Why Us, Next Step)
with 3-4 bullet placeholders in each section. Do not fill in pricing.
Write the section headers and bullet prompts in language that reflects the customer's
stated priorities, not generic sales language.
```

The output is a skeleton, not a finished proposal. Each bullet placeholder is a prompt for you to fill in with specific information from your discovery. That specificity is what makes the proposal feel written for them rather than from a template.

## Pricing: Where AI Stops

Hard numbers do not come from AI. Pricing, discounting, and contract terms come from your approved pricing templates, your deal desk, and your manager. This is not a limitation of the tool — it is a business process that exists for good reasons: margin protection, contract consistency, and legal defensibility.

When you use AI to draft proposal language, leave pricing sections blank or use a placeholder like [PRICING — INSERT FROM APPROVED TEMPLATE]. Then populate pricing from your official sources before the document leaves your hands.

If you ask AI to generate pricing language, you will get plausible-sounding numbers that may have no relationship to your actual pricing. In a live deal, that can create problems ranging from awkward corrections to contractual exposure. The rule is simple: AI drafts the words, your pricing tools provide the numbers.

## Writing the Situation Section

The situation section is where most proposals either earn or lose the reader's attention. If it reads like a generic "many companies in your industry face challenges with..." opener, the reader knows it is a template. If it reflects back specifically what they told you, they keep reading.

```
Write the "Situation" section of a proposal for [customer description].
Use the following information from our discovery calls:
- Their current process: [description]
- The specific problem they described: [quote or close paraphrase from your notes]
- The business impact they mentioned: [e.g., "losing 2 deals per quarter to faster competitors"]
- The trigger that made this a priority now: [e.g., "new VP wants wins in first 90 days"]

Write 3-4 sentences in the second person ("you") that reflect their situation back to them
accurately and empathetically. No product mentions in this section.
```

When your prospect reads a situation section that quotes their own words back at them in a coherent framing, they feel understood. That emotional response sets the tone for the rest of the proposal.

## Adapting to the Economic Buyer

If your proposal is going to a CFO, a COO, or another economic buyer who was not in your discovery calls, the framing needs to shift. A VP of Sales cares about deal velocity and rep productivity. A CFO cares about cost per acquired customer, payback period, and risk.

```
I have a proposal written for a VP of Sales. The CFO will also review it before the
deal is approved. Rewrite the "Desired Outcome" and "Why Us" sections using language
that a CFO would find credible. Focus on: ROI framing, implementation risk reduction,
and measurable business outcomes. Keep it under 200 words combined.

Original sections: [paste your existing sections]
```

This kind of quick translation from champion language to executive language can make the difference between a proposal that advances and one that stalls in approvals.

## Turning a Discovery Document into a Proposal

If you captured thorough notes after discovery, this prompt can turn them into a full proposal outline in one pass:

```
Turn this discovery summary into a 1-page proposal outline.
Use the 5-section structure: Situation, Desired Outcome, Approach, Why Us, Next Step.
Do not invent information — if something is not in the discovery notes, leave a [TBD] placeholder.
Do not include pricing.

Discovery notes:
[paste your sanitized discovery notes]
```

The [TBD] placeholders tell you exactly where your discovery has gaps. That is valuable information: it tells you what to ask in the next call before you send the proposal.

## Try This

Take a current active deal where you have completed at least one discovery call. Pull your discovery notes (sanitize if needed before pasting into a public model). Run the proposal outline prompt above. Look at the [TBD] placeholders that appear in the output — those are the gaps in your discovery. Schedule a 10-minute follow-up call or send a two-question email to fill them in. Then complete the proposal outline with real information. Compare the result to the last proposal you sent and assess which one would land better with your buyer.
