import Link from 'next/link';
import { Button, GridLines, MonoLabel } from '@levelup/ui';

export function GovernanceHero() {
  return (
    <section className="relative grain overflow-hidden border-b border-ink-600 bg-ink-900">
      <GridLines />

      <div className="relative mx-auto max-w-content px-6 pb-24 pt-20 sm:pt-28 lg:px-8 lg:pb-32 lg:pt-36">
        <div className="mb-12 flex items-baseline gap-4 animate-mission-in">
          <MonoLabel className="text-paper-500">MISSION BRIEF · AI GOVERNANCE</MonoLabel>
          <span className="h-px flex-1 max-w-[12rem] bg-ink-500" aria-hidden />
          <MonoLabel tone="signal">FOR CISOS · FOR BOARDS</MonoLabel>
        </div>

        <div className="max-w-[60rem] animate-mission-in delay-75">
          <h1 className="font-serif text-display-xl italic text-paper-100">
            Stop guessing what AI your employees are using.
          </h1>

          <p className="mt-8 max-w-reading text-body-lg text-paper-300">
            LevelUp captures every AI prompt, classifies the sensitive ones in real time, and trains
            the people who triggered them — without surveilling individuals. Your auditor gets a
            quarterly evidence binder. Your finance lead gets one line in the budget instead of
            five.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button asChild variant="primary" size="lg">
              <Link href="/sign-up?intent=governance">REQUEST CISO BRIEFING →</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="/governance/sample-report.pdf" target="_blank" rel="noreferrer noopener">
                VIEW SAMPLE REPORT →
              </a>
            </Button>
          </div>

          <p className="mt-6 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            DEPLOYABLE IN 30 DAYS · NO AGENTS · NO PROXY
          </p>
        </div>
      </div>
    </section>
  );
}
