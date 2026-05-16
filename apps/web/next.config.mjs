/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@levelup/ui', '@levelup/types', '@levelup/auth-client'],
  experimental: {
    reactCompiler: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // ---------------------------------------------------------------------------
  // i18n (CR.38) — declared here for documentation/intent. Next.js App Router
  // (we are NOT on the Pages Router) does NOT use this `i18n` field for runtime
  // routing; it is honoured only by the Pages Router. The actual locale
  // resolution happens in `middleware.ts` (reads `levelup-locale` cookie →
  // falls back to `Accept-Language`) and `src/lib/i18n.ts` (loads the message
  // bundle on the server). Listing locales here gives a single source of truth
  // that tooling and future migrations can read.
  //
  // `en` ships full messages, `es` ships a stub bundle, `fr`/`pt` are
  // placeholders that fall back to English at runtime. Lesson content
  // translation is a follow-up (see curriculum-rework-plan.md).
  // ---------------------------------------------------------------------------
  i18n: {
    locales: ['en', 'es', 'fr', 'pt'],
    defaultLocale: 'en',
    localeDetection: false,
  },
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
