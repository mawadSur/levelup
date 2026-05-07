'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent } from '@levelup/ui';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to monitoring service in production
    console.error('[GlobalError]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          {/* Icon */}
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden="true"
          >
            <svg
              className="h-7 w-7 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong.</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. We&apos;ve been notified and are looking into it.
            </p>
          </div>

          {/* Dev-only error detail */}
          {isDev && error.message && (
            <pre className="rounded-md bg-muted px-4 py-3 text-left text-xs text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
