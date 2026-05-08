import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button, Card, CardContent } from '@levelup/ui';

export const metadata: Metadata = {
  title: 'Start your AI baseline',
};

export default function AssessmentStartPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="mb-5 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal/15 text-signal dark:bg-ink-800/50 dark:text-signal">
              <Sparkles size={22} aria-hidden="true" />
            </span>
          </div>

          <h1 className="mb-3 text-center text-2xl font-bold tracking-tight text-paper-100 sm:text-3xl">
            Your AI Baseline
          </h1>

          <p className="mx-auto mb-7 max-w-sm text-balance text-center text-sm text-paper-300">
            30 questions, ~5 minutes. We&apos;ll recommend a learning path based on your answers.
            You won&apos;t be graded — this just helps us tailor what you see.
          </p>

          <div className="mx-auto mb-8 max-w-sm space-y-2.5 rounded-lg border bg-ink-700/30 p-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Clock size={16} aria-hidden="true" className="mt-0.5 flex-none text-paper-300" />
              <span className="text-paper-300">Takes about 5 minutes</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                size={16}
                aria-hidden="true"
                className="mt-0.5 flex-none text-paper-300"
              />
              <span className="text-paper-300">Skip anything you&apos;re unsure about</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} aria-hidden="true" className="mt-0.5 flex-none text-paper-300" />
              <span className="text-paper-300">
                We use your answers to personalise — nothing more
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button asChild size="lg" className="w-full max-w-sm">
              <Link href="/assessment/take">
                Start
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Link
              href="/learn"
              className="text-xs text-paper-300 hover:text-paper-100 hover:underline"
            >
              Maybe later
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
