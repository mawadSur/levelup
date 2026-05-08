'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

const FAQS = [
  {
    q: 'How does LevelUp handle GLBA-protected data?',
    a: 'We never see your customer data. The sensitive-data classifier runs in-browser on the prompt the employee is about to send; we log only that a trigger fired, in which department, against which policy section. The actual prompt content stays with you.',
  },
  {
    q: 'Can our compliance team see real-time AI usage?',
    a: 'Yes. The /admin/governance dashboard shows department-level risk scores, sensitive-data trigger feed (redacted), and policy-coverage matrix, updated within 60 seconds of activity.',
  },
  {
    q: 'Will employees feel surveilled?',
    a: 'No. We deliberately aggregate to the department level by default. Individual prompts are never shown to managers. Triggered events redact the prompt content to the first 60 characters.',
  },
  {
    q: 'What’s the integration with our existing tools?',
    a: 'LevelUp runs as a SaaS — no agent install, no browser extension, no SSO requirement at pilot. We integrate with Slack and Microsoft Teams for managers’ weekly digests. SAML SSO available on Growth tier.',
  },
  {
    q: 'What’s the 30-day pilot?',
    a: 'Pilot 25 seats free for 30 days. Full product, full data export. If you continue, the first three months are 50% off.',
  },
];

interface ItemProps {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqItem({ q, a, isOpen, onToggle }: ItemProps) {
  return (
    <div className="border-b border-kp-rule last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-kp-ink"
        aria-expanded={isOpen}
      >
        <span className="kp-body-lg font-medium text-kp-ink">{q}</span>
        <span
          className={`shrink-0 text-kp-purple transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
          aria-hidden
        >
          <Plus className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </button>
      <div
        aria-hidden={!isOpen}
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: isOpen ? '600px' : '0px' }}
      >
        <p className="kp-body max-w-kp-reading pb-6 text-kp-ink-soft">{a}</p>
      </div>
    </div>
  );
}

export function KapitusFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="scroll-mt-20 border-b border-kp-rule bg-kp-paper py-20 lg:py-24"
    >
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <p className="kp-eyebrow text-kp-purple">FAQ</p>
            <h2 className="kp-h1 mt-3 text-kp-ink">
              Questions Kapitus leaders ask first.
            </h2>
            <p className="kp-body mt-5 text-kp-ink-soft">
              Plain answers, written for L&amp;D and compliance leaders &mdash;
              not for marketing.
            </p>
          </div>

          <div className="border-t border-kp-rule">
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
