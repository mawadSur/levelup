import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { CeoLawyerNav } from '@/components/ceolawyer/nav';
import { CeoLawyerFooter } from '@/components/ceolawyer/footer';
import '@levelup/ui/styles/ceolawyer';

// CWV fix (Wave 4): trimmed to weights actually used by the CEO Lawyer design
// system (400/500/600/700). See docs/qa/cwv-baseline-wave-4.md.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CEO Lawyer AI Academy — AI training for personal injury firms',
    template: '%s · CEO Lawyer AI Academy',
  },
  description:
    'Sharpen your edge. Win more cases. AI training built for personal injury firms — confidentiality-safe, citation-checked, tuned to how you actually serve clients.',
};

export default function CeoLawyerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`ceolawyer ${manrope.variable} flex min-h-screen flex-col bg-cl-paper text-cl-ink`}
      data-theme="ceolawyer"
      style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
    >
      <CeoLawyerNav />
      <main className="flex-1">{children}</main>
      <CeoLawyerFooter />
    </div>
  );
}
