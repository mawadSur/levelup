import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertificateData {
  holderName: string;
  pathTitle: string;
  issuedAt: string;
  organizationName: string;
}

interface VerifyResponse {
  valid: boolean;
  certificate?: CertificateData;
}

type VerifyResult =
  | { status: 'valid'; certificate: CertificateData }
  | { status: 'invalid' }
  | { status: 'unavailable' };

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchVerification(hash: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/certificates/verify/${encodeURIComponent(hash)}`,
      { next: { revalidate: 300 } },
    );

    if (!res.ok) {
      return { status: 'invalid' };
    }

    const data: VerifyResponse = (await res.json()) as VerifyResponse;

    if (data.valid && data.certificate) {
      return { status: 'valid', certificate: data.certificate };
    }

    return { status: 'invalid' };
  } catch {
    return { status: 'unavailable' };
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { hash } = await params;
  const result = await fetchVerification(hash);

  if (result.status === 'valid') {
    const { holderName, pathTitle } = result.certificate;
    const title = `${holderName} — ${pathTitle}`;
    const description = 'Verified certificate of completion.';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        images: [
          {
            url: `/certificates/verify/${hash}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: `${holderName} — ${pathTitle} | LevelUp AI Academy`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  }

  return {
    title: 'Certificate Verification | LevelUp AI Academy',
    description: 'Verified certificate of completion.',
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function CertificateVerifyPage({ params }: PageProps) {
  const { hash } = await params;
  const result = await fetchVerification(hash);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[hsl(36_33%_93%)]">
      {/* Film grain overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          opacity: 0.04,
          zIndex: 10,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          <filter id="cert-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" in="noise" result="desaturated" />
            <feBlend in="SourceGraphic" in2="desaturated" mode="overlay" />
          </filter>
          <rect width="100%" height="100%" filter="url(#cert-grain)" />
        </svg>
      </div>

      {/* Slow oxblood radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 70% 55% at 50% 35%, hsl(347 60% 27% / 0.09) 0%, transparent 70%)',
          zIndex: 1,
          animation: 'cert-pulse 12s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes cert-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Nav */}
      <div className="relative z-20">
        <MarketingNav />
      </div>

      {/* Main content */}
      <main
        className="relative z-20 flex flex-1 items-center justify-center px-4 py-16 sm:py-24"
        id="main-content"
      >
        {result.status === 'unavailable' && <UnavailableCard />}
        {result.status === 'invalid' && <InvalidCard hash={hash} />}
        {result.status === 'valid' && <ValidCard certificate={result.certificate} hash={hash} />}
      </main>

      {/* Footer */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card variants
// ---------------------------------------------------------------------------

function ValidCard({ certificate, hash }: { certificate: CertificateData; hash: string }) {
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-xl rounded-2xl border border-[hsl(30_12%_80%)] bg-[hsl(36_33%_96%)] shadow-2xl shadow-[hsl(347_60%_27%/0.08)] p-8 sm:p-12 text-center">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[hsl(347_60%_27%/0.08)] px-4 py-1.5 text-sm font-semibold text-[hsl(347_60%_27%)]">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Certified ✓
      </div>

      {/* Holder name */}
      <h1
        className="font-display text-[48px] leading-[1.05] tracking-[-0.02em] text-[hsl(24_14%_8%)]"
        style={
          { fontOpticalSizing: 'auto', fontVariationSettings: '"opsz" 144' } as React.CSSProperties
        }
      >
        {certificate.holderName}
      </h1>

      {/* Path title */}
      <p className="mt-4 font-sans text-[18px] font-medium leading-snug text-[hsl(24_14%_8%)]">
        Completed {certificate.pathTitle}
      </p>

      {/* Issuer + date */}
      <p className="mt-3 text-sm text-[hsl(24_8%_36%)]">
        Issued by{' '}
        <span className="font-semibold text-[hsl(24_14%_8%)]">{certificate.organizationName}</span>{' '}
        on {issuedDate}
      </p>

      {/* Divider */}
      <div className="my-8 border-t border-[hsl(30_12%_80%)]" />

      {/* Verification hash */}
      <p className="text-xs text-[hsl(24_8%_36%)]">Verification ID</p>
      <p className="mt-1 font-mono text-xs text-[hsl(24_8%_50%)] break-all">{hash}</p>
    </div>
  );
}

function InvalidCard({ hash }: { hash: string }) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-[hsl(4_60%_38%/0.3)] bg-[hsl(36_33%_96%)] shadow-xl p-8 sm:p-12 text-center">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[hsl(4_60%_38%/0.08)] px-4 py-1.5 text-sm font-semibold text-[hsl(4_60%_38%)]">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Verification failed
      </div>

      <h1 className="font-display text-[32px] leading-[1.1] text-[hsl(24_14%_8%)]">
        Certificate not valid
      </h1>

      <p className="mt-4 text-sm leading-relaxed text-[hsl(24_8%_36%)]">
        This certificate could not be verified. The hash may be tampered or the certificate has been
        revoked.
      </p>

      {/* Divider */}
      <div className="my-8 border-t border-[hsl(30_12%_80%)]" />

      <p className="text-xs text-[hsl(24_8%_36%)]">Submitted hash</p>
      <p className="mt-1 font-mono text-xs text-[hsl(24_8%_50%)] break-all">{hash}</p>

      <p className="mt-8 text-xs text-[hsl(24_8%_36%)]">
        If you believe this is an error, contact{' '}
        <a href="mailto:hello@levelup.example" className="underline hover:text-[hsl(24_14%_8%)]">
          hello@levelup.example
        </a>
        .
      </p>
    </div>
  );
}

function UnavailableCard() {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-[hsl(30_12%_80%)] bg-[hsl(36_33%_96%)] shadow-xl p-8 sm:p-12 text-center">
      <h1 className="font-display text-[32px] leading-[1.1] text-[hsl(24_14%_8%)]">
        Verification temporarily unavailable
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[hsl(24_8%_36%)]">
        Our verification service is momentarily unreachable. Please try again in a few minutes. If
        the problem persists, contact{' '}
        <a href="mailto:hello@levelup.example" className="underline hover:text-[hsl(24_14%_8%)]">
          hello@levelup.example
        </a>
        .
      </p>

      <div className="mt-8">
        <Link href="/" className="text-sm font-medium text-[hsl(347_60%_27%)] hover:underline">
          ← Return to LevelUp AI Academy
        </Link>
      </div>
    </div>
  );
}
