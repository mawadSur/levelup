import type { Metadata } from 'next';
import Link from 'next/link';
import { KapitusSignInForm } from '@/components/kapitus/sign-in-form';

export const metadata: Metadata = {
  title: 'Sign in to Kapitus',
};

interface PageProps {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

export default async function KapitusSignInPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  return (
    <div className="bg-kp-mist py-16 lg:py-24">
      <div className="mx-auto w-full max-w-md px-6 sm:px-8">
        <div className="rounded-kp-lg border border-kp-rule bg-kp-paper p-8 shadow-kp-sm sm:p-10">
          <p className="kp-eyebrow text-kp-purple">For Kapitus</p>
          <h1 className="kp-h1 mt-3 text-kp-ink">Welcome back.</h1>
          <p className="kp-body mt-3 text-kp-ink-soft">
            Sign in to manage your team&rsquo;s AI training and governance.
          </p>

          <div className="mt-8">
            <KapitusSignInForm
              redirect={resolved.redirect}
              initialEmail={resolved.email}
            />
          </div>

          <div className="mt-8 border-t border-kp-rule pt-6">
            <p className="kp-body-sm text-kp-ink-soft">
              New to LevelUp?{' '}
              <Link
                href="/clients/kapitus/sign-up"
                className="font-medium text-kp-purple underline-offset-2 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="kp-body-sm mt-6 text-center text-kp-ink-mute">
          Need help signing in?{' '}
          <a
            href="mailto:hello@ailevel.app"
            className="text-kp-purple underline-offset-2 hover:underline"
          >
            Contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}
