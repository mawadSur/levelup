import { MonoLabel } from '@levelup/ui';

/**
 * Mock dashboard preview used as a marketing-only illustration.
 * Currently unreferenced from the site flow — kept as a primitive in case
 * future sections want to render an admin-shell preview inline.
 */
export function DashboardMock() {
  return (
    <div className="relative mx-auto w-full max-w-xl select-none" aria-hidden>
      <div className="overflow-hidden border border-ink-600 bg-ink-800 rounded-sm">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-ink-600 bg-ink-700 px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-paper-500" />
          <span className="h-2 w-2 rounded-full bg-paper-500" />
          <span className="h-2 w-2 rounded-full bg-signal" />
          <div className="mx-4 flex h-5 flex-1 items-center px-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            APP.LEVELUP.AI/LEARN
          </div>
        </div>

        <div className="flex" style={{ height: 320 }}>
          {/* Sidebar */}
          <div className="flex w-40 shrink-0 flex-col gap-1 border-r border-ink-600 bg-ink-900 px-2 py-4">
            <div className="mb-3 flex items-baseline gap-2 px-2">
              <span className="font-serif text-lg text-paper-100">ailevel</span>
            </div>
            {[
              { label: 'MY LEARNING', active: true },
              { label: 'AI COACH', active: false },
              { label: 'PROMPTS', active: false },
              { label: 'CERTIFICATES', active: false },
            ].map(({ label, active }) => (
              <div
                key={label}
                className={`px-2 py-1.5 font-mono text-mono-sm uppercase tracking-[0.05em] ${
                  active ? 'bg-ink-700 text-signal' : 'text-paper-300'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="mb-4 flex items-start justify-between border-b border-ink-600 pb-3">
              <div>
                <p className="font-serif text-lg text-paper-100">Good afternoon, Jordan</p>
                <MonoLabel className="mt-1 block">3 LESSONS REMAINING THIS WEEK</MonoLabel>
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-signal text-[9px] font-bold text-ink-900">
                JL
              </div>
            </div>

            <div className="mb-3 border border-ink-600 bg-ink-900 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <MonoLabel className="text-paper-300">AI FUNDAMENTALS · MARKETING</MonoLabel>
                <span className="font-serif text-base text-signal tabular-nums">68%</span>
              </div>
              <div className="h-px w-full bg-ink-600">
                <div className="h-px bg-signal" style={{ width: '68%' }} />
              </div>
              <div className="mt-2 flex justify-between">
                <MonoLabel className="text-paper-500">9 / 13 LESSONS</MonoLabel>
                <MonoLabel className="text-paper-500">~ 40 MIN LEFT</MonoLabel>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'STREAK', value: '14d' },
                { label: 'AVG SCORE', value: '84%' },
                { label: 'CERT READY', value: '01' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="border border-ink-600 bg-ink-900 p-2 text-center"
                >
                  <p className="font-serif text-base text-paper-100 tabular-nums">{value}</p>
                  <MonoLabel className="mt-1 block text-paper-500">{label}</MonoLabel>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
