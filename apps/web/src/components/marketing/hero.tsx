import Link from 'next/link';
import { Button } from '@levelup/ui';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-24 sm:pt-24 sm:pb-32">
      {/* Drifting oxblood blob mesh */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <style>{`
          @keyframes drift-a {
            0%   { transform: translate3d(0, 0, 0); }
            50%  { transform: translate3d(5%, 3%, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes drift-b {
            0%   { transform: translate3d(0, 0, 0); }
            50%  { transform: translate3d(-6%, -4%, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes drift-c {
            0%   { transform: translate3d(0, 0, 0); }
            50%  { transform: translate3d(4%, -5%, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .blob-a, .blob-b, .blob-c { animation: none !important; }
          }
        `}</style>
        <div
          className="blob-a absolute -top-32 -left-32 h-[640px] w-[640px] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(347 60% 27% / 0.18) 0%, transparent 70%)',
            animation: 'drift-a 26s ease-in-out infinite',
          }}
        />
        <div
          className="blob-b absolute bottom-0 -right-24 h-[480px] w-[560px] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(347 60% 27% / 0.12) 0%, transparent 70%)',
            animation: 'drift-b 30s ease-in-out infinite',
          }}
        />
        <div
          className="blob-c absolute bottom-8 left-1/2 h-[360px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(347 60% 27% / 0.08) 0%, transparent 70%)',
            animation: 'drift-c 22s ease-in-out infinite',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:gap-12">
          {/* Copy column */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              Purpose-built for enterprise AI readiness
            </div>
            <h1
              className="font-display font-semibold text-foreground"
              style={{
                fontSize: 'clamp(3rem, 5vw, 4rem)',
                lineHeight: '1.08',
                letterSpacing: '-0.02em',
                fontVariationSettings: "'opsz' 144",
              }}
            >
              Train every employee to use AI safely,{' '}
              <em
                className="not-italic"
                style={{ fontStyle: 'italic', fontVariationSettings: "'opsz' 144" }}
              >
                effectively
              </em>
              , and measurably.
            </h1>
            <p
              className="mx-auto mt-6 text-muted-foreground lg:mx-0"
              style={{ fontSize: '1.125rem', lineHeight: '1.55', maxWidth: '38ch' }}
            >
              Role-based AI training with a built-in coach, real assignments, and reporting your CIO
              will actually open.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="mailto:hello@levelup.example">Get a demo</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              No credit card required. Pilot in under 30 days.
            </p>
          </div>

          {/* Visual column — animated progress simulation */}
          <div className="w-full max-w-lg flex-shrink-0 lg:max-w-md lg:flex-1">
            <ProgressSimCard />
          </div>
        </div>
      </div>

      {/* Faint divider that fades in from both edges */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent 0%, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent 100%)',
        }}
      />
    </section>
  );
}

function ProgressSimCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-hidden="true">
      <style>{`
        @keyframes fill-1 {
          0%   { width: 0%; }
          40%  { width: 82%; }
          90%  { width: 82%; }
          100% { width: 0%; }
        }
        @keyframes fill-2 {
          0%   { width: 0%; }
          40%  { width: 64%; }
          90%  { width: 64%; }
          100% { width: 0%; }
        }
        @keyframes fill-3 {
          0%   { width: 0%; }
          40%  { width: 91%; }
          90%  { width: 91%; }
          100% { width: 0%; }
        }
        @keyframes fill-4 {
          0%   { width: 0%; }
          40%  { width: 47%; }
          90%  { width: 47%; }
          100% { width: 0%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar-fill { animation: none !important; width: 72% !important; }
        }
      `}</style>

      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Team AI Readiness
      </p>

      {[
        { label: 'Prompt Engineering', pct: '82%', animClass: 'fill-1', delay: '0s' },
        { label: 'Safe Usage Policy', pct: '64%', animClass: 'fill-2', delay: '0.4s' },
        { label: 'Data Privacy', pct: '91%', animClass: 'fill-3', delay: '0.8s' },
        { label: 'Agentic Workflows', pct: '47%', animClass: 'fill-4', delay: '1.2s' },
      ].map(({ label, pct, animClass, delay }) => (
        <div key={label} className="mb-4 last:mb-0">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-foreground">{label}</span>
            <span className="tabular-nums text-muted-foreground">{pct}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bar-fill h-full rounded-full bg-primary"
              style={{
                animation: `${animClass} 6s ${delay} ease-in-out infinite`,
              }}
            />
          </div>
        </div>
      ))}

      <div className="mt-5 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-xs text-muted-foreground">24 employees completed a module today</span>
      </div>
    </div>
  );
}
