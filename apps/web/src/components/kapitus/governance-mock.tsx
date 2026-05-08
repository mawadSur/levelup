const DEPARTMENTS = [
  { name: 'Lending', completion: 92, triggers: 0, risk: 'low' as const },
  { name: 'Underwriting', completion: 88, triggers: 1, risk: 'low' as const },
  { name: 'Customer success', completion: 79, triggers: 2, risk: 'medium' as const },
  { name: 'Compliance', completion: 100, triggers: 0, risk: 'low' as const },
  { name: 'Marketing', completion: 64, triggers: 0, risk: 'medium' as const },
  { name: 'Operations', completion: 71, triggers: 1, risk: 'low' as const },
];

function RiskPill({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  if (risk === 'high') {
    return (
      <span className="inline-flex items-center rounded-kp-pill bg-[rgb(var(--kp-danger)_/_0.1)] px-2.5 py-0.5 text-xs font-semibold text-kp-danger">
        High
      </span>
    );
  }
  if (risk === 'medium') {
    return (
      <span className="inline-flex items-center rounded-kp-pill bg-[rgb(var(--kp-warning)_/_0.12)] px-2.5 py-0.5 text-xs font-semibold text-kp-warning">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-kp-pill bg-[rgb(var(--kp-success)_/_0.12)] px-2.5 py-0.5 text-xs font-semibold text-kp-success">
      Low
    </span>
  );
}

export function KapitusGovernanceMock() {
  return (
    <section
      id="evidence"
      className="border-b border-kp-rule bg-kp-paper py-20 lg:py-24"
    >
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-blue">Evidence</p>
          <h2 className="kp-h1 mt-3 text-kp-navy">Evidence over assertions.</h2>
          <p className="kp-body-lg mt-5 text-kp-ink-soft">
            Your CISO can hand a quarterly governance report to GLBA examiners
            without ever sitting in a LevelUp UI. Below is a representative
            week.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-kp-lg border border-kp-rule bg-kp-paper shadow-kp-sm">
          <header className="flex flex-col gap-3 border-b border-kp-rule bg-kp-mist px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="kp-eyebrow text-kp-ink-mute">Governance dashboard</p>
              <h3 className="kp-h3 mt-1 text-kp-navy">
                Department risk &mdash; week of May 5
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="kp-data text-kp-ink-mute">
                ORG: KAPITUS-PROD
              </span>
              <span className="inline-flex items-center gap-2 rounded-kp-pill border border-kp-rule bg-kp-paper px-3 py-1 text-xs font-medium text-kp-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-kp-success" />
                Live
              </span>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-kp-rule">
                  <th className="kp-eyebrow px-6 py-4 text-kp-ink-mute sm:px-8">
                    Department
                  </th>
                  <th className="kp-eyebrow px-6 py-4 text-kp-ink-mute sm:px-8">
                    Training completion
                  </th>
                  <th className="kp-eyebrow px-6 py-4 text-kp-ink-mute sm:px-8">
                    Sensitive triggers
                  </th>
                  <th className="kp-eyebrow px-6 py-4 text-right text-kp-ink-mute sm:px-8">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map((d) => (
                  <tr
                    key={d.name}
                    className="border-b border-kp-rule last:border-b-0 hover:bg-kp-mist"
                  >
                    <td className="kp-body px-6 py-4 font-medium text-kp-navy sm:px-8">
                      {d.name}
                    </td>
                    <td className="px-6 py-4 sm:px-8">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-32 overflow-hidden rounded-kp-pill bg-kp-fog">
                          <div
                            className="h-full rounded-kp-pill bg-kp-blue"
                            style={{ width: `${d.completion}%` }}
                          />
                        </div>
                        <span className="kp-data text-kp-ink-soft">
                          {d.completion}%
                        </span>
                      </div>
                    </td>
                    <td className="kp-data px-6 py-4 text-kp-ink-soft sm:px-8">
                      {d.triggers.toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4 text-right sm:px-8">
                      <RiskPill risk={d.risk} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-2 border-t border-kp-rule bg-kp-mist px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="kp-body-sm text-kp-ink-mute">
              Updated 60 seconds ago. Individual prompts never shown to managers.
            </p>
            <p className="kp-body-sm text-kp-ink-mute">Sample data</p>
          </footer>
        </div>
      </div>
    </section>
  );
}
