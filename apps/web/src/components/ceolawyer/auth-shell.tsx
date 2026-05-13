import Link from 'next/link';
import { CeoLawyerSignInForm } from './sign-in-form';
import { CeoLawyerSignUpForm } from './sign-up-form';
import { clRoutes } from './routes';

export function CeoLawyerSignInPanel({
  redirect,
  initialEmail,
}: {
  redirect?: string;
  initialEmail?: string;
}) {
  return (
    <div className="bg-cl-surface py-16 lg:py-24">
      <div className="mx-auto w-full max-w-md px-6 sm:px-8">
        <div className="rounded-cl-lg border border-cl-rule bg-cl-paper p-8 shadow-cl-sm sm:p-10">
          <p className="cl-eyebrow text-cl-navy">CEO Lawyer AI Academy</p>
          <h1 className="cl-h1 mt-3 text-cl-ink">Welcome back.</h1>
          <p className="cl-body mt-3 text-cl-ink-soft">
            Sign in to keep sharpening your edge. Your progress, your coach, your firm.
          </p>

          <div className="mt-8">
            <CeoLawyerSignInForm redirect={redirect} initialEmail={initialEmail} />
          </div>

          <div className="mt-8 border-t border-cl-rule pt-6">
            <p className="cl-body-sm text-cl-ink-soft">
              New here?{' '}
              <Link
                href={clRoutes.signUp}
                className="font-medium text-cl-navy underline-offset-2 hover:underline"
              >
                Get started
              </Link>
            </p>
          </div>
        </div>

        <p className="cl-body-sm mt-6 text-center text-cl-ink-mute">
          Trouble signing in?{' '}
          <a
            href="mailto:training@ceolawyer.com"
            className="font-medium text-cl-navy underline underline-offset-2 hover:text-cl-navy-deep"
          >
            Contact your firm admin
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export function CeoLawyerSignUpPanel() {
  return (
    <div className="bg-cl-surface py-16 lg:py-24">
      <div className="mx-auto w-full max-w-xl px-6 sm:px-8">
        <div className="rounded-cl-lg border border-cl-rule bg-cl-paper p-8 shadow-cl-sm sm:p-10">
          <p className="cl-eyebrow text-cl-navy">CEO Lawyer AI Academy</p>
          <h1 className="cl-h1 mt-3 text-cl-ink">Get your team in the fight.</h1>
          <p className="cl-body mt-3 text-cl-ink-soft">
            One enrollment unlocks every learning path, the AI coach, and your firm dashboard. Takes
            about 90 seconds.
          </p>

          <div className="mt-8">
            <CeoLawyerSignUpForm />
          </div>

          <div className="mt-8 border-t border-cl-rule pt-6">
            <p className="cl-body-sm text-cl-ink-soft">
              Already have an account?{' '}
              <Link
                href={clRoutes.signIn}
                className="font-medium text-cl-navy underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="cl-body-sm mt-6 text-center text-cl-ink-mute">
          Use your firm email. Your progress stays inside your firm.
        </p>
      </div>
    </div>
  );
}
