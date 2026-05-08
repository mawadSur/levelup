import Link from 'next/link';

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Overview', href: '/clients/kapitus' },
      { label: 'Pricing', href: '/clients/kapitus#pricing' },
      { label: 'Sign in', href: '/clients/kapitus/sign-in' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'For lenders', href: '/clients/kapitus#roles' },
      { label: 'For underwriters', href: '/clients/kapitus#roles' },
      { label: 'For compliance', href: '/clients/kapitus#roles' },
      { label: 'For operations', href: '/clients/kapitus#roles' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Governance dashboard', href: '/clients/kapitus#evidence' },
      { label: 'How it works', href: '/clients/kapitus#how-it-works' },
      { label: 'FAQ', href: '/clients/kapitus#faq' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/clients/kapitus#hero' },
      {
        label: 'Contact',
        href: 'mailto:hello@ailevel.app?subject=Kapitus%20engagement',
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
              href="/clients/kapitus"
              aria-label="LevelUp home"
              className="kp-h2 inline-block text-kp-navy"
            >
              LevelUp
            </Link>
            <p className="kp-body-sm mt-4 max-w-xs text-kp-ink-soft">
              An AI training partner for Kapitus.
            </p>
          </div>

          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h3 className="kp-eyebrow text-kp-navy">{heading}</h3>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="kp-body-sm text-kp-ink-soft transition-colors hover:text-kp-navy"
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
            &copy; {year} LevelUp AI Academy. All rights reserved.
          </p>
          <p className="kp-body-sm text-kp-ink-mute">
            Built with care for finance teams.
          </p>
        </div>
      </div>
    </footer>
  );
}
