import type { Metadata } from 'next';
import { Inter_Tight } from 'next/font/google';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';
import '@levelup/ui/styles/kapitus';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter-tight',
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
      className={`kapitus ${interTight.variable} flex min-h-screen flex-col bg-kp-paper text-kp-ink`}
      data-theme="kapitus"
      style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}
    >
      <KapitusNav />
      <main className="flex-1">{children}</main>
      <KapitusFooter />
    </div>
  );
}
