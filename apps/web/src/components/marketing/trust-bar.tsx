'use client';

import { ScrollReveal } from '@/lib/motion/scroll-reveal';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';

const LOGOS = ['Acme Co', 'Northwind', 'Riverstone Health', 'Cohort Capital', 'Helix Insurance'];

export function TrustBar() {
  return (
    <section className="border-y border-border bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Built for HR, IT, and L&D teams at
          </p>
        </ScrollReveal>
        <Stagger className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {LOGOS.map((name) => (
            <ScrollItem key={name}>
              <span className="font-semibold text-lg tracking-tight text-muted-foreground/60 transition-colors duration-200 hover:text-muted-foreground">
                {name}
              </span>
            </ScrollItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
