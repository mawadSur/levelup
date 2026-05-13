---
slug: final-judgment-call
title: The five-minute judgment call
kind: scenario
estimatedMinutes: 7
characters: [sara, dev, pat]
imageMode: ai
orderIndex: 75
---

## scene-1

[narrator] Monday, 8:52am. Coffee not yet finished. A message from the VP of Sales lands in Dev's inbox: "Need a one-pager on our retention pitch for the Acme renewal by 10. Use the AI to help — but make it good."
[image] A laptop on a wooden desk in early-morning light, an open inbox showing a single highlighted message marked URGENT, a half-full mug of coffee, the corner of a sticky note that reads ACME 10AM
[dev] Sara — I have one hour and no draft. I'm going to use the AI to do this. What's the first thing I do?

[choice]

- Just paste the Acme account file in and ask for a one-pager → scene-2-shortcut
- Sanitize the file first, then ask for a structured draft → scene-2-careful
- Stop and check whether AI is even the right tool here → scene-2-pause

## scene-2-shortcut

[image] A laptop screen showing an open AI chat with rows of customer names, contract values and emails visible mid-paste, a small warning triangle glowing on the browser tab
[dev] Okay — pasting the Acme file now. Names, contract dates, current contract value, the renewal proposal numbers, contact emails. Then I'll ask for a one-pager.
[narrator] Sara sees the screen.
[sara] Stop. What's in that file?
[dev] I know, I know. But it's faster.
[sara] It is until it isn't. What's the worst that happens?

[choice]

- Argue: "Nothing — I trust the tool" → scene-3-incident
- Stop the paste and try again → scene-2-careful

## scene-2-careful

[image] A clean desk with two windows open side by side, the left showing a spreadsheet with customer names visible, the right showing the same spreadsheet sanitized — names replaced with Customer A, B, C and contract values rounded
[sara] Three steps. One: open the Acme file. Two: replace the name, the email, and the contact list with placeholders. Three: round any sensitive numbers and drop anything that isn't load-bearing for the pitch.
[dev] That's five minutes.
[sara] It's five minutes today and zero minutes from now on, because you'll have the template.
[narrator] Dev sanitizes the file. The shape of the deal is still all there — tier, term length, the rough renewal delta, the three reasons the customer pushed back. Just no names, no emails, no exact numbers.

[choice]

- Now write a prompt with role, format, and constraints → scene-3-prompt
- Just type "write me a one-pager" — the structure is clear enough → scene-3-vague

## scene-2-pause

[image] Two people standing at a whiteboard with three columns drawn — labelled DRAFT, ANALYZE, DECIDE — and a single blue marker resting on the ledge
[sara] Good instinct. What's the actual task?
[dev] A one-pager pitching renewal. The audience is the VP. The risk is sounding generic.
[sara] So which part can the AI do, and which part can't it?
[dev] It can draft the structure. It can rewrite my notes into clean prose. It can't tell me why Acme specifically should renew — I have to know that.
[sara] Right. AI is the draft engine. You're still the source of facts. Now go sanitize the file and write a real prompt.

[choice]

- Continue → scene-3-prompt

## scene-3-prompt

[image] A laptop screen showing a long, structured prompt with four labelled sections — Role, Task, Format, Constraints — and below it a draft one-pager beginning with the line This renewal turns on three specific reasons
[narrator] Dev writes the prompt out loud. Role: head of account success drafting for the VP of Sales. Task: a one-pager pitching renewal for a Gold-tier customer who pushed back on a price increase. Format: three sections — what changed, why it's worth it, what we'll do differently. Length: under 250 words. Constraints: no filler phrases, no invented statistics, plain language.
[dev] First draft is solid. Three sections, real arguments, no filler. I'll edit in the actual numbers.
[sara] And before you send?

[choice]

- Read it once for sign-off and check any factual claim → scene-4-debrief
- Just forward it — looks good → scene-3-skim

## scene-3-vague

[image] A laptop screen showing a generic four-paragraph corporate email with phrases like leverage, in today's landscape, and moving forward highlighted in red
[narrator] Dev types: "Write me a one-pager pitching renewal for our Gold customer." Four seconds later, four paragraphs of perfectly grammatical, perfectly empty corporate prose.
[dev] It's saying the same thing four ways. "We remain committed to leveraging the partnership moving forward."
[sara] What does that mean?
[dev] Nothing. It means nothing.
[sara] So what's missing from the prompt?

[choice]

- Add role, format, and constraints and try again → scene-3-prompt

## scene-3-incident

[image] A small huddle around a screen, three people standing, one writing on a printed incident-response runbook, an open laptop displaying a CHAT LOG header with rows of pasted customer data
[narrator] Twenty minutes later, Pat the CISO is at the desk.
[pat] What tool did this come from?
[dev] The public chatbot. I had an hour.
[pat] Customer names, emails, contract values left our boundary the moment you hit send. We have a data-processing notice to file, a regulator question we may need to answer, and a longer paperwork day than the one-pager would have cost.
[dev] So what do I do now?
[pat] You own it. You walk me through exactly what was pasted, we file the incident, and we update the runbook so the next person on a 10am deadline knows to sanitize first. You're not in trouble. This is what the workflow is for.
[sara] And the lesson?
[dev] The five minutes never actually costs five minutes. It costs the alternative.

[choice]

- Continue → scene-4-debrief

## scene-3-skim

[image] An email draft on screen, the cursor hovering over the SEND button, a second laptop tab showing a fact-check window open mid-search
[narrator] Dev's hand is on the send button. Then he stops.
[dev] Wait. The draft cites a stat about renewal rates being up 18% across the industry. Where did that come from?
[sara] You didn't give it that number. So where did it come from?
[dev] The model. It made it up. It sounded right and I almost sent it.
[sara] If the VP had quoted that number to the board…
[dev] Yeah. That's a problem I'd own forever.

[choice]

- Strip the invented stat and replace it with what I actually know → scene-4-debrief

## scene-4-debrief

[image] Three people at a small whiteboard with the words FIVE-MINUTE JUDGMENT CALL written across the top and a numbered list below — 1 Sanitize, 2 Be specific, 3 Don't invent facts, 4 Sign with your name
[pat] So if you put this on the team wiki — what's the rule?
[dev] Four checks before I hit send. One: did I sanitize what went in? Two: did the prompt actually specify role, format, constraints? Three: did the model invent any number it shouldn't have? Four: would I sign my name to every claim in the output?
[sara] How long does that take?
[dev] About a minute, once it's a habit.
[pat] And how long does the alternative take?
[dev] Anywhere from an hour of paperwork to a regulator question I can't answer well.
[sara] Welcome to AI fluency. The judgment is the job.
