---
slug: vague-prompt-rewrite
title: From "Write me an email" to a useful prompt
kind: scenario
estimatedMinutes: 6
characters: [sara, dev]
imageMode: ai
orderIndex: 8
---

## scene-1

[narrator] Tuesday morning. Dev is staring at an empty draft window. The board update goes out at noon.
[image] A focused workspace, laptop on a wooden desk, a half-finished mug of coffee, a sticky note that reads BOARD UPDATE NOON
[dev] I'm just going to ask ChatGPT to write the board update for me. It'll be faster.
[sara] What are you about to type into it?
[dev] "Write me an email to the board about Q1."

[choice]

- That should work, send it → scene-2-vague
- Wait, let's add detail first → scene-2-detailed

## scene-2-vague

[image] A laptop screen showing a generic AI-written corporate email with phrases like in today's landscape and moving forward highlighted in red
[narrator] Dev hits send. Four seconds later, the model returns a polished, generic, four-paragraph email that says approximately nothing.
[dev] It's grammatically perfect but… there's no actual information in it.
[sara] Read me a sentence.
[dev] "As we move forward into Q2, we remain committed to leveraging emerging opportunities while delivering on our key strategic priorities."
[sara] What does that mean?
[dev] Nothing. It means nothing.

[choice]

- Try again with more context → scene-2-detailed

## scene-2-detailed

[image] Two people at a whiteboard, one writing four labelled columns: Role, Task, Format, Constraints
[sara] Four pieces of context every useful prompt needs. Role, task, format, constraints. Let's do them out loud.
[dev] Role — I'm a head of product writing to the board.
[sara] Task?
[dev] Quarterly update covering shipped work, key metrics, and what changes in Q2.
[sara] Format?
[dev] Email. Under three hundred words. Three sections with headers.
[sara] Constraints?
[dev] Numbers only where I provide them. No filler phrases like leveraging or in today's landscape. Plain language.

[choice]

- Type that as the new prompt → scene-3-better
- Add the actual metrics too → scene-3-best

## scene-3-better

[image] A screen showing a much longer prompt with four distinct sections highlighted, and below it a draft email starting with This quarter we shipped
[narrator] The model returns a focused three-section email. Cleaner structure, fewer filler phrases. But the metrics it cites are invented — placeholder numbers the model guessed at.
[dev] Wait, where did "twelve point three percent" come from?
[sara] You didn't give it the real numbers, so it hallucinated some. The structure is good. The facts are made up.
[dev] So now I either edit those in by hand, or…

[choice]

- Edit the numbers in by hand → scene-4-debrief
- Re-prompt with the real metrics → scene-3-best

## scene-3-best

[image] A polished email draft on screen, three short paragraphs, real numbers visible, no corporate filler phrases, a hand reaching for the send button
[narrator] Dev pastes the prompt with the real metrics included as bullet points. The model returns a three-paragraph email that uses Dev's numbers, in Dev's plain-language style.
[dev] One pass, no hallucinated numbers, took ninety seconds.
[sara] And you'll still read it once before sending.
[dev] Obviously. But the editing pass is editing, not rescuing.

[choice]

- Continue → scene-4-debrief

## scene-4-debrief

[image] A laptop closed on the desk, a small notebook open showing the four labels Role, Task, Format, Constraints written by hand
[sara] Takeaway?
[dev] Vague in, vague out. Every minute I spend front-loading context saves me ten minutes of editing later.
[sara] And the four things to specify…
[dev] Role, task, format, constraints. And if I'm asking for anything that involves numbers, I provide the numbers — I don't let the model guess them.
