import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Separator } from '@levelup/ui';

const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Request a demo', href: 'mailto:hello@levelup.example' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: 'mailto:hello@levelup.example' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Security', href: '/legal/security' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" aria-label="LevelUp AI Academy home">
              <Logo size="sm" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-xs">
              Enterprise AI training designed for real roles, with real measurement.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground">
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} LevelUp AI Academy. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Built for the teams that actually have to get this done.
          </p>
        </div>
      </div>
    </footer>
  );
}
