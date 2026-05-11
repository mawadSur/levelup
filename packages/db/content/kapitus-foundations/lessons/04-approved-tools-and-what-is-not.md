---
slug: approved-tools-and-what-is-not
title: Approved Tools and What Is Not
estimatedMinutes: 8
orderIndex: 4
---

# Approved Tools and What Is Not

You've learned the data classes and the regulations. Now we map them to actual tools — what's on your laptop, what's a browser tab away, what you should and shouldn't open.

Kapitus organizes AI tools into three tiers. The tier is determined by what kind of agreement we have with the provider, what compliance reviews the tool has passed, and which data class it's been cleared to handle. The full list of tools at each tier is in the Kapitus AI policy. This lesson teaches you how to think about the tiers so you'll make the right call on day one, even when a brand-new tool shows up.

## Tier-A: Enterprise-tier AI cleared for Restricted data

**What's in it.** A very short list of tools that have been through full vendor diligence — Kapitus-approved Claude Enterprise, our internal Kapitus AI gateway, and any model we run inside our own infrastructure. These have a signed data-processing agreement, documented data-handling guarantees, audit logging on our side, and explicit clearance from Legal and Security to receive Restricted data.

**What you can do with it.** Anything within your role. NPI, credit reports, applicant files, full deal packages — Tier-A tools are designed to handle them. The data stays inside our boundary; the provider has contractually committed not to train on it; our security team can audit usage.

**What still doesn't change.** Tier-A doesn't authorize you to do ECOA-regulated decisioning with AI. The data is safe inside the tool, but the credit decision still has to be human-owned. Tier-A is about _where the data goes_, not about _what AI is allowed to decide_.

## Tier-B: Enterprise AI cleared for Confidential and Internal data

**What's in it.** Tools we've reviewed and licensed at the enterprise level, with appropriate agreements in place, but which haven't been cleared for the regulated-data tier. Examples in this category are typically things like enterprise-licensed Microsoft Copilot in our M365 tenant, an enterprise-tier ChatGPT seat managed by Kapitus IT, or an approved coding assistant for the engineering team.

**What you can do with it.** Internal and Confidential work — internal memos, deal-pipeline summaries (without applicant NPI), competitive analysis, policy drafts, internal training material, code with no embedded secrets. Anything where a leak would be a real problem but isn't covered by GLBA/FCRA as nonpublic personal information.

**What you can't do with it.** Don't paste Restricted data into a Tier-B tool. The tool isn't broken; it just hasn't been cleared for that class. The fact that it's an enterprise license doesn't override the data classification. If you're handling a credit report, a Tier-B tool is not the answer — that's Tier-A or nothing.

## Tier-C: Consumer AI cleared for Public data only

**What's in it.** Everything else. ChatGPT free, public Gemini, Claude.ai personal accounts, image generators, that new AI tool a vendor demoed on LinkedIn yesterday. These have no Kapitus agreement, no data-processing terms specific to us, and no audit trail we control.

**What you can do with it.** Public data, and only Public data. Marketing copy that's already published. Rephrasing a passage from a public blog post. Brainstorming generic ideas — "give me five hooks for a LinkedIn post about small-business resilience" — where nothing you type identifies a specific applicant, deal, or internal strategy.

**What you can't do with it.** Anything Internal, Confidential, or Restricted. No applicant data. No deal pipeline. No internal pricing. No customer names. No employee performance discussion. No strategy documents. No drafts of anything that hasn't already been published.

## The rule of thumb

When you're about to paste something and aren't sure which tier the receiving tool sits in, use this:

> If you wouldn't paste it into LinkedIn DMs, ask before pasting it into a consumer AI tool.

A consumer AI tool is roughly as private as a public social network with extra steps. The data may not literally show up on someone's feed, but it has left our boundary, it's sitting in a system we don't control, and the agreements that would normally protect it don't exist. If the content is the kind of thing you'd hesitate to message to a stranger on LinkedIn, treat the AI tool the same way.

This single test catches probably 90% of the cases people get wrong.

## A few specific patterns we see

**"It's just a draft."** People paste a sensitive draft into consumer AI to "clean it up" and figure they'll delete it after. The deletion in your chat history is not the issue. The data was sent to a third party the moment you hit enter.

**"I redacted the SSN."** Redacting one piece doesn't change the class of the document. A credit report with the SSN crossed out is still a credit report. A pipeline list with the names removed is often still identifiable from the deal sizes and dates.

**"It's a new vendor's free trial."** New vendors are the highest-risk category, not the lowest. They haven't been through diligence. Their terms of service can change overnight. The fact that something is shiny and free doesn't make it Tier-A. Run a Public-only experiment with it and bring it to your manager or IT before scaling up.

**"My personal account is fine because I'm using it on my own time."** If the work concerns Kapitus, the classification rules apply regardless of which device or account you're on. There's no personal-versus-work distinction for company data.

## When you don't know which tier a tool is

Default to **Tier-C** until you know otherwise. Treat the tool as consumer-grade. Use only Public data. Then ask IT or your manager which tier the tool is officially classified as. Five minutes of asking is cheap; five minutes of pasting and finding out it was the wrong tier is not.

## Try this

Open whatever AI tools you currently have access to — bookmarks, browser tabs, apps on your phone, anything you've signed up for. For each one, name the tier as best you can. Then check the Kapitus AI policy or ask IT for the ones you weren't sure about.

The exercise is less about getting them all right today and more about building the habit of asking the tier question before you paste — every time, without fail, until it's automatic.
