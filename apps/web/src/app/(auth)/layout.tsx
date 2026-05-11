import Link from 'next/link';
import { GridLines, MonoLabel } from '@levelup/ui';
import { IS_KAPITUS } from '@/lib/client';
import { KapitusNav } from '@/components/kapitus/nav';
import { KapitusFooter } from '@/components/kapitus/footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (IS_KAPITUS) {
    return (
      <div className="flex min-h-screen flex-col">
        <KapitusNav />
        <main className="flex-1">{children}</main>
        <KapitusFooter />
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-ink-900 text-paper-100 lg:grid-cols-2">
      {/* LEFT — editorial decorative panel */}
      <aside className="relative hidden overflow-hidden border-r border-ink-600 bg-ink-800 lg:flex lg:flex-col lg:p-12 xl:p-16">
        <GridLines />

        <div className="relative flex h-full flex-col justify-between">
          <div>
            <Link
              href="/"
              aria-label="LevelUp AI Academy home"
              className="inline-flex items-baseline gap-3"
            >
              <span className="font-serif text-3xl text-paper-100">ailevel</span>
              <MonoLabel className="text-paper-500">/ ACADEMY</MonoLabel>
            </Link>
          </div>

          <div className="max-w-reading">
            <MonoLabel className="mb-6 block text-paper-500">MISSION BRIEF / VOL. I</MonoLabel>
            <p className="font-serif text-display-md text-paper-100">
              Train every employee to use AI <em className="italic text-signal">safely</em>,{' '}
              <em className="italic text-paper-100">effectively</em>, and measurably.
            </p>
            <p className="mt-6 text-body-lg text-paper-300">
              Editorial AI training, instrumented for the enterprise. Pilot in thirty days.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-ink-600 pt-6">
            <div>
              <MonoLabel tone="signal">PATHS</MonoLabel>
              <p className="mt-1 font-serif text-2xl tabular-nums text-paper-100">08</p>
            </div>
            <div>
              <MonoLabel tone="signal">SETUP</MonoLabel>
              <p className="mt-1 font-serif text-2xl tabular-nums text-paper-100">3 DAYS</p>
            </div>
            <div>
              <MonoLabel tone="signal">PILOT</MonoLabel>
              <p className="mt-1 font-serif text-2xl tabular-nums text-paper-100">30 DAYS</p>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT — form column */}
      <main className="relative flex min-h-screen flex-col bg-ink-900">
        {/* Top bar — back link + brand on mobile */}
        <div className="flex items-center justify-between border-b border-ink-600 px-6 py-5 lg:px-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300 transition-colors hover:text-paper-100"
          >
            <span aria-hidden>←</span> BACK TO HOME
          </Link>
          <Link
            href="/"
            aria-label="LevelUp AI Academy home"
            className="font-serif text-xl text-paper-100 lg:hidden"
          >
            ailevel
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-16 lg:px-12">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <div className="border-t border-ink-600 px-6 py-5 lg:px-12">
          <MonoLabel className="text-paper-500">SECURED · TLS · LEVELUP AI ACADEMY</MonoLabel>
        </div>
      </main>
    </div>
  );
}
