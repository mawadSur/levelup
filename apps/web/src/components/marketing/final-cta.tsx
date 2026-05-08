import Link from 'next/link';
import { Button, GridLines, MonoLabel, NumberedSection } from '@levelup/ui';

export function FinalCta() {
  return (
    <div className="relative overflow-hidden border-b border-ink-600 bg-ink-900 py-24 lg:py-32">
      <GridLines dense />

      <div className="relative mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="VII." eyebrow="THE NEXT STEP">
          <div className="grid gap-12 lg:grid-cols-[7fr,5fr] lg:items-end">
            <div>
              <h2 className="font-serif text-display-xl text-paper-100">
                Train your team in <em className="italic text-signal">thirty</em> days.
                <br />
                Prove the ROI by week three.
              </h2>
              <p className="mt-8 max-w-reading text-body-lg text-paper-300">
                Most organizations see measurable improvement in AI task quality within three weeks
                of launch. We can show you the before-and-after data from similar teams in your
                industry.
              </p>
            </div>

            <div className="rounded-md border border-ink-600 bg-ink-800 p-8">
              <MonoLabel tone="signal" className="mb-6 block">
                READY TO ENROLL
              </MonoLabel>
              <div className="space-y-3">
                <Button asChild variant="primary" size="lg" className="w-full">
                  <Link href="/sign-up">REQUEST DEMO →</Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="w-full">
                  <Link href="/pricing">SEE FULL PRICING</Link>
                </Button>
              </div>
              <div className="mt-6 space-y-2 border-t border-ink-600 pt-5">
                <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                  · NO PROCUREMENT TO START A PILOT
                </p>
                <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                  · AVERAGE SETUP: 3 DAYS
                </p>
                <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                  · 14-DAY TRIAL · CANCEL ANY TIME
                </p>
              </div>
            </div>
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
