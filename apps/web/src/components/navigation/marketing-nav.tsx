import Link from 'next/link';
import { Button, MonoLabel } from '@levelup/ui';

const NAV_LINK_CLASS = 'text-body-sm text-paper-300 transition-colors hover:text-paper-100';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-600 bg-ink-900/85 backdrop-blur supports-[backdrop-filter]:bg-ink-900/70">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6 lg:px-8">
        <Link href="/" aria-label="LevelUp AI Academy home" className="flex items-baseline gap-3">
          <span className="font-serif text-2xl text-paper-100">ailevel</span>
          <MonoLabel className="hidden text-paper-500 sm:inline">/ ACADEMY</MonoLabel>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <Link href="/governance" className={NAV_LINK_CLASS}>
            Governance
          </Link>
          <Link href="/pricing" className={NAV_LINK_CLASS}>
            Pricing
          </Link>
          <Link href="/#how-it-works" className={NAV_LINK_CLASS}>
            How it works
          </Link>
          <Link href="/#faq" className={NAV_LINK_CLASS}>
            FAQ
          </Link>
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
