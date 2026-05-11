import Link from 'next/link';
import { Check } from 'lucide-react';
import { kRoutes } from './routes';

const INCLUDED = [
  'Governance dashboard included',
  'Quarterly evidence reports included',
  'SOC 2 attestation support included',
  'Custom DPA available',
  '30-day pilot at 50% off',
];

export function KapitusPricing() {
  return (
    <section id="pricing" className="border-b border-kp-rule bg-kp-mist py-20 lg:py-24">
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-purple">Pricing</p>
          <h2 className="kp-h1 mt-3 text-kp-ink">What it costs.</h2>
          <p className="kp-body-lg mt-5 text-kp-ink-soft">
            Plain numbers, no procurement labyrinth. Pricing scales with seats, not features &mdash;
            every customer gets the full product.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-kp-lg border border-kp-rule bg-kp-paper shadow-kp-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-kp-rule p-8 lg:border-b-0 lg:border-r lg:p-10">
              <p className="kp-eyebrow text-kp-purple">Standard tier</p>
              <p className="kp-h2 mt-3 text-kp-ink">100-seat team</p>
              <p
                className="mt-6 font-bold tabular-nums text-kp-ink"
                style={{ fontSize: '3rem', lineHeight: 1 }}
              >
                $25,000<span className="kp-body-lg text-kp-ink-mute">/year</span>
              </p>
              <p className="kp-body mt-4 text-kp-ink-soft">
                Starts at <span className="kp-data text-kp-ink">$25,000</span> annually for a
                100-seat team. Volume discounts kick in at 250 and 500 seats. Talk to us for a
                precise quote.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="mailto:hello@ailevel.app?subject=Kapitus%20engagement"
                  className="inline-flex items-center justify-center rounded-kp-sm bg-kp-purple-deep px-6 py-3 text-base font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple"
                >
                  Talk To A Specialist
                </Link>
                <Link
                  href={kRoutes.signUp}
                  className="inline-flex items-center justify-center rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-6 py-3 text-base font-medium text-kp-ink transition-colors duration-200 ease-kp-out hover:bg-kp-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple"
                >
                  Start The 30-Day Pilot
                </Link>
              </div>
            </div>

            <div className="bg-kp-cream p-8 lg:p-10">
              <p className="kp-eyebrow text-kp-purple">What&rsquo;s included</p>
              <ul className="mt-5 space-y-4">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-kp-pill bg-kp-success text-white">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span className="kp-body text-kp-ink">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
