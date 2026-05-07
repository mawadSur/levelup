'use client';

import { useState } from 'react';
import { Separator } from '@levelup/ui';

const FAQS = [
  {
    q: 'How is this different from a generic AI course?',
    a: 'Generic AI courses teach broad concepts — prompting theory, model types, use-case categories. LevelUp teaches your employees how to use AI in their actual job. A support rep learns how to handle tickets faster. A finance analyst learns how to summarize P&L reports. A manager learns how to write better performance review prompts. The content is specific, and the paths are assigned based on role, not chosen by the employee from a catalog.',
  },
  {
    q: 'What about our company-specific policies?',
    a: "You upload your AI acceptable-use policy — a PDF, a Google Doc export, or plain text — and the platform's AI coach references it in every coaching session. Employees receive guidance consistent with your rules, including which tools are approved, what data cannot leave the company network, and how to handle client information. There is no generic disclaimer; the coach actually knows your policy.",
  },
  {
    q: 'Will employees actually finish this?',
    a: "Completion rates on corporate training average around 20-30%. Ours run higher because lessons are short (under 15 minutes), directly relevant to the employee's role, and followed immediately by something they can apply the next day. The AI coach creates a feedback loop that keeps engagement up. You also get manager-level visibility, so accountability is real.",
  },
  {
    q: 'Is the data we paste into the AI coach private?',
    a: "Coach sessions are stored in your organization's isolated data partition. We do not use customer inputs to train models. The sensitive-data guardrail actively detects common patterns (names, account numbers, health identifiers) before content is submitted and flags the session in your admin report. Guardrails are not a replacement for policy, but they catch the majority of accidental disclosures.",
  },
  {
    q: 'How long does the pilot take?',
    a: 'Most pilots are live within 3-5 business days. We provision your account, you invite your pilot cohort (typically 20-50 people), and the platform handles onboarding, assessments, and path assignment automatically. By week 2 you have real completion data. By week 4 you have enough to make a business case for a full rollout.',
  },
  {
    q: 'Do you offer SSO?',
    a: 'Yes, on the Enterprise plan. We support SAML 2.0 and OIDC, and SCIM provisioning for automated user lifecycle management. For smaller teams on Starter and Growth, employees sign in with a magic link sent to their work email — no password required, no new account to create.',
  },
];

interface FaqItemProps {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqItem({ q, a, isOpen, onToggle }: FaqItemProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-base font-semibold text-foreground">{q}</span>
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-muted-foreground transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 4v10M4 9h10"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      <div
        aria-hidden={!isOpen}
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: isOpen ? '500px' : '0px' }}
      >
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 sm:py-28 bg-background" id="faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Answers to the questions that come up in every pilot call.
          </p>
        </div>

        <div className="divide-y divide-border">
          {FAQS.map(({ q, a }, i) => (
            <FaqItem
              key={q}
              q={q}
              a={a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
