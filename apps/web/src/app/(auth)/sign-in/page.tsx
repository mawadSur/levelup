import type { Metadata } from 'next';
import Link from 'next/link';
import { MonoLabel } from '@levelup/ui';
import { SignInForm } from '@/components/auth/sign-in-form';
import { IS_KAPITUS } from '@/lib/client';
import { KapitusSignInPanel } from '@/components/kapitus/auth-shell';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface SignInPageProps {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect, email } = await searchParams;

  if (IS_KAPITUS) {
    return <KapitusSignInPanel redirect={redirect} initialEmail={email} />;
  }

  return (
    <div className="space-y-10">
      <div>
        <MonoLabel className="mb-4 block text-paper-500">MISSION BRIEF / SIGN IN</MonoLabel>
        <h1 className="font-serif text-display-md text-paper-100">
          Welcome back, <em className="italic text-signal">operator.</em>
        </h1>
        <p className="mt-3 text-body-sm text-paper-300">
          Sign in with the email tied to your work account.
        </p>
      </div>

      <SignInForm redirect={redirect} />

      <div className="border-t border-ink-600 pt-6">
        <MonoLabel className="block text-paper-500">NEW HERE?</MonoLabel>
        <p className="mt-2 text-body-sm text-paper-300">
          <Link
            href="/sign-up"
            className="font-mono uppercase tracking-[0.05em] text-signal underline-offset-4 hover:underline"
          >
            CREATE AN ORGANIZATION →
          </Link>
        </p>
      </div>
    </div>
  );
}
