---
slug: project-planning
title: 'AI-Assisted Project Planning'
estimatedMinutes: 13
orderIndex: 3
---

## Why Planning Breaks Down

Most project plans fail not because of what they include, but because of what they miss. The timeline that falls apart in week three usually fell apart because of a dependency nobody named, a stakeholder who did not know they had an input, or a risk that seemed unlikely until it was not. The plan looked complete because it covered everything the team knew to think about. It missed the things nobody thought to ask.

AI is a useful planning partner for one specific reason: it has been trained on the patterns of how projects fail across many domains and industries. When you describe your project, it can often surface the categories of risk you have not named yet — not because it knows your project, but because it recognizes the shape of your project.

## What AI Adds to Your Planning Process

Use AI to do things you cannot easily do yourself:

**Surface unknown unknowns.** You know your risks. AI can give you a second list from a different angle. Sometimes that second list has nothing new. Sometimes it has the thing that would have cost you two weeks.

**Draft project briefs.** Give AI your rough bullet points about a project — goals, scope, constraints, timeline, team — and it can draft a structured brief. This is faster than writing from scratch, and the structure forces you to notice gaps in your own thinking.

**Generate a work breakdown.** Not estimates — categories of work. Ask AI to list the major categories of work required for a project like yours. Then have your team estimate each category themselves. The categories are useful; the numbers AI would give you are not.

**Stress-test assumptions.** Tell AI your core planning assumptions and ask it to identify which ones are most likely to be wrong and why.

## The Risk-Surfacing Prompt

```
Here is a project I'm planning:

Goal: [describe the goal]
Timeline: [timeframe]
Team: [roles, rough size]
Key dependencies: [what you're relying on from others]
Known risks: [what you've already identified]

List the top 5 risks I haven't named, ranked by likelihood times impact.
For each risk, give one sentence on the mitigation.
```

Run this early — ideally before the project brief is written, not after. The goal is to catch gaps while you can still change the plan, not to document risks for the sake of documentation.

### An example of what comes back

If you describe a software migration project with a hard deadline, AI will likely surface: downstream team dependencies you have not fully mapped, the assumption that the legacy system will remain stable during parallel running, scope creep risk if stakeholders reinterpret "done," and rollback plan gaps. These are not revelations. But if even one of them is something you had not written down, the five minutes was worth it.

## Drafting a Project Brief

Most project briefs start as someone's unorganized thoughts. Here is a prompt to convert bullet points into a structured document:

```
Here are my rough notes for a project:
[paste your bullet points]

Draft a project brief with these sections:
- Objective (one sentence)
- Success criteria (3-5 measurable outcomes)
- Scope (what's in and explicitly what's out)
- Timeline with major milestones
- Team and roles
- Key dependencies and assumptions
- Risks and mitigations

Write it as a working document, not a polished presentation.
```

"Working document, not a polished presentation" is an important instruction. Without it, AI tends to produce something that reads like a corporate overview rather than a practical planning tool.

## The Estimates Problem

AI gives bad estimates. Not occasionally bad — structurally bad. AI does not know your team's velocity, your codebase complexity, your stakeholder's reliability, or the twelve small things that always take longer than expected. When AI says "this task should take 2-3 days," that number comes from pattern-matching on projects it has seen described, not from any knowledge of your situation.

The useful move is to ask AI for work categories, not time estimates:

```
For a project to [goal], list the major categories of work involved.
Do not give time estimates. Just name the categories and sub-tasks within each.
```

Then run a proper estimation session — planning poker, three-point estimation, whatever method your team uses — against those categories. AI did the decomposition work. Your team does the estimation.

## Try This

Take a project you are currently planning or about to start. Write down your known risks in a list. Then run the risk-surfacing prompt above. Compare the two lists. Note anything AI surfaced that you had not named. Then — this is the important part — bring the combined list to your next project kickoff and give your team five minutes to add to it. The conversation that follows is more valuable than either list. You have used AI to ask better questions, which is the highest-value thing you can do with it in a planning context.
