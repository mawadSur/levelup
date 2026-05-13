---
slug: leak-via-prompt
title: Don't paste customer data into ChatGPT
kind: scenario
estimatedMinutes: 7
characters: [sara, dev, pat]
imageMode: ai
orderIndex: 7
---

## scene-1

[narrator] Friday, 4:50pm. The office is mostly empty. Dev has the customer churn report due Monday and the spreadsheet is enormous.
[image] An open-plan office at dusk, soft amber light through the windows, an intern at a laptop with rows of customer data on screen, a senior PM walking by holding a coffee
[dev] Sara, can I just paste the customer export into ChatGPT to summarize it? I'll never finish this otherwise.
[sara] What's in the export?
[dev] Names, emails, plan tier, monthly spend, last login. Maybe ten thousand rows.

[choice]

- Sure, save us time → scene-2-bad
- Not without redacting → scene-2-good
- Let's check the policy → scene-2-policy

## scene-2-bad

[image] A laptop screen showing a chat interface mid-paste, rows of customer emails visible, a small red warning icon glowing on the browser tab
[dev] Okay, pasting now.
[narrator] Twenty minutes later. Sara is reviewing what Dev got back when Pat, the CISO, stops at the desk.
[pat] What tool did this come from?
[dev] ChatGPT. The personal plan. I needed the summary fast.
[pat] That data left our boundary the moment you hit send. Names, emails, spend tiers. We have ten thousand customers and a contractual obligation to keep their data inside approved tooling.
[sara] What's the actual exposure?
[pat] At minimum: a data-processing notice. At worst: a regulator question we can't answer well. We need to pull this thread now.

[choice]

- Own it and tell Pat what was sent → scene-3-recover
- Argue it was just a summary → scene-3-defensive

## scene-2-good

[image] Two engineers at a screen, the spreadsheet open in one window, a side panel showing a sanitised version with names replaced by Customer A, B, C
[sara] Replace the names with Customer A, B, C. Round the spend numbers. Drop the emails entirely — the model doesn't need them to spot patterns.
[dev] That feels like a lot of work right before the deadline.
[sara] Ten minutes. The summary won't be any worse for it, and we don't bet the company on a paste.
[narrator] Forty minutes later, Dev has a usable summary and a sanitised file they can keep around for next quarter.
[dev] Honestly faster than I thought. And I'll reuse this template.

[choice]

- Continue → scene-4-debrief

## scene-2-policy

[image] A laptop showing an internal wiki page titled AI Tooling Policy, with three coloured tiers and an approved tool list
[sara] Pull up the AI tooling policy. Tier-1 data — anything tied to a specific customer — only goes into approved enterprise tools. We have an enterprise Copilot tenant.
[dev] So I just run the same prompt in there?
[sara] Yes. Same prompt, approved tool, your IT team has the data-processing agreement on file.
[narrator] Dev opens the enterprise tool, drops the file in, and the summary lands in three minutes.

[choice]

- Continue → scene-4-debrief

## scene-3-recover

[image] Three people at a small whiteboard, one writing a numbered list, a printed incident-response runbook on the table
[dev] I pasted the full export. Names, emails, spend. Nothing redacted.
[pat] Thank you for the straight answer. That's the only path that ends with this not becoming worse. Here's what we do next — incident form, vendor notification, a note in the next compliance review. You're not in trouble; this is exactly the workflow the runbook is for.
[sara] And the lesson?
[dev] The deadline pressure was real, but the fix was ten minutes of sanitisation. Next time I do the ten minutes.

[choice]

- Continue → scene-4-debrief

## scene-3-defensive

[image] A tense conversation at a desk, one person pointing at a screen, body language closed, a calendar widget showing a Friday 5pm meeting
[dev] It was just a summary though. The model doesn't store it, right?
[pat] The retention policy on the personal tier is not the same as the enterprise contract. And even if zero data is retained, you've still moved customer PII to a third-party processor without an agreement. That's the contractual problem, not the model behaviour.
[narrator] The conversation ends with a longer incident form than it would have if Dev had owned it up front. Same fix, more paperwork.

[choice]

- Continue → scene-4-debrief

## scene-4-debrief

[image] Same office, Monday morning, three coffees on a desk and a fresh whiteboard with the words Three-Second Scan written at the top
[pat] So what's the takeaway you'd put on the team wiki?
[dev] Before anything is pasted into a public AI tool, three-second scan for names, numbers, and proprietary details. If any of those show up, sanitise first or use an approved tool.
[sara] And if the deadline is squeezing you?
[dev] The fix is habit, not willpower. The ten minutes always costs less than the incident.
