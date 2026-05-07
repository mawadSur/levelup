'use client';

import Link from 'next/link';
import { Button } from '@levelup/ui';
import { ScrollReveal } from '@/lib/motion/scroll-reveal';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';
import { scaleIn } from '@/lib/motion/variants';

export function FinalCta() {
  return (
    <section className="py-20 sm:py-28 bg-indigo-600">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Train your team in 30 days.
            <br />
            We&apos;ll prove the ROI by week&nbsp;3.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-indigo-100">
            Most organizations see measurable improvement in AI task quality within three weeks of
            launch. We can show you the before-and-after data from similar teams in your industry.
          </p>
        </ScrollReveal>

        <Stagger className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <ScrollItem variants={scaleIn}>
            <Button
              asChild
              size="lg"
              className="w-full bg-white text-indigo-700 hover:bg-indigo-50 sm:w-auto"
            >
              <Link href="mailto:hello@levelup.example">Get a demo</Link>
            </Button>
          </ScrollItem>
          <ScrollItem variants={scaleIn}>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="w-full text-white hover:bg-indigo-500 hover:text-white sm:w-auto"
            >
              <Link href="/pricing">See full pricing</Link>
            </Button>
          </ScrollItem>
        </Stagger>

        <ScrollReveal delay={0.3}>
          <p className="mt-5 text-sm text-indigo-200">
            No procurement paperwork to start a pilot. Average setup: 3 days.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
