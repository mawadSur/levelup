import Link from 'next/link';
import { ShieldCheck, Scale, BookOpenCheck } from 'lucide-react';
import { clRoutes } from './routes';

export function CeoLawyerHero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-cl-dark-band text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 88% 12%, rgba(212,162,76,0.16), transparent 55%), radial-gradient(circle at 12% 90%, rgba(255,255,255,0.04), transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-cl-container px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <span className="cl-eyebrow inline-flex rounded-cl-pill border border-cl-gold/40 bg-white/5 px-3 py-1 text-cl-gold">
              CEO Lawyer AI Academy
            </span>

            <h1 className="cl-display mt-6 text-white">
              Sharpen your firm. Win more cases. Use AI without breaking client trust.
            </h1>

            <p className="cl-body-lg mt-6 max-w-cl-reading text-white/80">
              Role-based AI training for intake, paralegals, marketing, case managers, and junior
              attorneys. Confidentiality-safe by default. Citation-checked. Built around the work
              your firm already does every day.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href={clRoutes.howItWorks}
                className="inline-flex items-center justify-center rounded-cl-sm bg-cl-gold px-6 py-3 text-base font-semibold text-cl-navy-deep shadow-cl-sm transition-colors duration-200 ease-cl-out hover:bg-cl-gold-deep hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                See the curriculum
              </Link>
              <Link
                href={clRoutes.contact}
                className="inline-flex items-center justify-center rounded-cl-sm border border-white/30 bg-transparent px-6 py-3 text-base font-medium text-white transition-colors duration-200 ease-cl-out hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Talk to us
              </Link>
            </div>

            <p className="cl-data mt-6 text-white/60">
              Built for firms handling sensitive client data &middot; No risk to your team&rsquo;s
              productivity
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
    <div className="rounded-cl-lg border border-white/10 bg-white/5 p-6 lg:p-8">
      <div className="rounded-cl-md border border-cl-rule bg-cl-paper p-6 shadow-cl-sm">
        <div className="flex items-center justify-between border-b border-cl-rule pb-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-cl-success" aria-hidden />
            <p className="cl-eyebrow text-cl-ink-soft">Firm posture</p>
          </div>
          <p className="cl-body-sm text-cl-ink-mute">Last 30 days</p>
        </div>

        <div className="mt-5">
          <p className="cl-body-sm text-cl-ink-soft">Confidentiality triggers caught</p>
          <p
            className="mt-1 font-bold tabular-nums text-cl-navy"
            style={{ fontSize: '3rem', lineHeight: 1 }}
          >
            12
          </p>
          <p className="cl-body-sm mt-2 text-cl-ink-mute">
            Client names + case numbers redacted before leaving the browser
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Tile
            icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
            label="Privilege protected"
            value="100%"
          />
          <Tile
            icon={<BookOpenCheck className="h-4 w-4" strokeWidth={1.5} />}
            label="Path completion"
            value="86%"
          />
          <Tile
            icon={<Scale className="h-4 w-4" strokeWidth={1.5} />}
            label="Citation checks"
            value="421"
          />
        </div>
      </div>

      <p className="cl-body-sm mt-4 text-center text-white/60">
        Firm dashboard &middot; updated weekly
      </p>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-cl-sm border border-cl-rule bg-cl-mist px-4 py-3">
      <div className="flex items-center gap-3 text-cl-ink-soft">
        <span className="text-cl-navy">{icon}</span>
        <span className="cl-body-sm">{label}</span>
      </div>
      <span className="cl-body-sm font-semibold tabular-nums text-cl-navy">{value}</span>
    </div>
  );
}
