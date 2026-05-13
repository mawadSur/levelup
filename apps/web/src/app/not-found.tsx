import Link from 'next/link';
import { Button, MonoLabel } from '@levelup/ui';
import { IS_KAPITUS, IS_CEOLAWYER } from '@/lib/client';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';
import { kRoutes } from '@/components/kapitus/routes';
import { CeoLawyerNav } from '@/components/ceolawyer/nav';
import { CeoLawyerFooter } from '@/components/ceolawyer/footer';
import { clRoutes } from '@/components/ceolawyer/routes';

export default function NotFound() {
  if (IS_CEOLAWYER) {
    return (
      <div className="flex min-h-screen flex-col">
        <CeoLawyerNav />
        <main className="flex-1 bg-cl-surface">
          <div className="mx-auto flex max-w-cl-container flex-col items-center justify-center px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
            <p className="cl-eyebrow text-cl-navy">404 · NOT FOUND</p>
            <h1 className="cl-display mt-6 text-cl-ink">We couldn&apos;t find that page.</h1>
            <p className="cl-body-lg mt-5 max-w-cl-reading text-cl-ink-soft">
              The link may be out of date, or the address may be a typo. Head back to the academy
              and pick up where you left off.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={clRoutes.home}
                className="inline-flex h-11 items-center rounded-cl-sm bg-cl-navy px-5 text-sm font-semibold text-white shadow-cl-sm transition-colors duration-200 ease-cl-out hover:bg-cl-navy-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cl-navy"
              >
                Back to the academy
              </Link>
              <Link
                href={clRoutes.signIn}
                className="inline-flex h-11 items-center rounded-cl-sm border border-cl-rule-strong px-5 text-sm font-semibold text-cl-ink transition-colors duration-200 ease-cl-out hover:bg-cl-fog"
              >
                Sign in
              </Link>
            </div>
          </div>
        </main>
        <CeoLawyerFooter />
      </div>
    );
  }

  if (IS_KAPITUS) {
    return (
      <div className="flex min-h-screen flex-col">
        <KapitusNav />
        <main className="flex-1 bg-kp-mist">
          <div className="mx-auto flex max-w-kp-container flex-col items-center justify-center px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
            <p className="kp-eyebrow text-kp-purple-deep">404 · NOT FOUND</p>
            <h1 className="kp-display mt-6 text-kp-ink">We couldn&apos;t find that page.</h1>
            <p className="kp-body-lg mt-5 max-w-kp-reading text-kp-ink-soft">
              The link may be out of date, or you may have typed the address incorrectly. Head back
              to the academy and pick up where you left off.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={kRoutes.home}
                className="inline-flex h-11 items-center rounded-kp-sm bg-kp-purple-deep px-5 text-sm font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple"
              >
                Back to the academy
              </Link>
              <Link
                href={kRoutes.signIn}
                className="inline-flex h-11 items-center rounded-kp-sm border border-kp-rule-strong px-5 text-sm font-semibold text-kp-ink transition-colors duration-200 ease-kp-out hover:bg-kp-fog"
              >
                Sign in
              </Link>
            </div>
          </div>
        </main>
        <KapitusFooter />
      </div>
    );
  }

  return (
    <>
      <MarketingNav />
      <main className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center bg-ink-900 px-4 text-paper-100">
        <div
          className="bg-blueprint pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center gap-8 text-center">
          <MonoLabel tone="signal">SIGNAL LOST · 404</MonoLabel>

          <div className="space-y-3">
            <p className="font-serif text-display-xl italic leading-none text-paper-100">404</p>
            <h1 className="font-serif text-display-md text-paper-100">
              No telemetry on that route.
            </h1>
            <p className="mx-auto max-w-sm font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
              THE PAGE YOU&apos;RE LOOKING FOR IS NOT IN THE MANIFEST. RETURN TO BASE.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/">RETURN TO BASE →</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
