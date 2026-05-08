import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';
import '@levelup/ui/styles/kapitus';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LevelUp for Kapitus — AI training with guardrails',
    template: '%s · LevelUp for Kapitus',
  },
  description:
    'AI training that protects loan applicants’ data. GLBA-aligned, audit-ready, tuned for lenders, underwriters, and operations.',
};

export default function KapitusLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
