import Link from 'next/link';
import { kRoutes } from './routes';

export function KapitusFinalCta() {
  return (
    <section className="bg-kp-dark-band">
      <div className="mx-auto max-w-kp-container px-6 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="kp-h1 text-white">Bring AI safely into Kapitus.</h2>
            <p className="kp-body-lg mt-5 max-w-kp-reading text-white/80">
              Thirty minutes with our team. We&rsquo;ll walk through the governance dashboard, scope
              a pilot for your team, and show you what audit-ready evidence looks like.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <Link
              href="mailto:hello@ailevel.app?subject=Kapitus%20%E2%80%94%2030-min%20call"
              className="inline-flex items-center justify-center rounded-kp-sm bg-kp-purple-deep px-6 py-3 text-base font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Schedule A 30-Minute Call
            </Link>
            <Link
              href={kRoutes.signUp}
              className="kp-body-sm text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Or start the pilot account &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
