import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      {/* Subtle indigo radial accent behind the card */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />
      </div>

      {/* Back to home — top-left corner */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M8.5 2.5 4 7l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to home
        </Link>
      </div>

      {/* Card container */}
      <div className="relative z-10 flex w-full max-w-[28rem] flex-col gap-6 px-4 py-12 sm:px-0">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" aria-label="LevelUp AI Academy home">
            <Logo size="md" />
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
