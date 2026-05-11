import Link from 'next/link';
import { KapitusSignInForm } from './sign-in-form';
import { KapitusSignUpForm } from './sign-up-form';
import { kRoutes } from './routes';

export function KapitusSignInPanel({
  redirect,
  initialEmail,
}: {
  redirect?: string;
  initialEmail?: string;
}) {
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
            <KapitusSignInForm redirect={redirect} initialEmail={initialEmail} />
          </div>

          <div className="mt-8 border-t border-kp-rule pt-6">
            <p className="kp-body-sm text-kp-ink-soft">
              New here?{' '}
              <Link
                href={kRoutes.signUp}
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

export function KapitusSignUpPanel() {
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
                href={kRoutes.signIn}
                className="font-medium text-kp-purple underline-offset-2 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="kp-body-sm mt-6 text-center text-kp-ink-mute">
          Your data is processed under our standard DPA. Industry pre-set to Financial services.
        </p>
      </div>
    </div>
  );
}
