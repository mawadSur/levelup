'use client';

import * as React from 'react';
import { MonoLabel } from '@levelup/ui';

const FAQS = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — a real 14-day trial, no credit card required. You get the full product for up to 10 seats. After day 14 the soft caps engage (no new invites, no new admin actions) until you upgrade. Nothing is deleted; you can pick up where you left off any time.',
  },
  {
    q: 'How does annual billing save 17%?',
    a: 'On Team and Growth, the annual per-seat rate is two months cheaper than the monthly rate (e.g. Team is $12/seat monthly, $10/seat on annual). You pay the full year up front in exchange for the discount. Starter has the same structure: pay 10× the monthly rate for a full year.',
  },
  {
    q: 'Can we add seats mid-cycle?',
    a: 'Yes — from the admin dashboard, hit "invite teammate" past your cap and you\'ll be prompted to add seats. We pull the prorated charge from Stripe in real time, show you the exact dollar amount, and only commit on confirm. The new seats unlock immediately on a successful charge; the next renewal lines up at the new total.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards via Stripe Checkout. Annual contracts on Growth and Enterprise can also pay by ACH or wire with net-30 terms — talk to sales. Stripe is in test mode during your trial; on first paid checkout we flip to live.',
  },
  {
    q: 'When should we go Enterprise?',
    a: 'Enterprise (from $25k/yr) is for 500+ employees, regulated industries, or when procurement asks for a custom DPA, MSA, security review, or SOC 2 attestation evidence. Same product underneath — the difference is the contract, the SOC 2 packet, the dedicated success manager, and optional private deployment.',
  },
  {
    q: 'What happens if our headcount drops?',
    a: "You can downgrade seat count on the next renewal directly from the billing portal. Mid-cycle reductions don't refund, but the saved capacity rolls over until renewal. Switching tiers (e.g. Growth → Team) is supported any time the new tier still fits your headcount.",
  },
  {
    q: 'Do you offer SSO?',
    a: 'On Growth and Enterprise. We support SAML 2.0 and OIDC; SCIM provisioning is Enterprise-only. Smaller teams on Trial / Starter / Team sign in with a magic link — no password, no extra account.',
  },
];

export function PricingFaq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div>
      <div className="mb-12 grid gap-8 lg:grid-cols-[5fr,7fr] lg:items-end">
        <h3 className="font-serif text-display-lg text-paper-100">
          Asked on <span className="font-serif italic text-paper-300">every billing call.</span>
        </h3>
        <p className="text-body-lg text-paper-300 max-w-reading">
          What L&amp;D leads, finance teams, and IT directors want to know before signing — answered
          plainly, no marketing fog.
        </p>
      </div>

      <div className="border-y border-ink-600">
        {FAQS.map(({ q, a }, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={q} className="border-b border-ink-600 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-baseline gap-6 py-6 text-left transition-colors hover:bg-ink-800"
              >
                <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                  {String(i + 1).padStart(2, '0')}
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
        })}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <MonoLabel className="text-paper-500">END OF FAQ</MonoLabel>
        <MonoLabel className="text-paper-500">
          {String(FAQS.length).padStart(2, '0')} / {String(FAQS.length).padStart(2, '0')}
        </MonoLabel>
      </div>
    </div>
  );
}
