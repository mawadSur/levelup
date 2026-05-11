type Violation = {
  label: string;
  count: number;
};

type Department = {
  name: string;
  completion: number;
};

const VIOLATIONS: Violation[] = [
  { label: 'Confidential data in prompts', count: 14 },
  { label: 'Unapproved model', count: 9 },
  { label: 'Missing redaction', count: 6 },
  { label: 'Off-policy upload', count: 3 },
  { label: 'PII without consent', count: 2 },
];

const DEPARTMENTS: Department[] = [
  { name: 'Lending', completion: 92 },
  { name: 'Underwriting', completion: 88 },
  { name: 'Customer success', completion: 79 },
  { name: 'Compliance', completion: 100 },
];

const SPARKLINE = [0.31, 0.27, 0.29, 0.24, 0.22, 0.21, 0.18];

function buildSparklinePath(values: readonly number[], width: number, height: number): string {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function RiskScoreCard() {
  const path = buildSparklinePath(SPARKLINE, 120, 36);
  const sparkMax = Math.max(...SPARKLINE);
  const sparkMin = Math.min(...SPARKLINE);
  const sparkRange = sparkMax - sparkMin || 1;
  const lastValue = SPARKLINE[SPARKLINE.length - 1] ?? sparkMin;
  const lastY = 36 - ((lastValue - sparkMin) / sparkRange) * 36;
  return (
    <article className="flex flex-col rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-8">
      <div className="flex items-center justify-between">
        <p className="kp-eyebrow text-kp-purple">AI risk score</p>
        <span className="inline-flex items-center gap-1.5 rounded-kp-pill border border-kp-rule bg-kp-mist px-2.5 py-1 text-xs font-medium text-kp-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-kp-success" />
          Within policy
        </span>
      </div>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="kp-data text-kp-ink" style={{ fontSize: '3rem', lineHeight: 1 }}>
          0.18
        </span>
        <span className="kp-body-sm font-medium text-kp-ink-soft">Low risk</span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="kp-data text-kp-purple">&minus;0.04</p>
          <p className="kp-body-sm mt-1 text-kp-ink-mute">Last 7 days</p>
        </div>
        <svg
          viewBox="0 0 120 36"
          width="120"
          height="36"
          aria-hidden="true"
          className="overflow-visible"
        >
          <path
            d={path}
            fill="none"
            stroke="rgb(var(--kp-purple))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="120" cy={lastY} r="3" fill="rgb(var(--kp-purple))" />
        </svg>
      </div>
    </article>
  );
}

function TopViolationsCard() {
  const max = Math.max(...VIOLATIONS.map((v) => v.count));
  return (
    <article className="flex flex-col rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-8">
      <div className="flex items-center justify-between">
        <p className="kp-eyebrow text-kp-purple">Top policy violations</p>
        <span className="kp-body-sm text-kp-ink-mute">Last 30 days</span>
      </div>
      <h3 className="kp-h3 mt-2 text-kp-ink">Where guardrails caught usage</h3>

      <ul className="mt-6 flex flex-col gap-4">
        {VIOLATIONS.map((v) => {
          const width = (v.count / max) * 100;
          return (
            <li key={v.label} className="grid grid-cols-[1fr_auto] items-center gap-4">
              <div>
                <p className="kp-body-sm font-medium text-kp-ink">{v.label}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-kp-pill bg-kp-fog">
                  <div
                    className="h-full rounded-kp-pill bg-kp-purple"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <span className="kp-data text-kp-ink-soft tabular-nums">
                {v.count.toString().padStart(2, '0')}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function CertExportCard() {
  return (
    <article className="flex flex-col rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-8">
      <p className="kp-eyebrow text-kp-purple">Latest governance report</p>
      <h3 className="kp-h3 mt-2 text-kp-ink">Quarterly export</h3>

      <div className="mt-6 flex items-start gap-4 rounded-kp-sm border border-kp-rule bg-kp-mist p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kp-sm border border-kp-rule bg-kp-paper">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="rgb(var(--kp-purple))"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6" />
            <path d="M9 17h6" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="kp-data truncate text-sm text-kp-ink">kapitus-q1-2026-governance.pdf</p>
          <p className="kp-body-sm mt-1 text-kp-ink-mute">
            <span className="kp-data text-kp-ink-soft">Apr 30, 2026</span>
            <span className="mx-2 text-kp-ink-faint">&middot;</span>
            <span className="kp-data text-kp-ink-soft">2.4 MB</span>
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="kp-body-sm text-kp-ink-mute">Pages</dt>
          <dd className="kp-data mt-1 text-kp-ink">42</dd>
        </div>
        <div>
          <dt className="kp-body-sm text-kp-ink-mute">SHA-256</dt>
          <dd className="kp-data mt-1 truncate text-sm text-kp-ink">9f2a&hellip;c41b</dd>
        </div>
      </dl>

      <div className="mt-auto pt-6">
        <span
          aria-disabled="true"
          className="inline-flex items-center justify-center gap-2 rounded-kp-sm bg-kp-purple px-4 py-2.5 text-sm font-semibold text-white shadow-kp-sm"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Download Report
        </span>
      </div>
    </article>
  );
}

function ActiveLearnersCard() {
  return (
    <article className="flex flex-col rounded-kp-md border border-kp-rule bg-kp-paper p-6 transition-all duration-200 ease-kp-out hover:-translate-y-px hover:border-kp-rule-strong hover:shadow-kp-sm lg:p-8">
      <div className="flex items-center justify-between">
        <p className="kp-eyebrow text-kp-purple">Active learners</p>
        <span className="kp-body-sm text-kp-ink-mute">Quarter to date</span>
      </div>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="kp-data text-kp-ink" style={{ fontSize: '3rem', lineHeight: 1 }}>
          312
        </span>
        <span className="kp-body-sm font-medium text-kp-purple">+18% QoQ</span>
      </div>
      <p className="kp-body-sm mt-1 text-kp-ink-mute">Employees who completed at least one path</p>

      <ul className="mt-6 flex flex-col gap-3">
        {DEPARTMENTS.map((d) => (
          <li key={d.name} className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="kp-body-sm w-32 shrink-0 text-kp-ink">{d.name}</span>
              <div className="h-1.5 w-full overflow-hidden rounded-kp-pill bg-kp-fog">
                <div
                  className="h-full rounded-kp-pill bg-kp-purple"
                  style={{ width: `${d.completion}%` }}
                />
              </div>
            </div>
            <span className="kp-data text-sm text-kp-ink-soft">{d.completion}%</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function KapitusGovernanceMock() {
  return (
    <section id="evidence" className="border-b border-kp-rule bg-kp-paper py-20 lg:py-24">
      <div className="mx-auto max-w-kp-container px-6 sm:px-8 lg:px-12">
        <div className="max-w-kp-reading">
          <p className="kp-eyebrow text-kp-purple">Evidence</p>
          <h2 className="kp-h1 mt-3 text-kp-ink">Evidence over assertions.</h2>
          <p className="kp-body-lg mt-5 text-kp-ink-soft">
            Your CISO can hand a quarterly governance report to GLBA examiners without ever sitting
            in a LevelUp UI. Here is what the dashboard looks like in week six.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-6 lg:gap-6">
          <div className="lg:col-span-2">
            <RiskScoreCard />
          </div>
          <div className="lg:col-span-4">
            <TopViolationsCard />
          </div>
          <div className="lg:col-span-3">
            <CertExportCard />
          </div>
          <div className="lg:col-span-3">
            <ActiveLearnersCard />
          </div>
        </div>

        <p className="kp-body-sm mt-8 text-kp-ink-mute">
          Sample data shown. Production reports are signed, exportable, and include hash-verified
          audit trails.
        </p>
      </div>
    </section>
  );
}
