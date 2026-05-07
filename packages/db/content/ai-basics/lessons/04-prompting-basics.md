---
slug: prompting-basics
title: Prompting Basics
estimatedMinutes: 9
orderIndex: 4
---

# Prompting Basics

The quality of what you get from an AI tool is almost entirely determined by the quality of what you ask for. A vague prompt produces vague output. A specific, well-structured prompt produces output that is actually useful. This lesson covers the practical mechanics of writing better prompts.

## Why specificity matters

A language model has no context about you, your role, your organization, or your intent. When you write "write me an email about the meeting," the model has to fill in a dozen blanks: What kind of meeting? Who is the recipient? What tone? How long? The choices it makes are generic, based on training data patterns rather than your situation. The output feels written for nobody in particular — because, from the model's perspective, it was.

Every piece of context you add eliminates an assumption the model would otherwise make on its own.

## The four things every useful prompt specifies

### 1. Role or perspective

Tell the model who it is writing as or advising. This shapes tone, vocabulary, and assumptions.

Instead of: "Explain data privacy."
Try: "You are explaining data privacy to a new employee who has no technical background."

Instead of: "Write a project update."
Try: "You are a project manager writing an update to a senior executive who cares about budget and timeline, not technical details."

### 2. Format and length

Specify what the output should look like. Should it be bullet points or prose? A numbered list or a memo? How long?

Without format guidance, the model defaults to something — often a medium-length prose response. That may or may not match what you need.

"Summarize this in three bullet points, each one sentence."
"Write this as a formal memo, under 200 words."
"Give me five options as a numbered list, no explanation needed."

### 3. Audience and tone

Who will read the output? How formal should it be? What prior knowledge can it assume?

"For a non-technical audience."
"For a manager who is skeptical about this project."
"Use plain language, no jargon."
"Formal but not stiff."

### 4. The actual task

This sounds obvious, but many prompts are vague about what "done" looks like. "Help me with my presentation" could mean a dozen things. "Write three possible opening sentences for a presentation about our Q1 results, aimed at the sales team" is concrete and actionable.

## Give an example

One of the most effective things you can do in a prompt is include an example of the output you want. This is called one-shot or few-shot prompting, and it works because the model can pattern-match on your example rather than making up what "good" looks like.

If you want subject lines for marketing emails, include one you like: "Here's the style: 'Three things we learned from 10,000 support tickets.' Give me five more in that style."

If you want meeting notes in a specific format, paste a previous set you liked and say "Format the following transcript to match this structure."

## Iterate — the first answer is rarely the best

Think of prompting as a conversation, not a one-shot transaction. The first response is a starting point. If it doesn't hit the mark, you have several options:

- **Correct what's wrong:** "That's too formal. Rewrite in a casual tone."
- **Add a constraint:** "Keep the same content but cut it by half."
- **Change the direction:** "Ignore that. Instead, lead with the business impact."
- **Ask for alternatives:** "Give me three other versions, each with a different emphasis."

Most people who are disappointed by AI output tried once, didn't like it, and stopped. Most people who get value from AI tools try the first response, react to it, and refine. The second or third version is usually significantly better.

## The CRISPE pattern

A structured framework for prompts that need to accomplish something complex:

- **Capacity/Role:** Who is the AI acting as? "You are a senior HR manager..."
- **Request/Insight:** What context does it need? "...writing for employees who are unfamiliar with the new policy..."
- **Statement:** What should it produce? "...a one-page FAQ that explains the new expense reimbursement policy..."
- **Personality:** What tone or style? "...in a warm, clear, non-bureaucratic voice..."
- **Experiment:** Any constraint or variation? "...give me two versions: one for employees, one for managers."

You don't need to use the CRISPE label. The value is in the structure: a prompt that covers these five elements will almost always outperform one that covers only one or two.

## A note on length

Longer is not always better. A prompt that is a wall of instructions can confuse the model. If you have fifteen specific requirements, the model is likely to drop several. Prioritize: decide what matters most and lead with that. If you have truly complex requirements, break the task into steps — one prompt per step — rather than one enormous prompt.

## Try this

Take a prompt you have used recently, or write one you need today. Start with your original version. Then rewrite it twice:

- First rewrite: add the role, audience, and format explicitly.
- Second rewrite: add an example of the output you want, or apply the CRISPE structure.

Run all three versions. Compare the outputs side by side. The differences are almost always instructive — and the exercise builds an instinct for what specificity actually buys you.
