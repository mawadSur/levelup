import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';
import '@levelup/ui/styles/kapitus';

// CWV fix (Wave 4): trimmed to weights actually used by the Kapitus design
// system (400/500/600/700). See docs/qa/cwv-baseline-wave-4.md.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Kapitus AI Academy — AI training with guardrails',
    template: '%s · Kapitus AI Academy',
  },
  description:
    'AI training that protects loan applicants’ data. GLBA-aligned, audit-ready, tuned for lenders, underwriters, and operations.',
};

export default function KapitusLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`kapitus ${manrope.variable} flex min-h-screen flex-col bg-kp-paper text-kp-ink`}
      data-theme="kapitus"
      style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
    >
      <KapitusNav />
      <main className="flex-1">{children}</main>
      <KapitusFooter />
    </div>
  );
}
