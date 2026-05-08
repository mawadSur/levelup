'use client';

import Link from 'next/link';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PrimaryCta {
  label: string;
  href: string;
}

interface StepCardProps {
  step: number;
  total: number;
  copy: string;
  primaryCta?: PrimaryCta;
  /** Called when the primary CTA is activated (no href) or after navigation (with href). */
  onAdvance: () => void;
  /** Called when the user clicks Skip / Dismiss. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Component — pure presentational
// ---------------------------------------------------------------------------

export function StepCard({ step, total, copy, primaryCta, onAdvance, onDismiss }: StepCardProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Onboarding step ${step + 1} of ${total}`}
      className={[
        'relative z-[9999] w-72 rounded-lg border border-[#6B1A1A] bg-[#FAF6F0] p-5 shadow-xl',
        'font-sans',
      ].join(' ')}
    >
      {/* Step indicator */}
      <span className="absolute right-4 top-4 text-xs font-medium text-[#6B1A1A]/70">
        {step + 1}&nbsp;/&nbsp;{total}
      </span>

      {/* Copy — Fraunces for the first line, InterTight body */}
      <p
        className="mb-3 pr-12 font-serif text-sm font-semibold leading-snug text-[#1A1A1A]"
        style={{ fontFamily: 'var(--font-fraunces, serif)' }}
      >
        {copy}
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {primaryCta ? (
          <Link
            href={primaryCta.href}
            onClick={onAdvance}
            className="inline-flex h-8 items-center rounded-md bg-[#6B1A1A] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#7d2020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B1A1A]"
          >
            {primaryCta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex h-8 items-center rounded-md bg-[#6B1A1A] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#7d2020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B1A1A]"
          >
            Got it
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-8 items-center rounded-md border border-[#6B1A1A]/30 px-3 text-xs font-medium text-[#6B1A1A] transition-colors hover:bg-[#6B1A1A]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B1A1A]"
        >
          {step === total - 1 ? 'Dismiss' : 'Skip tour'}
        </button>
      </div>
    </div>
  );
}
