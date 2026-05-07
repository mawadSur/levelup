import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@levelup/ui';
import { Badge } from '@levelup/ui';
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form';

export const metadata: Metadata = {
  title: 'Accept invitation',
};

// ---------------------------------------------------------------------------
// Preview shape returned by GET /api/invitations/preview/:token
// ---------------------------------------------------------------------------
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
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Invitation not found</CardTitle>
          <CardDescription>This link appears to be missing an invitation token.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you received an invitation email, make sure you clicked the full link. Otherwise, ask
            your admin to resend the invitation.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const preview = await fetchInvitationPreview(token);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">You've been invited</CardTitle>
        {preview ? (
          <CardDescription>
            <span className="font-medium text-foreground">{preview.inviterName}</span> invited you
            to <span className="font-medium text-foreground">{preview.orgName}</span> as{' '}
            <Badge variant="secondary" className="align-middle text-xs">
              {preview.role}
            </Badge>
          </CardDescription>
        ) : (
          <CardDescription>
            Enter your name to create your account and join your team.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <AcceptInvitationForm token={token} defaultRedirect={redirect ?? '/learn'} />
      </CardContent>

      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Sign in →
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
