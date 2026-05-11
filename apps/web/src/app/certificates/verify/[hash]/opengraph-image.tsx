import { ImageResponse } from 'next/og';
import { brand } from '@/lib/client';

export const runtime = 'edge';
export const alt = `${brand.name} — Verified Certificate`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
  | { status: 'invalid' | 'unavailable' };

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchVerification(hash: string): Promise<VerifyResult> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    const res = await fetch(`${apiUrl}/certificates/verify/${encodeURIComponent(hash)}`, {
      cache: 'no-store',
    });

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
// OG image
// ---------------------------------------------------------------------------

export default async function Image({ params }: { params: { hash: string } }) {
  const result = await fetchVerification(params.hash);

  // Attempt to load Inter Bold from Google Fonts for a richer rendering.
  // If the fetch fails we fall back to the system sans-serif stack gracefully.
  let fontData: ArrayBuffer | null = null;
  try {
    const fontRes = await fetch(
      'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff',
      { cache: 'force-cache' },
    );
    if (fontRes.ok) {
      fontData = await fontRes.arrayBuffer();
    }
  } catch {
    // Font fetch failed — system fonts will be used
  }

  // ---------------------------------------------------------------------------
  // Shared design tokens (inline, edge-safe)
  // ---------------------------------------------------------------------------
  const oxblood = '#6b1a26'; // hsl(347 60% 27%)
  const bone = '#f0ebe0'; // hsl(36 33% 93%)
  const boneCard = '#f7f4ee'; // hsl(36 33% 96%)
  const darkInk = '#1a1410'; // hsl(24 14% 8%)
  const mutedText = '#6b6359'; // hsl(24 8% 36%)
  const borderColor = '#cbc4b8'; // hsl(30 12% 80%)

  if (result.status !== 'valid') {
    // ---------------------------------------------------------------------------
    // Invalid / unavailable — muted greyscale variant
    // ---------------------------------------------------------------------------
    const label =
      result.status === 'invalid'
        ? 'Certificate could not be verified'
        : 'Verification temporarily unavailable';

    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#e8e5e0',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Inter", system-ui, sans-serif',
        }}
      >
        {/* Greyscale radial */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(100,95,90,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #c0bab4',
            borderRadius: '20px',
            backgroundColor: '#f0ede8',
            padding: '60px 80px',
            maxWidth: '900px',
            textAlign: 'center',
          }}
        >
          {/* X icon proxy */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(100,95,90,0.12)',
              fontSize: '28px',
              marginBottom: '24px',
              color: '#6a6560',
            }}
          >
            ✗
          </div>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 700,
              color: '#3a3530',
              lineHeight: 1.1,
            }}
          >
            {label}
          </div>

          <div
            style={{
              marginTop: '48px',
              fontSize: '16px',
              color: '#7a7570',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {brand.name}
          </div>
        </div>
      </div>,
      {
        ...size,
        ...(fontData
          ? { fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }] }
          : {}),
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Valid certificate — oxblood-bone design
  // ---------------------------------------------------------------------------
  const { holderName, pathTitle, organizationName, issuedAt } = result.certificate;

  const issuedDate = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: bone,
        fontFamily: '"Inter", system-ui, sans-serif',
        position: 'relative',
      }}
    >
      {/* Oxblood radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 55% at 50% 35%, rgba(107,26,38,0.09) 0%, transparent 70%)',
        }}
      />

      {/* Top strip — "CERTIFIED" badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          position: 'absolute',
          top: '48px',
          left: '72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: `${oxblood}14`,
            borderRadius: '999px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 700,
            color: oxblood,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          ✓ Certified
        </div>
      </div>

      {/* Center card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '80px 100px 60px',
          textAlign: 'center',
        }}
      >
        {/* Holder name */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: darkInk,
            lineHeight: 1.0,
            letterSpacing: '-0.025em',
            marginBottom: '20px',
          }}
        >
          {holderName}
        </div>

        {/* Path title */}
        <div
          style={{
            fontSize: '26px',
            fontWeight: 500,
            color: darkInk,
            lineHeight: 1.25,
            marginBottom: '16px',
          }}
        >
          Completed {pathTitle}
        </div>

        {/* Issued line */}
        <div
          style={{
            fontSize: '16px',
            color: mutedText,
            marginBottom: '48px',
          }}
        >
          Issued by {organizationName} · {issuedDate}
        </div>

        {/* Decorative divider */}
        <div
          style={{
            width: '120px',
            height: '2px',
            backgroundColor: borderColor,
            borderRadius: '1px',
          }}
        />
      </div>

      {/* Bottom strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '72px',
          backgroundColor: oxblood,
          padding: '0 72px',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: boneCard,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Verified by {brand.name}
        </div>
      </div>
    </div>,
    {
      ...size,
      ...(fontData
        ? { fonts: [{ name: 'Inter', data: fontData, weight: 800, style: 'normal' }] }
        : {}),
    },
  );
}
