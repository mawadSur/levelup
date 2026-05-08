import type { Metadata } from 'next';
import Link from 'next/link';
import { MonoLabel } from '@levelup/ui';
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form';

export const metadata: Metadata = {
  title: 'Accept invitation',
};

interface InvitationPreview {
  inviterName: string;
  orgName: string;
  role: string;
  email: string;
}

async function fetchInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${apiBase}/api/invitations/preview/${token}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<InvitationPreview>;
  } catch {
    return null;
  }
}

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string; redirect?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const { token, redirect } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-8">
        <div>
          <MonoLabel className="mb-4 block text-paper-500">
            MISSION BRIEF / INVITATION
          </MonoLabel>
          <h1 className="font-serif text-display-md text-paper-100">
            <em className="italic text-danger">Token missing.</em>
          </h1>
          <p className="mt-3 text-body-sm text-paper-300">
            This link appears to be missing an invitation token. If you received an invitation
            email, make sure you clicked the full link. Otherwise, ask your admin to resend.
          </p>
        </div>
        <div className="border-t border-ink-600 pt-6">
          <Link
            href="/sign-in"
            className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal underline-offset-4 hover:underline"
          >
            BACK TO SIGN IN →
          </Link>
        </div>
      </div>
    );
  }

  const preview = await fetchInvitationPreview(token);

  return (
    <div className="space-y-10">
      <div>
        <MonoLabel className="mb-4 block text-paper-500">MISSION BRIEF / INVITATION</MonoLabel>
        <h1 className="font-serif text-display-md text-paper-100">
          You&apos;ve been <em className="italic text-signal">drafted.</em>
        </h1>
        {preview ? (
          <div className="mt-5 space-y-3 border border-ink-600 bg-ink-800 p-5">
            <MonoLabel tone="signal" className="block">
              JOINING: {preview.orgName.toUpperCase()}
            </MonoLabel>
            <p className="text-body-sm text-paper-300">
              <span className="text-paper-100">{preview.inviterName}</span> has invited you as a{' '}
              <span className="text-paper-100">{preview.role.toLowerCase()}</span>.
            </p>
            <MonoLabel className="block text-paper-500">
              EMAIL: {preview.email.toUpperCase()}
            </MonoLabel>
          </div>
        ) : (
          <p className="mt-3 text-body-sm text-paper-300">
            Enter your name to create your account and join your team.
          </p>
        )}
      </div>

      <AcceptInvitationForm token={token} defaultRedirect={redirect ?? '/learn'} />

      <div className="border-t border-ink-600 pt-6">
        <MonoLabel className="block text-paper-500">ALREADY HAVE AN ACCOUNT?</MonoLabel>
        <p className="mt-2 text-body-sm text-paper-300">
          <Link
            href="/sign-in"
            className="font-mono uppercase tracking-[0.05em] text-signal underline-offset-4 hover:underline"
          >
            SIGN IN →
          </Link>
        </p>
      </div>
    </div>
  );
}
