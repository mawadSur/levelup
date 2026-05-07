import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@levelup/ui';
import { Button, Alert, AlertDescription } from '@levelup/ui';

export const metadata: Metadata = {
  title: 'Sign-in error',
};

// Human-readable explanations for common Supabase / OAuth error codes.
const ERROR_LABELS: Record<string, string> = {
  access_denied: 'Access was denied by your identity provider.',
  invalid_client: 'There is a configuration issue with this application.',
  invalid_grant: 'The authorization code has already been used or has expired.',
  server_error: 'An unexpected error occurred on the authentication server.',
  temporarily_unavailable: 'The authentication service is temporarily unavailable.',
  otp_expired: 'Your magic link has expired. Request a new one.',
};

interface CallbackErrorPageProps {
  searchParams: Promise<{ code?: string; message?: string }>;
}

export default async function CallbackErrorPage({ searchParams }: CallbackErrorPageProps) {
  const { code, message } = await searchParams;

  const friendlyMessage =
    message ??
    (code
      ? (ERROR_LABELS[code] ?? `Error code: ${code}`)
      : 'An unknown error occurred during sign-in.');

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Sign-in failed</CardTitle>
        <CardDescription>We couldn&apos;t complete your sign-in. Please try again.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertDescription>{friendlyMessage}</AlertDescription>
        </Alert>

        {code && (
          <p className="text-xs text-muted-foreground">
            Error code: <code className="rounded bg-muted px-1 py-0.5 font-mono">{code}</code>
          </p>
        )}

        <Button asChild className="w-full">
          <Link href="/sign-in">Try signing in again</Link>
        </Button>
      </CardContent>

      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Need help?{' '}
          <a
            href="mailto:support@levelup.example"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Contact support
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
