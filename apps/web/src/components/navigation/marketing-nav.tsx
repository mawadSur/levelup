import Link from 'next/link';
import { Button, MonoLabel } from '@levelup/ui';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-600 bg-ink-900/85 backdrop-blur supports-[backdrop-filter]:bg-ink-900/70">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6 lg:px-8">
        <Link href="/" aria-label="LevelUp AI Academy home" className="flex items-baseline gap-3">
          <span className="font-serif text-2xl text-paper-100">ailevel</span>
          <MonoLabel className="hidden text-paper-500 sm:inline">/ ACADEMY</MonoLabel>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <Link
            href="/pricing"
            className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 transition-colors hover:text-paper-100"
          >
            Pricing
          </Link>
          <a
            href="#how-it-works"
            className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 transition-colors hover:text-paper-100"
          >
            How it works
          </a>
          <a
            href="#faq"
            className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 transition-colors hover:text-paper-100"
          >
            FAQ
          </a>
        </nav>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/sign-up">Request demo →</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
