import Link from 'next/link';
import { clRoutes } from './routes';
import { CeoLawyerLogo } from './logo';
import { brand } from '@/lib/client';

const FOOTER_COLUMNS = [
  {
    heading: 'Academy',
    links: [
      { label: 'Overview', href: clRoutes.home },
      { label: 'Get started', href: clRoutes.signUp },
      { label: 'Sign in', href: clRoutes.signIn },
    ],
  },
  {
    heading: 'Learning paths',
    links: [
      { label: 'For intake', href: `${clRoutes.home}#roles` },
      { label: 'For paralegals', href: `${clRoutes.home}#roles` },
      { label: 'For marketing', href: `${clRoutes.home}#roles` },
      { label: 'For attorneys', href: `${clRoutes.home}#roles` },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'How it works', href: clRoutes.howItWorks },
      { label: 'What you get', href: clRoutes.pricing },
      { label: 'FAQ', href: clRoutes.faq },
    ],
  },
  {
    heading: 'Talk to us',
    links: [
      { label: 'Schedule a walkthrough', href: clRoutes.signUp },
      {
        label: 'Email the team',
        href: 'mailto:training@ceolawyer.com?subject=AI%20Academy%20question',
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

export function CeoLawyerFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-cl-rule bg-cl-surface">
      <div className="mx-auto max-w-cl-container px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link
              href={clRoutes.home}
              aria-label={`${brand.shortName} home`}
              className="inline-block"
            >
              <CeoLawyerLogo />
            </Link>
            <p className="cl-body-sm mt-4 max-w-xs text-cl-ink-soft">
              AI training for the people who help injured people win.
            </p>
          </div>

          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h2 className="cl-eyebrow text-cl-navy">{heading}</h2>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="cl-body-sm text-cl-ink-soft transition-colors hover:text-cl-navy"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 border-t border-cl-rule pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="cl-body-sm text-cl-ink-mute">
            &copy; {year} {brand.name}. All rights reserved.
          </p>
          <p className="cl-body-sm text-cl-ink-mute">Built for the firm. Tuned for the work.</p>
        </div>
      </div>
    </footer>
  );
}
