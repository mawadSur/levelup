import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from '@levelup/ui';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GrainOverlay } from '@/components/atmosphere/grain-overlay';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LevelUp AI Academy — Train every operator',
    template: '%s · LevelUp AI Academy',
  },
  description:
    'A role-based AI curriculum, an in-context coach, and a reporting instrument your CIO will actually open. Pilot in thirty days. Prove the ROI by week three.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="bg-ink-900 text-paper-100 font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
          <GrainOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
