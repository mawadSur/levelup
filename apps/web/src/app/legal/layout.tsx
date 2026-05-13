import { IS_KAPITUS, IS_CEOLAWYER } from '@/lib/client';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';
import { CeoLawyerNav } from '@/components/ceolawyer/nav';
import { CeoLawyerFooter } from '@/components/ceolawyer/footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  if (IS_KAPITUS) {
    return (
      <div className="flex min-h-screen flex-col">
        <KapitusNav />
        <main className="flex-1 bg-kp-paper">{children}</main>
        <KapitusFooter />
      </div>
    );
  }

  if (IS_CEOLAWYER) {
    return (
      <div className="flex min-h-screen flex-col">
        <CeoLawyerNav />
        <main className="flex-1 bg-cl-paper">{children}</main>
        <CeoLawyerFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-900 text-paper-100">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
