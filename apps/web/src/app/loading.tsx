import { Skeleton } from '@levelup/ui';

/**
 * Root-level loading UI — shown while the root layout's async data resolves.
 * Shaped to match a typical app page: nav bar + content card layout.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Simulated nav bar */}
      <div
        className="sticky top-0 z-50 h-16 border-b border-ink-500/40 bg-ink-900/95"
        aria-hidden="true"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-7 w-32" />
          <div className="hidden items-center gap-4 md:flex">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* Page body */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>

        {/* Highlight / hero card */}
        <Skeleton className="h-36 w-full rounded-xl" />

        {/* Section label */}
        <Skeleton className="h-4 w-28" />

        {/* Card grid — 3 columns on large screens */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-md border border-ink-600 bg-ink-800 p-5"
              aria-hidden="true"
            >
              <Skeleton className="h-24 w-full rounded-lg" />
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
