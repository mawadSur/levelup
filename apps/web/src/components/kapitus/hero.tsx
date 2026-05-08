import Link from 'next/link';
import { ShieldCheck, FileBarChart, BadgeCheck } from 'lucide-react';

export function KapitusHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-kp-rule bg-kp-paper"
    >
      <div className="mx-auto max-w-kp-container px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <span className="kp-eyebrow inline-flex rounded-kp-pill bg-kp-blue-soft px-3 py-1 text-kp-blue">
              For Kapitus · AI training with guardrails
            </span>

            <h1 className="kp-display mt-6 text-kp-navy">
              AI training that protects your loan applicants&rsquo; data.
            </h1>

            <p className="kp-body-lg mt-6 max-w-kp-reading text-kp-ink-soft">
              LevelUp trains every Kapitus employee to use ChatGPT, Claude, and
              your internal AI tools safely &mdash; with real-time guardrails on
              customer financial data, audit-ready evidence reports, and a
              curriculum tuned for lenders, underwriters, and operations.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="mailto:hello@ailevel.app?subject=Kapitus%20%E2%80%94%2030-min%20audit"
                className="inline-flex items-center justify-center rounded-kp-sm bg-kp-navy px-6 py-3 text-base font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-navy-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-blue"
              >
                Schedule a 30-min audit
              </Link>
              <Link
                href="#evidence"
                className="inline-flex items-center justify-center rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-6 py-3 text-base font-medium text-kp-ink transition-colors duration-200 ease-kp-out hover:bg-kp-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-blue"
              >
                View sample governance report
              </Link>
            </div>

            <p className="kp-data mt-6 text-kp-ink-mute">
              GLBA-aligned &middot; SOC 2 in progress &middot; 30-day pilot
              available
            </p>
          </div>

          <div className="lg:pl-4">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="rounded-kp-lg border border-kp-rule bg-kp-mist p-6 lg:p-8">
      <div className="rounded-kp-md border border-kp-rule bg-kp-paper p-6 shadow-kp-sm">
        <div className="flex items-center justify-between border-b border-kp-rule pb-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-kp-success" aria-hidden />
            <p className="kp-eyebrow text-kp-ink-soft">Live status</p>
          </div>
          <p className="kp-body-sm text-kp-ink-mute">Last 30 days</p>
        </div>

        <div className="mt-5">
          <p className="kp-body-sm text-kp-ink-soft">Sensitive data triggers</p>
          <p
            className="mt-1 font-bold tabular-nums text-kp-navy"
            style={{ fontSize: '3rem', lineHeight: 1 }}
          >
            0
          </p>
          <p className="kp-body-sm mt-2 text-kp-ink-mute">
            Across 142 monitored sessions
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Tile
            icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
            label="Policy enforcement"
            value="98%"
          />
          <Tile
            icon={<BadgeCheck className="h-4 w-4" strokeWidth={1.5} />}
            label="Training completion"
            value="84%"
          />
          <Tile
            icon={<FileBarChart className="h-4 w-4" strokeWidth={1.5} />}
            label="Evidence report"
            value="Ready"
          />
        </div>
      </div>

      <p className="kp-body-sm mt-4 text-center text-kp-ink-mute">
        Sample dashboard &middot; available post-pilot
      </p>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-kp-sm border border-kp-rule bg-kp-mist px-4 py-3">
      <div className="flex items-center gap-3 text-kp-ink-soft">
        <span className="text-kp-blue">{icon}</span>
        <span className="kp-body-sm">{label}</span>
      </div>
      <span className="kp-body-sm font-semibold tabular-nums text-kp-navy">
        {value}
      </span>
    </div>
  );
}
