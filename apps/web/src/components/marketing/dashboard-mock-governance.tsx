import { MonoLabel } from '@levelup/ui';

/**
 * Marketing-only governance dashboard mock. Hand-crafted fake data shaped to
 * look credible to a CISO scanning the page — risk scores vary by department,
 * trigger feed shows the redacted user mask + category badges, posture row
 * matches the live admin design.
 */
export function DashboardMockGovernance() {
  return (
    <div className="relative mx-auto w-full max-w-xl select-none" aria-hidden>
      <div className="overflow-hidden border border-ink-600 bg-ink-800 rounded-sm">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-ink-600 bg-ink-700 px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-paper-500" />
          <span className="h-2 w-2 rounded-full bg-paper-500" />
          <span className="h-2 w-2 rounded-full bg-signal" />
          <div className="mx-4 flex h-5 flex-1 items-center px-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            APP.LEVELUP.AI/ADMIN/GOVERNANCE
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4 border-b border-ink-600 pb-3">
            <MonoLabel className="text-paper-500">MISSION BRIEF · GOVERNANCE</MonoLabel>
            <p className="mt-1 font-serif text-base italic text-paper-100">
              AI usage telemetry, per department.
            </p>
          </div>

          {/* Posture strip */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              { label: 'INTERACTIONS', value: '4,812', tone: 'text-paper-100' },
              { label: 'TRIGGERS', value: '37', tone: 'text-signal' },
              { label: 'HIGH-RISK', value: '06', tone: 'text-danger' },
              { label: 'COVERAGE', value: '74%', tone: 'text-success' },
            ].map(({ label, value, tone }) => (
              <div key={label} className="border border-ink-600 bg-ink-900 p-2">
                <MonoLabel className="block text-paper-500">{label}</MonoLabel>
                <p className={`mt-1 font-serif text-base tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Risk by dept */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <MonoLabel className="text-paper-300">II · RISK BY DEPARTMENT</MonoLabel>
              <MonoLabel className="text-paper-500">30D</MonoLabel>
            </div>
            <div className="border border-ink-600 bg-ink-900">
              {[
                { dept: 'Engineering', headcount: 84, triggers: 14, risk: 67, tone: 'text-danger' },
                { dept: 'Sales', headcount: 56, triggers: 9, risk: 41, tone: 'text-warning' },
                { dept: 'Marketing', headcount: 32, triggers: 6, risk: 28, tone: 'text-signal' },
                { dept: 'Finance', headcount: 18, triggers: 4, risk: 22, tone: 'text-signal' },
                { dept: 'People', headcount: 12, triggers: 1, risk: 8, tone: 'text-paper-300' },
              ].map((row) => (
                <div
                  key={row.dept}
                  className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-3 border-b border-ink-700 px-3 py-1.5 last:border-b-0"
                >
                  <span className="text-body-sm text-paper-100">{row.dept}</span>
                  <span className="font-mono text-mono-sm tabular-nums text-paper-500">
                    {row.headcount}
                  </span>
                  <span className="font-mono text-mono-sm tabular-nums text-signal">
                    {String(row.triggers).padStart(2, '0')}
                  </span>
                  <span className={`font-mono text-mono-sm tabular-nums ${row.tone}`}>
                    {row.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger feed */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <MonoLabel className="text-paper-300">III · TRIGGER FEED</MonoLabel>
              <MonoLabel className="text-paper-500">REDACTED</MonoLabel>
            </div>
            <div className="border border-ink-600 bg-ink-900">
              {[
                { time: '14:22', user: 'USER_A91C28', category: 'CREDENTIALS', tone: 'border-danger text-danger' },
                { time: '13:47', user: 'USER_F0B3E1', category: 'PII', tone: 'border-danger text-danger' },
                { time: '12:58', user: 'USER_2D7C4A', category: 'INTERNAL_DATA', tone: 'border-signal-dim text-signal' },
                { time: '11:12', user: 'USER_88FA21', category: 'PII', tone: 'border-danger text-danger' },
              ].map((row) => (
                <div
                  key={`${row.time}-${row.user}`}
                  className="grid grid-cols-[auto,1fr,auto] items-center gap-3 border-b border-ink-700 px-3 py-1.5 last:border-b-0"
                >
                  <span className="font-mono text-mono-sm tabular-nums text-paper-500">
                    {row.time}
                  </span>
                  <span className="font-mono text-mono-sm text-paper-300">{row.user}</span>
                  <span
                    className={`inline-flex items-center rounded-data border bg-transparent px-2 py-[1px] font-mono text-[10px] uppercase tracking-[0.05em] ${row.tone}`}
                  >
                    {row.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
