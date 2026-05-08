import Link from 'next/link';
import { Button, MonoLabel } from '@levelup/ui';
import { MarketingNav } from '@/components/navigation/marketing-nav';

export default function NotFound() {
  return (
    <>
      <MarketingNav />
      <main className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center bg-ink-900 px-4 text-paper-100">
        <div
          className="bg-blueprint pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center gap-8 text-center">
          <MonoLabel tone="signal">SIGNAL LOST · 404</MonoLabel>

          <div className="space-y-3">
            <p className="font-serif text-display-xl italic leading-none text-paper-100">404</p>
            <h1 className="font-serif text-display-md text-paper-100">
              No telemetry on that route.
            </h1>
            <p className="mx-auto max-w-sm font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
              THE PAGE YOU&apos;RE LOOKING FOR IS NOT IN THE MANIFEST. RETURN TO BASE.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/">RETURN TO BASE →</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
