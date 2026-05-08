import type { Metadata } from 'next';
import Link from 'next/link';
import { MonoLabel } from '@levelup/ui';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = {
  title: 'Create your organization',
};

export default function SignUpPage() {
  return (
    <div className="space-y-10">
      <div>
        <MonoLabel className="mb-4 block text-paper-500">MISSION BRIEF / ENROLL</MonoLabel>
        <h1 className="font-serif text-display-md text-paper-100">
          Provision a <em className="italic text-signal">new tenant.</em>
        </h1>
        <p className="mt-3 text-body-sm text-paper-300">
          Stand up your workspace. Invite the team after you sign in.
        </p>
        <div className="mt-5 border-t border-ink-600 pt-4">
          <MonoLabel className="text-paper-500">
            ALLOCATES 10 SEATS · 14-DAY TRIAL · CANCEL ANY TIME
          </MonoLabel>
        </div>
      </div>

      <SignUpForm />

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
