import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { MonoLabel } from '@levelup/ui';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { Footer } from '@/components/marketing/footer';
import { env } from '@/lib/env';
import { brand } from '@/lib/client';

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
            alt: `${holderName} — ${pathTitle} | ${brand.name}`,
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
    title: `Certificate Verification | ${brand.name}`,
    description: 'Verified certificate of completion.',
  };
}

export default async function CertificateVerifyPage({ params }: PageProps) {
  const { hash } = await params;
  const result = await fetchVerification(hash);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink-900 text-paper-100">
      <div
        className="bg-blueprint pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />

      <div className="relative z-20">
        <MarketingNav />
      </div>

      <main
        className="relative z-20 flex flex-1 items-center justify-center px-4 py-16 sm:py-24"
        id="main-content"
      >
        {result.status === 'unavailable' && <UnavailableCard />}
        {result.status === 'invalid' && <InvalidCard hash={hash} />}
        {result.status === 'valid' && <ValidCard certificate={result.certificate} hash={hash} />}
      </main>

      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
}

function ValidCard({ certificate, hash }: { certificate: CertificateData; hash: string }) {
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-xl rounded-md border border-ink-500 bg-ink-800 p-10 sm:p-14 text-center">
      <div className="mb-8 inline-flex items-center gap-2 border border-success/40 bg-transparent px-3 py-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.5} />
        VERIFIED · CERTIFIED
      </div>

      <MonoLabel tone="signal">CERTIFICATE OF COMPLETION</MonoLabel>

      <h1 className="mt-5 font-serif text-display-lg italic leading-[1.05] text-paper-100">
        {certificate.holderName}
      </h1>

      <p className="mt-4 font-sans text-body-lg text-paper-100">
        Completed <span className="italic font-serif">{certificate.pathTitle}</span>
      </p>

      <div className="my-10 flex items-center justify-center gap-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
        <span>ISSUED · {certificate.organizationName}</span>
        <span aria-hidden="true">·</span>
        <span>{issuedDate}</span>
      </div>

      <div className="border-t border-ink-600 pt-6">
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          VERIFICATION ID
        </p>
        <p className="mt-2 break-all font-mono text-xs text-paper-300">{hash}</p>
      </div>
    </div>
  );
}

function InvalidCard({ hash }: { hash: string }) {
  return (
    <div className="w-full max-w-xl rounded-md border border-danger/40 bg-ink-800 p-10 sm:p-14 text-center">
      <div className="mb-8 inline-flex items-center gap-2 border border-danger/40 bg-transparent px-3 py-1 font-mono text-mono-sm uppercase tracking-[0.05em] text-danger">
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.5} />
        VERIFICATION FAILED
      </div>

      <h1 className="font-serif text-display-md italic text-paper-100">Certificate not valid.</h1>

      <p className="mt-4 font-sans text-body text-paper-300">
        This certificate could not be verified. The hash may be tampered or the certificate has been
        revoked.
      </p>

      <div className="my-10 border-t border-ink-600 pt-6">
        <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          SUBMITTED HASH
        </p>
        <p className="mt-2 break-all font-mono text-xs text-paper-300">{hash}</p>
      </div>

      <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
        IF YOU BELIEVE THIS IS AN ERROR, REACH{' '}
        <a
          href="mailto:hello@ailevel.app"
          className="text-signal underline-offset-2 hover:underline"
        >
          HELLO@AILEVEL.APP
        </a>
      </p>
    </div>
  );
}

function UnavailableCard() {
  return (
    <div className="w-full max-w-xl rounded-md border border-ink-500 bg-ink-800 p-10 sm:p-14 text-center">
      <MonoLabel>SIGNAL UNAVAILABLE</MonoLabel>

      <h1 className="mt-5 font-serif text-display-md italic text-paper-100">
        Verification temporarily unreachable.
      </h1>

      <p className="mt-4 font-sans text-body text-paper-300">
        Our verification service is momentarily offline. Please try again in a few minutes.
      </p>

      <p className="mt-6 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
        IF THE PROBLEM PERSISTS, REACH{' '}
        <a
          href="mailto:hello@ailevel.app"
          className="text-signal underline-offset-2 hover:underline"
        >
          HELLO@AILEVEL.APP
        </a>
      </p>

      <div className="mt-10 border-t border-ink-600 pt-6">
        <Link
          href="/"
          className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-100 transition-colors duration-[120ms] ease-mission hover:text-signal"
        >
          ← RETURN TO LEVELUP AI ACADEMY
        </Link>
      </div>
    </div>
  );
}
