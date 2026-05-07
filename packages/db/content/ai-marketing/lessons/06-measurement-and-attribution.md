---
slug: measurement-and-attribution
title: 'Measurement and Attribution with AI'
estimatedMinutes: 15
orderIndex: 6
---

## What AI Is Bad At Here (and Why You Should Know)

Attribution is one of the most contested problems in marketing. If you have ever been in a meeting where the CMO and the CFO are looking at completely different numbers for what marketing contributed to revenue, you know that attribution is hard even when humans do it carefully with full data access.

AI makes this worse if misused. Give a model a vague prompt about marketing performance and it will produce confident-sounding attribution percentages and pipeline contribution estimates that have no relationship to your actual data. They look like analysis. They are the shape of analysis without the substance.

The rule: AI cannot calculate what you have not given it. Do not ask it what your marketing ROI was, because it will tell you something plausible and wrong.

## What AI Is Good At Here

AI is useful for two things in the measurement workflow: turning data you have already pulled into narrative executives can act on, and generating hypotheses for what to test next.

Both matter. Most marketing teams produce data that sits unread — dashboards requiring interpretation skills no one has time to develop, weekly reports that describe what happened without guiding what to do next. AI can close that gap, not by doing the math, but by helping you communicate the math in a way that moves decisions.

## The Executive Update Prompt

```
Given this data table: {paste your sanitized data — no full revenue figures, no individual customer records}

Write a 3-paragraph update for an executive who has 90 seconds to read this.

- Paragraph 1: The single most important thing that moved this week — what was it, and what drove it
- Paragraph 2: The result that most disappointed — what happened and the most plausible explanation
- Paragraph 3: The one experiment to run next week and the specific hypothesis it would test

Voice: plain English, no marketing jargon, one claim per sentence. State the number and the direction, not "we saw strong performance."
```

Read the output and edit for accuracy before sending. AI will fill narrative gaps with its best inference, and inference in a CFO-bound performance update is a problem. Every claim needs a number you can cite.

On data safety: do not paste full revenue numbers, individual customer records, or pipeline data that could identify accounts into a public model. Sanitize first — aggregated figures, no company names, no specific deal values. Or use only the AI tools your company has approved for financial data.

## Hypothesis Generation

The second strong use case is post-campaign hypothesis generation. You have results. You have theories about why things went the way they did. AI can help you structure those theories into testable hypotheses and identify the ones worth prioritizing.

```
Our email campaign to {audience segment description} produced these results: {summarized metrics — e.g., open rate, click rate, conversion rate, compared to baseline}

The two variants we tested: {describe}
The result: {which won and by how much}

Generate 5 hypotheses for why the winning variant outperformed. For each:
- State the hypothesis in one sentence (if X, then Y, because Z)
- Describe the minimal test that would confirm or disprove it
- Rate the cost of running that test: low, medium, or high
```

This output is a working list for what to investigate next, not a definitive answer about what happened. Share it with your team and filter for the hypotheses that match what your intuition already says is true. When AI's hypothesis matches your gut, you have a candidate worth testing quickly.

## Turning Noise Into Signal

AI is useful for the preliminary step of identifying what is signal and what is noise in a large reporting week:

```
Here is a list of {number} metrics from this week's marketing performance report: {paste the list}

Identify:
- The 3 metrics that represent meaningful movement worth discussing in a leadership meeting
- The metrics that likely represent noise (normal variance, small sample, or seasonality)
- Any pattern across channels that appears consistent and worth naming

Base your assessment only on the data provided. Do not infer metrics I have not included.
```

The last instruction matters. Without it, AI fills gaps with invented data. With it, you get a triage that respects the limits of what you have actually measured.

## The Weekly Narrative Workflow

These three prompts give you a practical weekly workflow: pull your data, sanitize it, triage for signal, run the executive update, then generate next-week hypotheses. Total AI time: 20 minutes. The output is typically clearer than what most marketing teams produce in two hours.

The work that remains yours: checking every number before it goes out, deciding which hypothesis to test, and having the conversation about what the measurement framework is not capturing.

## Try This

Take this week's marketing metrics. Paste a sanitized version — no full revenue figures, no identifiable customer data — into the executive update prompt above. Compare the output to what you would have written in the same time. Identify where AI's framing is cleaner, and where it missed nuance you need to add back. The blend of both is usually the best draft. Send that version, not the raw output.
