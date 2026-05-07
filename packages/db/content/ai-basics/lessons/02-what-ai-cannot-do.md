---
slug: what-ai-cannot-do
title: What AI Cannot Do
estimatedMinutes: 9
orderIndex: 2
---

# What AI Cannot Do

Knowing where a tool falls short is just as useful as knowing what it can do. Language models come with a specific set of limitations that trip up new users again and again. None of these are obscure edge cases — they show up in ordinary work tasks every week.

## It cannot access your private data unless you provide it

This one surprises people. If you ask an AI chatbot "What did our team decide in last Tuesday's meeting?" — it has no idea. It has never seen your emails, your Slack messages, your internal documents, or your CRM. It only knows what you type into the prompt.

Some enterprise AI integrations are designed to connect a model to your internal systems — your company's knowledge base, your email, your project management tool. In those cases, the tool is explicitly pulling that context in. But the base model itself starts from zero every single conversation.

Every piece of context the model uses came from you, in that session. It cannot see your screen, your clipboard, or anything outside the chat window unless you paste it in.

## It cannot reliably do math

Language models are not calculators. They were trained on text that often includes numbers, and they learned patterns about how numbers appear in sentences. But that is not arithmetic.

For simple calculations — two plus two, ten percent of a hundred — the model will usually get it right because those patterns are extremely common. As problems get more complex, reliability drops quickly. Multi-step arithmetic, unit conversions, percentage changes, and anything involving large numbers are genuinely unreliable.

If you need a calculation, use a calculator. If a language model is returning numbers to you, treat them with extra skepticism and verify independently. The model will present an incorrect calculation with exactly the same confidence as a correct one.

## It cannot reliably produce accurate citations

Ask a language model for sources on a topic and it will produce citations — author names, journal titles, publication years, URLs. A significant fraction of those citations will be partially or entirely fabricated.

The model has learned the pattern of what a citation looks like. It knows that a scholarly citation includes an author's last name, a year, a title, and a journal. It can generate text that fits that pattern without having any memory of a real paper that matches those details.

This is called hallucination — one of the most practically dangerous failure modes because fabricated citations look exactly like real ones. If nobody checks, they get treated as real.

The fix is simple: never use a citation from an AI without clicking the link or looking up the paper yourself.

## It cannot reliably know what happened recently

Language models have a training cutoff — a date after which they have no information about events. The cutoff varies by model, but it is always in the past, sometimes by a year or more.

Ask a model about a regulation passed last quarter, a competitor's recent product launch, or current market prices, and one of two things will happen: it will tell you it doesn't know (good), or it will generate something plausible that reflects the state of the world as of its training data (dangerous, because it sounds current).

For anything time-sensitive — legal requirements, pricing, personnel changes, recent news — go to a primary source. The AI is not the right tool for current information.

## It cannot replace your judgment

Language models are draft assistants. They can produce text, structure arguments, and surface options. They cannot evaluate whether an idea is right for your specific situation, weigh competing priorities the way you understand them, or take responsibility for a decision.

The model does not know your organization's culture, your manager's preferences, the history between two departments, or the unstated constraints on a project. You do. When AI output informs a decision, a human has to own that decision — which means actually reading and evaluating the output, not rubber-stamping it.

This matters practically: if an AI-generated email goes out under your name, you are responsible for what it says. If an AI-generated analysis leads to a bad business decision, the person who acted on it without checking owns that outcome.

## It cannot guarantee privacy of what you type

When you type something into a public AI tool, that text is sent to a server operated by the company that made the tool. Depending on the tool's settings and terms of service, your input may be logged, reviewed by humans for safety or quality reasons, or used in future training.

A consumer-facing chatbot is not a private workspace. Anything you type there should be treated as potentially visible to the company operating the service. The next lesson covers the practical implications in detail.

## Try this

Pick a topic where you have access to a reliable primary source — an industry report, a government statistic, a news story from a publication you trust. Ask an AI chatbot for information about it, specifically requesting a recent number or a source.

Then check the AI's answer against your primary source. Note any discrepancy — whether in the number itself, the framing, or the citation it offered. This takes five minutes and tends to be more instructive than any description of the problem.
