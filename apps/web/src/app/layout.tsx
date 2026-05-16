import type { Metadata } from 'next';
import { Instrument_Serif, Manrope } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from '@levelup/ui';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GrainOverlay } from '@/components/atmosphere/grain-overlay';
import { IS_KAPITUS, IS_CEOLAWYER, brand } from '@/lib/client';
import './globals.css';
import '@levelup/ui/styles/kapitus';
import '@levelup/ui/styles/ceolawyer';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

// CWV fix (Wave 4): Manrope was loading 7 weight files (200–800) but the
// design system only uses 400/500/600/700. Trimming the weight list cuts the
// preload size by ~57% and reduces LCP "Render Delay" caused by font-swap
// reflow on text-heavy pages (Kapitus sign-in, /pricing). See
// docs/qa/cwv-baseline-wave-4.md for the before/after numbers.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: brand.metaTitleDefault,
    template: brand.metaTitleTemplate,
  },
  description: brand.description,
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const htmlClass = `${instrumentSerif.variable} ${GeistSans.variable} ${GeistMono.variable} ${manrope.variable}`;
  const bodyClass = IS_KAPITUS
    ? 'kapitus bg-kp-paper text-kp-ink antialiased'
    : IS_CEOLAWYER
      ? 'ceolawyer bg-cl-paper text-cl-ink antialiased'
      : 'bg-ink-900 text-paper-100 font-sans antialiased';
  const bodyStyle =
    IS_KAPITUS || IS_CEOLAWYER
      ? { fontFamily: 'var(--font-manrope), system-ui, sans-serif' }
      : undefined;
  const dataTheme = IS_KAPITUS ? 'kapitus' : IS_CEOLAWYER ? 'ceolawyer' : undefined;

  return (
    <html lang="en" suppressHydrationWarning className={htmlClass}>
      <body className={bodyClass} data-theme={dataTheme} style={bodyStyle}>
        <ThemeProvider>
          {children}
          <Toaster />
          {IS_KAPITUS || IS_CEOLAWYER ? null : <GrainOverlay />}
        </ThemeProvider>
      </body>
    </html>
  );
}
