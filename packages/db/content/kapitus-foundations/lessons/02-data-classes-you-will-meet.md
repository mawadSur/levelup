---
slug: data-classes-you-will-meet
title: Data Classes You Will Meet
estimatedMinutes: 9
orderIndex: 2
---

# Data Classes You Will Meet

Every piece of information you handle at Kapitus belongs to one of four classes. The Kapitus AI policy uses these names: **Public, Internal, Confidential, Restricted.** Each class has different rules about where it can go, who can see it, and which AI tools — if any — can touch it.

You don't need to memorize the policy. You need to recognize the class on sight. By the end of this lesson, when you look at a document, an email, or a paragraph on your screen, you should be able to name the class out loud in under three seconds.

## Public

**Definition.** Information we have already published or are happy to publish. If a competitor read it on the front page of the Wall Street Journal tomorrow, no one at Kapitus would flinch.

**Real Kapitus examples:**

- Marketing copy from kapitus.com
- A published press release about a new product
- Our headquarters address
- A loan officer's listed phone number in their email signature
- Public regulatory filings

**AI rule of thumb.** You can paste Public data into almost any AI tool — including consumer ChatGPT, Gemini, Claude.ai. There is no privacy risk because the data is already, by definition, public.

The trap: people assume more things are public than actually are. A draft of a press release is _not_ public until it's released. A rate-sheet template you saw on a competitor's website is public; the version with our negotiated rates filled in is not.

## Internal

**Definition.** Information meant for Kapitus employees but not externally sensitive. Wouldn't be a news story if it leaked, but it's nobody else's business.

**Real Kapitus examples:**

- The org chart and reporting structure
- The PTO policy
- A holiday schedule
- A list of internal Slack channels
- A how-to guide for the expense system
- A team offsite agenda

**AI rule of thumb.** Internal data should stay in approved Kapitus tools (Tier-A or Tier-B; we cover these in lesson 4). Don't paste it into a free consumer chatbot — not because a leak would be catastrophic, but because once it's in a third-party log, you've lost control of it, and we don't have a data-processing agreement that says otherwise.

If you genuinely need AI help with Internal information and only have access to a consumer tool, generalize: ask "how do most companies structure a PTO request flow?" rather than pasting our actual policy.

## Confidential

**Definition.** Information that would create real harm to Kapitus if it left the company — competitive harm, financial harm, reputational harm, or strategic harm. Not regulated PII, but commercially sensitive.

**Real Kapitus examples:**

- An internal pricing memo: what rate floors we've set, what concessions we're authorizing
- The deal pipeline — who's in conversation with whom, deal sizes, expected close dates
- An unreleased product roadmap
- A draft acquisition discussion document
- A competitor analysis with our market-share estimates
- Performance review notes about a colleague
- Compensation bands for a role we're hiring for

**AI rule of thumb.** Confidential data goes only into Tier-A or Tier-B approved tools — never into consumer AI. The default assumption is "this would help a competitor." Even if you trust the AI provider, the same content is now sitting in a system outside our control.

The most common mistake: pasting a deal-pipeline spreadsheet into ChatGPT to ask "summarize this for my Monday meeting." Don't. Summarize it yourself, or use a Kapitus-approved tool that's wired up to keep your data inside our boundary.

## Restricted

**Definition.** Information that is regulated. If we mishandle it, we get fined, sued, or both. This is the class where Kapitus's legal obligations are non-negotiable.

**Real Kapitus examples — these are all Restricted:**

- An applicant's Social Security Number
- Date of birth + name combinations that identify a real person
- Bank account numbers, routing numbers, voided checks
- Credit reports and credit scores from a bureau
- Tax returns, W2s, 1099s, P&Ls submitted by an applicant
- Driver's license images
- Anything covered by GLBA's definition of "nonpublic personal information" (NPI)
- Customer-by-name servicing data: who is delinquent, who restructured, who defaulted

**AI rule of thumb.** Restricted data goes only into a tool that has been explicitly cleared for Restricted data — currently that's a very short list at Kapitus, and it's listed in the policy. Do not paste Restricted data into any tool unless you can name, on the spot, the specific approved tool and the specific use case. If you're guessing, the answer is no.

The trap: thinking redaction is good enough for a consumer tool. "I'll just black out the SSN" is not a defense. Once the data has been sent to a third party, the regulator does not care about your good intentions; they care about whether the information left the secured boundary.

## A decision tree you can re-use

When you're staring at something and don't know what class it is, walk this in your head:

1. **Could a stranger read this on Kapitus's website right now?** If yes → Public. Move on.
2. **Does it identify a real applicant, customer, or third party by name + any financial or credit detail?** If yes → Restricted. Stop. Approved-for-Restricted tools only.
3. **Would a competitor pay money to read this?** If yes → Confidential. Tier-A or Tier-B only.
4. **Otherwise** → Internal. Tier-A or Tier-B only.

When a single document mixes classes — say, an internal sales report that names individual applicants — the whole document inherits the highest class in it. A document with one SSN is a Restricted document, even if the other 99% is Public.

## Try this

Pick three real items off your desktop, your inbox, and a Kapitus tab you have open right now. For each one, name the class. Then ask yourself: have I been treating it that way?

This is the muscle the rest of the Academy builds on. If you can't name the class quickly, the rest of the rules don't help you.
