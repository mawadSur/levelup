'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

const FAQS = [
  {
    q: 'What’s the time commitment?',
    a: 'Most employees finish the AI Basics path in about two weeks with 20 minutes a day. Role-specific paths (sales, underwriting, support, HR, managers) layer on after that and are about the same. Lessons are short — you can do one on a coffee break.',
  },
  {
    q: 'Can I get certified?',
    a: 'Yes. Every learning path ends in a quiz and a signed certificate that lands in your profile. Your manager gets notified automatically; the certificate is a valid HR-file artifact.',
  },
  {
    q: 'Will my manager see my progress?',
    a: 'Yes — your direct manager can see your completion and quiz scores. They cannot see your individual coach prompts. The governance dashboard aggregates AI usage at the department level only.',
  },
  {
    q: 'What happens to my training data?',
    a: 'Your coach prompts and quiz answers stay in the Kapitus tenant. The sensitive-data classifier runs locally on every coach message and logs only that a trigger fired — never the content. Nothing leaves Kapitus.',
  },
  {
    q: 'I don’t see my role in the catalog — what do I do?',
    a: 'Start with AI Basics — every Kapitus employee takes that one. After your baseline assessment, the system recommends the role-specific path that fits best. If something’s still missing, ping your L&D contact.',
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
    <section id="faq" className="scroll-mt-20 border-b border-kp-rule bg-kp-paper py-20 lg:py-24">
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <p className="kp-eyebrow text-kp-purple">FAQ</p>
            <h2 className="kp-h1 mt-3 text-kp-ink">Questions Kapitus employees ask first.</h2>
            <p className="kp-body mt-5 text-kp-ink-soft">
              Plain answers about time commitment, certification, privacy, and what your manager can
              see.
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
