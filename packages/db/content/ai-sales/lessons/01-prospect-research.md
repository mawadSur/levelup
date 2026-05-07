---
slug: prospect-research
title: 'AI-Powered Prospect Research'
estimatedMinutes: 15
orderIndex: 1
---

## Why Research Still Wins Deals

You already know that cold outreach without context is noise. The rep who shows up knowing about last quarter's missed earnings, the VP who just left, or the product launch that flopped — that rep gets the meeting. The problem has never been whether research matters. The problem is time. A thorough pre-call research job used to take 45 minutes per account. With AI, you can do it in 10, and get deeper coverage than most reps ever bother with.

This lesson is about building that workflow — not handing your research over to AI, but using AI to process public information faster so you can show up with genuine insight.

## What to Look For: Trigger Events

The best reason to reach out is a trigger. Something changed at the account. Change creates need, urgency, and a natural conversation opener. Train yourself to hunt for:

- **Hiring signals:** A company posting for a VP of Revenue Operations is probably building out a stack. A flurry of SDR postings means they are scaling outbound. Job boards are public data AI can help you parse fast.
- **Funding rounds:** Series B means they have budget but are under pressure to show growth. Late-stage rounds mean procurement scrutiny. Crunchbase, TechCrunch, and LinkedIn all publish this.
- **Leadership changes:** A new CRO, CMO, or CFO almost always re-evaluates existing vendors. They want to put their stamp on the stack. This is a window.
- **News mentions:** Product recalls, regulatory fines, earnings calls, acquisitions — these create pressure points your product might solve.
- **Earnings call language:** Public companies publish transcripts. When an exec says "we need to improve sales productivity" on an earnings call, that is a quoted buying signal.

## Building an ICP Scorecard from Public Data

If your ICP is "mid-market SaaS companies in the US, 200-1,000 employees, revenue-driven growth stage," you can score accounts against that profile using only public sources: LinkedIn for headcount and growth rate, Crunchbase for funding history, their website for product category and pricing tier, and review sites like G2 for tech stack clues.

A prompt to accelerate this:

```
I'm a B2B sales rep selling [your product category] to [ICP description].
Here is a LinkedIn company summary and recent news snippet for [company name]:

[paste public text here]

Score this company 1-10 against my ICP. List the top 3 reasons it fits or does not fit.
Flag any trigger events worth mentioning in outreach.
```

This does not replace your judgment. It processes information fast so you can spend your time on accounts that score 7 or above.

## The Data Safety Rule

Before you paste anything into an AI tool, ask one question: **Is this information public?**

If you are working from a LinkedIn page, a press release, or a 10-K filing — that is public. You can use a general-purpose AI model.

If you are looking at your CRM — deal amounts, contact email addresses, internal notes your AE wrote after a discovery call — that is private. It belongs to your company and possibly to your customer under a contract. Do not paste private CRM data into ChatGPT, Claude.ai, or any public model. Use only the AI tools your company has approved for internal data.

This is not bureaucracy. A deal note that contains a prospect's budget ceiling or a competitive reference is sensitive. One paste into the wrong tool can become a liability. The rule is simple: public data goes anywhere approved, private data stays in approved internal tools.

## Summarizing Complex Documents

Annual reports, 10-K filings, earnings transcripts, and long press releases are dense. Here is a prompt pattern that extracts exactly what a sales rep needs:

```
Summarize this 10-K excerpt for a B2B sales rep selling revenue intelligence software.
Focus on: stated growth priorities, named technology investments, risks they are trying to
mitigate, and any language about sales team efficiency or pipeline visibility.
Keep the summary to 5 bullet points.

[paste the excerpt]
```

Adjust the product category in the prompt to your actual solution. The model will filter for what is relevant to you, rather than summarizing the whole document equally.

## Building Your Pre-Call Profile

A good pre-call prospect profile has five components:

1. **Company state** — growth stage, recent news, strategic priorities
2. **Contact background** — role tenure, previous companies, any public content they have published
3. **Likely pain** — inferred from their industry, their job postings, their public statements
4. **Relevant trigger** — the specific reason you are reaching out now
5. **Conversation opener** — one question that shows you did your homework

AI can help you assemble all five from public sources in a single prompt if you feed it the right inputs.

```
I'm preparing for a discovery call with [name], [title] at [company].
Here is their LinkedIn summary, one article they wrote, and a recent company press release:

[paste content]

Give me:
- 3 sentences on the company's current strategic context
- 2 things this person likely cares about in their role
- 1 trigger event I could reference
- 2 discovery questions I have not seen in generic sales scripts
```

## Try This

Pick one account you plan to reach out to this week. Using only public sources (LinkedIn, company website, Crunchbase, Google News), spend 10 minutes collecting raw information. Then feed that raw information into AI using the prompts above and generate a five-component pre-call profile. Compare what you got to what you would have written on your own in the same 10 minutes. Note what AI caught that you would have missed — and what it got wrong that you need to correct.

That correction step is not a failure of the tool. It is you applying judgment, which is what your buyer is paying for.
