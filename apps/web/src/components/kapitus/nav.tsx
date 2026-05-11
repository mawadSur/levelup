import Link from 'next/link';
import { kRoutes } from './routes';
import { brand } from '@/lib/client';

const NAV_LINKS = [
  { label: 'How it works', href: kRoutes.howItWorks },
  { label: 'Why we built this', href: kRoutes.evidence },
  { label: 'What you get', href: kRoutes.pricing },
  { label: 'About', href: kRoutes.hero },
];

export function KapitusNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-kp-rule bg-kp-paper/90 backdrop-blur supports-[backdrop-filter]:bg-kp-paper/80">
      <div className="mx-auto flex h-16 max-w-kp-container items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link
          href={kRoutes.home}
          aria-label={`${brand.shortName} home`}
          className="flex items-center gap-2"
        >
          <span className="kp-h2 text-kp-ink">{brand.shortName}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="kp-body-sm inline-flex items-center py-3 text-kp-ink-soft transition-colors hover:text-kp-ink"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={kRoutes.signIn}
            className="kp-body-sm hidden items-center py-3 text-kp-ink-soft transition-colors hover:text-kp-ink sm:inline-flex"
          >
            Sign In
          </Link>
          <Link
            href={kRoutes.signUp}
            className="inline-flex h-11 items-center rounded-kp-sm bg-kp-purple-deep px-5 text-sm font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple"
          >
            Enroll
          </Link>
        </div>
      </div>
    </header>
  );
}
