import Link from 'next/link';
import { IS_KAPITUS } from '@/lib/client';

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
  contactEmail: string;
}

export function LegalPage({ eyebrow, title, lastUpdated, intro, contactEmail }: LegalPageProps) {
  if (IS_KAPITUS) {
    return (
      <article className="mx-auto max-w-kp-reading px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <p className="kp-eyebrow text-kp-purple-deep">{eyebrow}</p>
        <h1 className="kp-display mt-5 text-kp-ink">{title}</h1>
        <p className="kp-body-sm mt-3 text-kp-ink-mute">Last updated: {lastUpdated}</p>

        <div className="mt-10 rounded-kp-md border border-kp-rule bg-kp-mist p-6 sm:p-8">
          <p className="kp-eyebrow text-kp-ink-soft">Draft</p>
          <p className="kp-body mt-3 text-kp-ink">
            This document is being drafted by Kapitus legal. The terms that apply to your use of the
            academy are governed by your existing Kapitus employment agreement and the policies in
            the Kapitus employee handbook.
          </p>
          <p className="kp-body mt-4 text-kp-ink">
            For questions in the meantime,{' '}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-kp-purple-deep underline underline-offset-2 hover:text-kp-purple"
            >
              email {contactEmail}
            </a>
            .
          </p>
        </div>

        <div className="mt-12">
          <p className="kp-body text-kp-ink-soft">{intro}</p>
        </div>

        <div className="mt-14 border-t border-kp-rule pt-8">
          <Link
            href="/"
            className="kp-body-sm text-kp-ink-soft transition-colors hover:text-kp-ink"
          >
            ← Back to the academy
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-20 lg:py-28">
      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal">{eyebrow}</p>
      <h1 className="mt-5 font-serif text-display-md text-paper-100">{title}</h1>
      <p className="mt-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
        Last updated: {lastUpdated}
      </p>

      <div className="mt-10 rounded-data border border-ink-600 bg-ink-800 p-6 sm:p-8">
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">Draft</p>
        <p className="mt-3 text-body text-paper-100">
          This document is in draft. For questions in the meantime,{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium text-signal underline underline-offset-2 hover:text-signal-dim"
          >
            email {contactEmail}
          </a>
          .
        </p>
      </div>

      <div className="mt-12">
        <p className="text-body text-paper-300">{intro}</p>
      </div>

      <div className="mt-14 border-t border-ink-600 pt-8">
        <Link
          href="/"
          className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500 transition-colors hover:text-paper-100"
        >
          ← Back to base
        </Link>
      </div>
    </article>
  );
}
