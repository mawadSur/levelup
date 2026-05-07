---
slug: tone-improvement
title: Improving Tone with AI
estimatedMinutes: 9
orderIndex: 2
---

# Improving Tone with AI

Getting the words right is only half of support writing. The other half is getting the feeling right. A technically correct reply sent in the wrong tone can leave a customer angrier than no reply at all. AI can help you calibrate tone — but only if you know what you are calibrating toward.

## The two failure modes

Most tone problems in support fall into one of two categories.

**Too formal.** This is the default failure. It happens when replies lean on passive voice, legal-sounding hedges, and corporate phrases that no human being would actually say to another human being. "Please be advised that your inquiry has been escalated to the relevant department for further review" is technically informative and emotionally cold. The customer reads it and feels like they are dealing with a process, not a person.

**Too breezy.** This failure is less common but more damaging when the stakes are high. A casual, upbeat reply to a customer who has lost data, been overcharged, or had a critical feature fail during an important deadline reads as dismissive. "Sounds like a bummer! Let's get this sorted!" is the kind of response that ends up in a screenshot.

Neither failure is about intent. Most agents write overly formal replies because they believe formal means professional. Most agents write too casually because they are trying to seem warm. Both instincts are correct; the execution just needs calibration.

## Match the customer's register

The clearest heuristic is also the simplest: match the level of formality the customer brought to you.

A customer who writes in full sentences, uses punctuation correctly, and addresses you formally is signaling that they expect a professional exchange. They are not looking for warmth — they are looking for competence and precision.

A customer who writes casually, uses contractions, and skips punctuation is signaling a more conversational register. A stiff, formal reply will feel like a form letter to them.

Matching does not mean mirroring exactly. If a customer is angry and uses short, clipped sentences, you do not write back in short clipped sentences. You match their register but not their mood. Stay calm, stay direct, and stay at approximately their length and vocabulary level.

## The tone rewrite prompt

When you have a draft that does not feel right, this prompt gets AI to fix it:

> Rewrite this draft for a customer who is {emotion} about {situation}. Keep it short. Remove corporate phrases like "I appreciate your patience," "kindly note," "please be advised," and "I hope this helps." Do not add filler at the end. Here is the draft: [paste draft]

Specifics on the emotion matter. "Frustrated" produces a different result than "panicked" or "disappointed." Think about what the customer is actually feeling based on what they wrote, not just what the category of problem suggests.

You can also give AI a comparison point. "Rewrite this so it sounds like a competent person talking directly to a colleague they respect" is a useful framing when the draft is too formal. "Rewrite this so it is still warm but more direct and serious" works when a draft is too casual for a high-stakes situation.

## The read-aloud test

Before you send any reply, read it aloud. Not in your head — out loud, at normal speaking speed.

If you would not say those words to a friend who was having the same problem, rewrite the sentence. This is a reliable filter for corporate jargon. Nobody says "please be advised" in conversation. Nobody says "I hope this finds you well" to someone who is upset. These phrases exist in writing because they feel professional on paper, and the read-aloud test strips that illusion away in about two seconds.

Apply the test to AI-revised drafts as well. The model knows which phrases to remove because you told it to, but it may replace them with different phrases that are equally hollow. "I completely understand your frustration" is only slightly better than "I appreciate your patience." If you would not say it without cringing, take it out.

## A note on empathy phrases

AI overuses pre-packaged empathy: "I completely understand," "I hear you," "that sounds really frustrating." These phrases land better when they are specific. Compare:

- "I completely understand your frustration."
- "Three days without access to an account you use every day is genuinely disruptive — I understand why you want this resolved today."

The second version proves you read the ticket. AI can produce it if you give enough detail in your prompt. Without detail, it defaults to the first.

## Try this

Go back to your last three sent replies. Read each one aloud. For each one, note:

1. Any phrase you would not say to a friend
2. Whether the tone matches the register of the customer's first message
3. Whether the empathy, if any, is general or specific

Now paste each reply into AI with the rewrite prompt. Ask it to fix the issues you identified. Compare the before and after. The goal is not to feel bad about the originals — it is to build a mental library of what the gap between "functional" and "good" looks like in your own writing.
