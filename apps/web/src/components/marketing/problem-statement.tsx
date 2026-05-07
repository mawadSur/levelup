'use client';

import { Card, CardContent } from '@levelup/ui';
import { ScrollReveal } from '@/lib/motion/scroll-reveal';
import { Stagger, ScrollItem } from '@/lib/motion/stagger';

const STATS = [
  {
    stat: '73%',
    label: 'of employees use AI tools at work every week.',
    detail:
      'From draft emails to data summaries, AI has already entered the workflow — with or without HR approval.',
  },
  {
    stat: '12%',
    label: 'have ever received any structured AI training.',
    detail:
      'Most learned by trial and error, copying prompts from Reddit, or watching a YouTube video once.',
  },
  {
    stat: '0%',
    label: 'of leaders know which 12% those are.',
    detail:
      'There is no visibility into who is using AI well, who is guessing, and who is quietly pasting customer data into public models.',
  },
];

export function ProblemStatement() {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your team is already using AI.
            <br />
            Most of them are guessing.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The gap between AI enthusiasm and AI capability is real — and it is growing. Here is
            what the numbers actually say.
          </p>
        </ScrollReveal>

        <Stagger className="grid gap-6 sm:grid-cols-3">
          {STATS.map(({ stat, label, detail }) => (
            <ScrollItem key={stat}>
              <Card className="relative overflow-hidden">
                <CardContent className="pt-8 pb-8 px-8">
                  <p className="text-5xl font-bold tracking-tight text-indigo-600 mb-3">{stat}</p>
                  <p className="text-base font-semibold text-foreground mb-2">{label}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </CardContent>
              </Card>
            </ScrollItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
