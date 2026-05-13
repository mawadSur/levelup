import Link from 'next/link';
import { clRoutes } from './routes';

export function CeoLawyerFinalCta() {
  return (
    <section className="bg-cl-dark-band">
      <div className="mx-auto max-w-cl-container px-6 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="cl-eyebrow text-cl-gold">Fighting for outcomes</p>
            <h2 className="cl-h1 mt-3 text-white">Schedule a 20-minute walkthrough.</h2>
            <p className="cl-body-lg mt-5 max-w-cl-reading text-white/80">
              See the curriculum, the coach, and the firm dashboard with one of our team.
              We&rsquo;ll leave you with a sample evidence report tailored to a personal injury
              practice &mdash; and a clear answer on whether this fits your firm.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <Link
              href={clRoutes.signUp}
              className="inline-flex items-center justify-center rounded-cl-sm bg-cl-gold px-6 py-3 text-base font-semibold text-cl-navy-deep shadow-cl-sm transition-colors duration-200 ease-cl-out hover:bg-cl-gold-deep hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Schedule a walkthrough
            </Link>
            <Link
              href={clRoutes.signIn}
              className="cl-body-sm text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Already enrolled? Sign in &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
