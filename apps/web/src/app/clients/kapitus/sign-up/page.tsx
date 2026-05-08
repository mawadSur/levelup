import type { Metadata } from 'next';
import Link from 'next/link';
import { KapitusSignUpForm } from '@/components/kapitus/sign-up-form';

export const metadata: Metadata = {
  title: 'Create your Kapitus account',
};

export default function KapitusSignUpPage() {
  return (
    <div className="bg-kp-mist py-16 lg:py-24">
      <div className="mx-auto w-full max-w-xl px-6 sm:px-8">
        <div className="rounded-kp-lg border border-kp-rule bg-kp-paper p-8 shadow-kp-sm sm:p-10">
          <p className="kp-eyebrow text-kp-purple">For Kapitus</p>
          <h1 className="kp-h1 mt-3 text-kp-ink">Create your account.</h1>
          <p className="kp-body mt-3 text-kp-ink-soft">
            Stand up your workspace. Invite your team after you sign in.
          </p>

          <div className="mt-8">
            <KapitusSignUpForm />
          </div>

          <div className="mt-8 border-t border-kp-rule pt-6">
            <p className="kp-body-sm text-kp-ink-soft">
              Already have an account?{' '}
              <Link
                href="/clients/kapitus/sign-in"
                className="font-medium text-kp-purple underline-offset-2 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="kp-body-sm mt-6 text-center text-kp-ink-mute">
          Your data is processed under our standard DPA. Industry pre-set to
          Financial services.
        </p>
      </div>
    </div>
  );
}
