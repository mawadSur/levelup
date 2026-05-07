import type { Metadata } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@levelup/ui';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GrainOverlay } from '@/components/atmosphere/grain-overlay';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LevelUp AI Academy',
    template: '%s | LevelUp AI Academy',
  },
  description: 'Train every employee to use AI safely, effectively, and measurably in 30 days.',
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
      className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
          <GrainOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
