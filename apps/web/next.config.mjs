/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@levelup/ui', '@levelup/types', '@levelup/auth-client'],
  experimental: {
    reactCompiler: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // i18n (CR.38) — locale list lives in `src/lib/i18n.ts` (SUPPORTED_LOCALES)
  // and `middleware.ts`. The legacy `next.config` `i18n` field is a Pages-Router
  // knob; setting it on App Router on Vercel was empirically observed to break
  // the `/api/:path*` rewrite to the Render API (E2E went 6/6 → 0/6 after
  // adding it). Keep the locale list out of this file.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
