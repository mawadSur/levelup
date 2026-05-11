import type { Metadata } from 'next';
import { Instrument_Serif, Manrope } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from '@levelup/ui';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GrainOverlay } from '@/components/atmosphere/grain-overlay';
import { IS_KAPITUS, brand } from '@/lib/client';
import './globals.css';
import '@levelup/ui/styles/kapitus';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
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
    : 'bg-ink-900 text-paper-100 font-sans antialiased';
  const bodyStyle = IS_KAPITUS
    ? { fontFamily: 'var(--font-manrope), system-ui, sans-serif' }
    : undefined;

  return (
    <html lang="en" suppressHydrationWarning className={htmlClass}>
      <body className={bodyClass} data-theme={IS_KAPITUS ? 'kapitus' : undefined} style={bodyStyle}>
        <ThemeProvider>
          {children}
          <Toaster />
          {IS_KAPITUS ? null : <GrainOverlay />}
        </ThemeProvider>
      </body>
    </html>
  );
}
