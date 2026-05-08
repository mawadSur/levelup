import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, MonoLabel } from '@levelup/ui';

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
    <div className="space-y-10">
      <div>
        <MonoLabel tone="danger" className="mb-4 block">
          MISSION BRIEF / FAULT
        </MonoLabel>
        <h1 className="font-serif text-display-md text-paper-100">
          Something <em className="italic text-danger">disconnected.</em>
        </h1>
        <p className="mt-3 text-body-sm text-paper-300">
          We could not complete your sign-in. The handshake with your identity provider failed
          partway through.
        </p>
      </div>

      <div className="border border-danger/40 bg-ink-800 p-6">
        <div className="mb-4 flex items-center justify-between border-b border-ink-600 pb-3">
          <MonoLabel tone="danger">FAULT REPORT</MonoLabel>
          <MonoLabel className="text-paper-500">
            CODE · {code ? code.toUpperCase() : 'UNKNOWN'}
          </MonoLabel>
        </div>
        <p className="text-body-sm text-paper-100">{friendlyMessage}</p>
      </div>

      <div className="space-y-3">
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/sign-in">RETRY SIGN-IN →</Link>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/">RETURN HOME</Link>
        </Button>
      </div>

      <div className="border-t border-ink-600 pt-6">
        <MonoLabel className="block text-paper-500">NEED HELP?</MonoLabel>
        <p className="mt-2 text-body-sm text-paper-300">
          <a
            href="mailto:support@levelup.example"
            className="font-mono uppercase tracking-[0.05em] text-signal underline-offset-4 hover:underline"
          >
            CONTACT SUPPORT →
          </a>
        </p>
      </div>
    </div>
  );
}
