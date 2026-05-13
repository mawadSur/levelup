import Link from 'next/link';
import { clRoutes } from './routes';
import { CeoLawyerLogo } from './logo';

const NAV_LINKS = [
  { label: 'How it works', href: clRoutes.howItWorks },
  { label: 'For your team', href: clRoutes.roles },
  { label: 'What you get', href: clRoutes.pricing },
  { label: 'Questions', href: clRoutes.faq },
];

export function CeoLawyerNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-cl-rule bg-cl-paper/90 backdrop-blur supports-[backdrop-filter]:bg-cl-paper/80">
      <div className="mx-auto flex h-16 max-w-cl-container items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link
          href={clRoutes.home}
          aria-label="CEO Lawyer AI Academy home"
          className="flex items-center"
        >
          <CeoLawyerLogo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="cl-body-sm inline-flex items-center py-3 text-cl-ink-soft transition-colors hover:text-cl-navy"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={clRoutes.signIn}
            className="cl-body-sm hidden items-center py-3 text-cl-ink-soft transition-colors hover:text-cl-navy sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={clRoutes.signUp}
            className="inline-flex h-11 items-center rounded-cl-sm bg-cl-navy px-5 text-sm font-semibold text-white shadow-cl-sm transition-colors duration-200 ease-cl-out hover:bg-cl-navy-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cl-navy"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
