---
slug: bias-and-fair-lending
title: Bias and Fair Lending
estimatedMinutes: 13
orderIndex: 4
---

# Bias and Fair Lending

This is the lesson where the stakes get real. The previous three lessons described tools that save you time. This one describes the way those same tools can put you, your team, and Kapitus on the wrong side of federal law. Read it twice.

## Why AI has bias

A language model is trained on text written by humans. Human writing carries the biases of the people, institutions, and historical periods that produced it. The model does not have intentions, but it has absorbed patterns — patterns about which neighborhoods get described which way, which surnames go with which assumptions, which industries get characterized as "risky," which kinds of small businesses get the benefit of the doubt and which kinds get the skeptical adjective.

When you ask a model to "sharpen" or "tighten" or "make more decisive" a piece of credit-related text, it does not consult a fair-lending compliance manual. It draws on the patterns in its training data. Some of those patterns are illegal to act on in a lending context.

The relevant statutes for underwriters: the **Equal Credit Opportunity Act (ECOA, Regulation B)**, the **Fair Credit Reporting Act (FCRA)**, and the **Fair Housing Act**. Together they prohibit discrimination on the basis of race, color, religion, national origin, sex, marital status, age, receipt of public assistance, and exercise of consumer credit rights. They also impose strict requirements on adverse action notices: what they say, how specific the reasons must be, and how quickly they must go out.

Every applicant-facing artifact you draft — counter-offer language, decline letter, condition request, information request — falls under those rules. If AI helped you draft it, the rules still apply. The model is not a defense.

## The "make it more decisive" trap

Here is a concrete failure mode that you, personally, are likely to hit if you are not careful.

You have made a decline. You write a first-draft decline letter. The reason for declination is a debt-service-coverage shortfall — clean, quantitative, defensible. You paste the draft into the AI Coach and write:

> Make this decline letter sound more decisive and confident.

The model returns a polished version. It is shorter. It is firmer. It is — read closely now — also subtly different. Among the changes:

- "Insufficient cash flow given current obligations" becomes "the applicant's profile does not align with our credit standards."
- A specific dollar figure for the debt-service gap got dropped because "the language is cleaner without it."
- A reference to the time-in-business factor that was a contributing reason got de-emphasized.
- The phrasing around the principal's industry shifted from neutral to mildly characterizing.

Each of those changes, on its own, looks like stylistic improvement. Collectively, they have done four illegal or near-illegal things:

1. **Vague reason.** ECOA requires a specific principal reason for adverse action. "Does not align with our credit standards" is not specific. The original wording — DSCR shortfall with a number — was.
2. **Dropped specificity.** A regulator reviewing the file cannot tell from the polished version what actually drove the decline.
3. **De-prioritized factors.** If time-in-business was a real contributing reason, it has to be disclosed. The polished version implies cash flow was the sole driver.
4. **Industry characterization.** Any language that could be read as making assumptions about a class of business or class of applicant is a fair-lending red flag, regardless of whether you meant it.

The model did not know any of this. It was making the prose sharper, which is what you asked for. The harm is real anyway.

## The fair-lending review

For any applicant-facing artifact that AI touched, run this checklist before it goes out:

**Specificity of reasons.** If this is an adverse action notice, does it state the principal reason(s) in specific terms a regulator could verify against the file? Vague generalities — "credit standards," "underwriting criteria," "risk profile" — are not principal reasons.

**Numbers preserved.** If a quantitative factor drove the decision, is the quantitative factor still in the letter? AI loves to round, generalize, or quietly drop figures it perceives as "in the weeds."

**Tone is neutral about the applicant.** Read the letter from the perspective of the applicant's lawyer. Is there any phrase that characterizes the applicant, their business, their industry, their neighborhood, their family arrangement, their age, their accent on the call you remember from intake? If yes, rewrite that phrase before sending.

**No prohibited basis leaks in.** Does the letter say anything about age, marital status, national origin, public assistance income, or anything else in the protected-class list? If yes — even apparently neutrally — it should not be in the letter unless it is a legally required disclosure.

**The reasons in the letter match the reasons in the file.** This is the audit-trail check. The memo says A and B drove the decline. Does the letter say A and B? Or has AI silently rewritten history?

**You can defend every sentence as your own work.** You signed it. The model did not. If a sentence is in there because the model put it there and you did not actively review it, take it out.

This is not a long review. On a one-paragraph decline letter, it takes 90 seconds. It is the cheapest insurance Kapitus has against the most expensive class of regulatory action it can face.

## Beyond decline letters

The fair-lending review applies to every applicant-facing piece of writing, not just decline letters.

**Counter-offers.** A counter at lower amount, shorter term, or higher rate is an adverse action under ECOA. Same rules.

**Information requests.** If you ask one applicant for documentation you do not ask other comparable applicants for, that is a fair-lending issue regardless of whether AI helped draft the request.

**Pricing memos.** Anything in a memo that influences pricing and that could be characterized as not strictly tied to risk is in scope.

**Internal memos that quote applicant communications.** If you paste an applicant's email into an AI prompt and ask for a summary, watch what the model decides is worth keeping. Sometimes it preserves an offhand comment about a family situation or an immigration timeline that has no business in your credit file.

## Process expectations

A few specific Kapitus expectations on top of the federal floor:

- **AI Coach logs every prompt.** Compliance can pull your interactions. This is a protective control for you — if you used AI responsibly, the log shows it. Do not work around it.
- **Decline letters get a second-pair-of-eyes review on the fair-lending checklist above** if AI touched the text. This is a workflow standard, not an optional courtesy.
- **No protected-class data goes into the AI prompt, ever.** Not age, not marital status, not national origin, not anything you might have inferred from the conversation with the broker. The model does not need it and you do not want it in the log.
- **Disparate impact is a real category.** A pattern of AI-drafted decline letters that, in aggregate, treat one class of applicant differently from another is a violation even if no individual letter would be. The audit team monitors aggregate patterns. Your job is to make the individual letters defensible.

## Try this

Take a decline letter you drafted recently. Run it through the AI Coach with the prompt "make this more decisive." Read the rewrite carefully.

For every change the model made — every word swap, every dropped phrase, every restructuring — ask: would I be comfortable defending this change in a regulator's office? Mark the ones you would not. Count them.

Then write down what you would say to a junior underwriter who wanted to use that "sharper" version of the letter. Saying it out loud (or in writing) is how the lesson sticks. The next time you reach for "make this more decisive," the warning will fire automatically.
