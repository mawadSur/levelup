'use client';

import { useState } from 'react';
import { MonoLabel, NumberedSection } from '@levelup/ui';

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
  numeral: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqItem({ q, a, numeral, isOpen, onToggle }: FaqItemProps) {
  return (
    <div className="border-b border-ink-600 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-baseline gap-6 py-6 text-left transition-colors hover:bg-ink-800"
        aria-expanded={isOpen}
      >
        <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          {numeral}
        </span>
        <span className="flex-1 text-body-lg text-paper-100">{q}</span>
        <span
          aria-hidden
          className={`shrink-0 font-mono text-2xl leading-none text-signal transition-transform duration-200 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      <div
        aria-hidden={!isOpen}
        className="overflow-hidden transition-all duration-200 ease-mission"
        style={{ maxHeight: isOpen ? '600px' : '0px' }}
      >
        <p className="max-w-reading pb-6 pl-12 text-body-sm text-paper-300">{a}</p>
      </div>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div id="faq" className="border-b border-ink-600 bg-ink-900 py-24 lg:py-32">
      <div className="mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="VI." eyebrow="THE QUESTIONS">
          <div className="mb-14 grid gap-8 lg:grid-cols-[5fr,7fr] lg:items-end">
            <h2 className="font-serif text-display-lg text-paper-100">
              Asked in <em className="italic text-paper-300">every pilot call.</em>
            </h2>
            <p className="text-body-lg text-paper-300">
              The six questions we hear most from L&D leaders, IT directors, and HR Ops. Plain
              answers, no marketing fog.
            </p>
          </div>

          <div className="border-y border-ink-600">
            {FAQS.map(({ q, a }, i) => (
              <FaqItem
                key={q}
                q={q}
                a={a}
                numeral={String(i + 1).padStart(2, '0')}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <MonoLabel className="text-paper-500">END OF FAQ</MonoLabel>
            <MonoLabel className="text-paper-500">06 / 06</MonoLabel>
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
