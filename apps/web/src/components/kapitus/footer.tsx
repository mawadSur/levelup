import Link from 'next/link';
import { kRoutes } from './routes';
import { brand } from '@/lib/client';

const FOOTER_COLUMNS = [
  {
    heading: 'Academy',
    links: [
      { label: 'Overview', href: kRoutes.home },
      { label: 'Enroll', href: kRoutes.signUp },
      { label: 'Sign in', href: kRoutes.signIn },
    ],
  },
  {
    heading: 'Learning paths',
    links: [
      { label: 'For lenders', href: `${kRoutes.home}#roles` },
      { label: 'For underwriters', href: `${kRoutes.home}#roles` },
      { label: 'For compliance', href: `${kRoutes.home}#roles` },
      { label: 'For operations', href: `${kRoutes.home}#roles` },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Governance dashboard', href: kRoutes.evidence },
      { label: 'How it works', href: kRoutes.howItWorks },
      { label: 'FAQ', href: `${kRoutes.home}#faq` },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'About this academy', href: kRoutes.hero },
      {
        label: 'Contact L&D',
        href: 'mailto:learning@kapitus.com?subject=AI%20Academy%20question',
      },
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

export function KapitusFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-kp-rule bg-kp-mist">
      <div className="mx-auto max-w-kp-container px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link
              href={kRoutes.home}
              aria-label={`${brand.shortName} home`}
              className="kp-h2 inline-block text-kp-ink"
            >
              {brand.shortName}
            </Link>
            <p className="kp-body-sm mt-4 max-w-xs text-kp-ink-soft">
              An AI training partner for Kapitus.
            </p>
          </div>

          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h2 className="kp-eyebrow text-kp-ink">{heading}</h2>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="kp-body-sm text-kp-ink-soft transition-colors hover:text-kp-ink"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 border-t border-kp-rule pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="kp-body-sm text-kp-ink-mute">
            &copy; {year} {brand.name}. All rights reserved.
          </p>
          <p className="kp-body-sm text-kp-ink-mute">Built for Kapitus employees.</p>
        </div>
      </div>
    </footer>
  );
}
