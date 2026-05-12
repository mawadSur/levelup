'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, MonoLabel } from '@levelup/ui';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-900 px-4 text-paper-100">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 pt-8 pb-6 text-center">
          <MonoLabel tone="danger">SYSTEM EXCEPTION</MonoLabel>
          <div className="space-y-2">
            <h1 className="font-serif text-display-md italic">Something disconnected.</h1>
            <p className="text-body-sm text-paper-300">
              An unexpected error occurred. We&apos;ve been notified.
            </p>
          </div>

          {isDev && error.message && (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-data border border-ink-600 bg-ink-800 px-4 py-3 text-left font-mono text-mono-sm text-paper-300">
              {error.message}
              {error.digest && `\n\nDIGEST · ${error.digest}`}
            </pre>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button onClick={reset} variant="primary">
              RETRY →
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
