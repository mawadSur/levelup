---
slug: your-first-prompt-at-kapitus
title: Your First Prompt at Kapitus
estimatedMinutes: 9
orderIndex: 5
---

# Your First Prompt at Kapitus

The first four lessons were framework. This one is hands-on. We're going to walk through one realistic, end-to-end AI task at Kapitus — the kind of thing you might do tomorrow morning — and build the habits you want to carry forward.

The task: an applicant submitted a funding application three days ago. They're missing a W2. You need to send them a quick, professional follow-up email asking for it. You'd like AI help to draft a friendly, on-brand version faster than you would from scratch.

This is exactly the kind of task where AI is a strong fit. It's also a task where it's easy to do the wrong thing. We'll walk through it the right way.

## Step 0: Name the data class

Before you open any tool, name the class of the information involved.

The applicant's name: Restricted (when combined with the fact that they applied with us).
Their company name: Restricted, same reason.
The fact that we're missing a W2: Restricted (it's information about a specific applicant's file).
The general task — "follow-up email asking for a missing tax document": Public-shaped. Anyone in the industry sends emails like this.

The class question gives you the answer to the next question: where does the prompt go? If you have a Tier-A tool open, you could write the prompt with real applicant details in it. If you're using a Tier-B or Tier-C tool today, you'll use placeholders instead. We'll do the placeholder version, because it's the version that works in any tier and it's the habit you want to build.

## Step 1: Redact before you type

Open a scratch document. Write down what you actually need the email to say. Use placeholders for every Restricted piece.

```
Recipient: Applicant A (small business owner, applied 3 days ago)
Missing item: most recent W2
Tone: warm but professional, brief, action-oriented
Deadline implied: this week, so we can keep their file moving
Signature: my name and my normal sign-off
```

Notice what's missing: no real name, no business name, no application ID, no email address, no specific deal amount, no industry detail unless it's truly necessary. "Applicant A" and "small business owner" are enough for the AI to draft the email. The specifics get filled in by you, at the end, in your email client — not in the AI tool.

This is the single most important habit in this lesson. **The AI doesn't need real data to write a good email.** It needs structure, tone, and intent. Those things are not Restricted.

## Step 2: Write a clear prompt

Now compose a prompt with what you redacted. A useful prompt for a task like this has four pieces:

1. **Role/context.** Who's writing and to whom.
2. **The ask.** What the output should be.
3. **Constraints.** Tone, length, what to include or avoid.
4. **A placeholder example.** Concrete enough to anchor the model.

Here's a working version:

> I'm a relationship manager at a small-business lender. I need a brief, friendly follow-up email to an applicant ("Applicant A") who applied three days ago but hasn't sent their most recent W2 yet. Keep it under 120 words. Warm but professional tone. End with a clear, specific ask. Don't quote any financial figures or mention credit. Don't promise approval or any specific decision. Use the placeholder "[Applicant A]" wherever I'll fill in their real name. Sign off as "[Your name], Kapitus."

Read that prompt twice. Notice what's _not_ in it: no real applicant data, no deal details, nothing that would create a problem if it ended up in a third-party log. Notice also what _is_ in it: hard constraints that keep the model from generating language that could create regulatory exposure ("don't quote financial figures," "don't promise approval").

## Step 3: Read the output critically

The AI will give you a draft. Read it like a hawk before you copy it anywhere.

Things to actually check:

- **Did it invent specifics?** Sometimes the model will helpfully add an "as we discussed on our call Tuesday" — even though you said nothing about a call. Strip anything fabricated.
- **Did it slip in a promise?** "We'll get back to you with approval as soon as we have the W2" is a problem. We don't approve before underwriting.
- **Did it quote a number?** "Your $150K request" is a problem if you didn't put $150K in the prompt — and even if you did in a Tier-A tool, it's still a question whether that detail belongs in this particular email.
- **Did it strike the right tone?** Warm but not cloying. Professional but not stiff. Read it out loud; the awkward sentences will jump out.

If three or four things need fixing, that's normal. Edit. Or send a follow-up prompt: "Tighter — remove anything about a previous call, drop the second-to-last sentence, make the close more direct."

## Step 4: Fill in the real details — in your email client, not the AI tool

This is where the redacted placeholders come back to life. You're now in Outlook (or whatever you use). You paste the draft. You replace "[Applicant A]" with the real applicant's name. You add the real email address, attach anything you need to attach, and review one more time as if you were the recipient.

The real-data step happens _in our environment_, not in the AI tool. That's the whole architecture of the habit: AI helps you draft against placeholders, you hydrate the placeholders inside Kapitus systems, the regulated data never leaves our boundary.

## Habits to carry forward from day one

If you take five things from this entire path, take these:

1. **Name the class before you type.** Always. Out loud or in your head — but always.
2. **Use placeholders for anything Restricted, even in Tier-A tools when you don't need the specifics.** The fewer real details in any chat log, the better.
3. **Constrain the model in the prompt.** "Don't quote credit scores." "Don't promise outcomes." "Don't invent details." Cheap to add, expensive to skip.
4. **Read the output for inventions and slips before you act on it.** Confidence is not accuracy. We covered this in AI Basics; it matters double here.
5. **Hydrate placeholders in Kapitus systems, not in the AI tool.** Real data goes into the email at the email step, not the drafting step.

These five habits, applied consistently, will make you safe and fast on the work AI is genuinely good at. The role-specific paths (Sales, Underwriting, Servicing, Marketing, Operations) build on this same pattern with the prompts and edge cases that show up in your specific job.

## Try this

Take a real follow-up email you'd otherwise write today. Walk it through the five steps. Compare the time it took you with placeholders + AI versus the time it would have taken from scratch.

Most people find the placeholder version takes about the same time the first try, faster the second, and consistently faster after that. The habit pays compounding interest. The day you graduate from Foundations is the day this becomes routine — and from there, every path you take builds on a foundation that doesn't put you, the applicant, or Kapitus at risk.

Welcome to the Academy. Let's get to work.
