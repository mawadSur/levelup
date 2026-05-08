import Link from 'next/link';
import { MonoLabel } from '@levelup/ui';

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Request a demo', href: '/sign-up' },
      { label: 'Sign in', href: '/sign-in' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/sign-up' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Security', href: '/legal/security' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-600 bg-ink-900">
      <div className="mx-auto max-w-content px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr,2fr]">
          <div className="space-y-4">
            <Link href="/" aria-label="LevelUp AI Academy home" className="block">
              <span className="font-serif text-5xl leading-none text-paper-100">ailevel</span>
            </Link>
            <p className="max-w-xs font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              Editorial AI training, instrumented for the enterprise.
            </p>
            <p className="max-w-xs text-body-sm text-paper-300">
              Train every employee to use AI safely, effectively, and measurably in 30 days.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {FOOTER_COLUMNS.map(({ heading, links }) => (
              <div key={heading}>
                <MonoLabel className="mb-5 block text-paper-500">{heading}</MonoLabel>
                <ul className="space-y-3">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 transition-colors hover:text-paper-100"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-ink-600 pt-8">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <MonoLabel className="text-paper-500">
              &copy; {year} LEVELUP AI ACADEMY · ALL RIGHTS RESERVED
            </MonoLabel>
            <MonoLabel className="text-paper-500">MISSION BRIEF · VOL. I · 2026.05</MonoLabel>
          </div>
        </div>
      </div>
    </footer>
  );
}
