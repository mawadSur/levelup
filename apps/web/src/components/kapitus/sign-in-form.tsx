'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

const FIELD_INPUT =
  'h-11 w-full rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-3.5 text-base text-kp-ink placeholder:text-kp-ink-faint shadow-[inset_0_1px_0_rgba(15,23,42,0.02)] transition-colors duration-150 ease-kp-out focus:border-kp-purple focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-kp-purple/30 disabled:cursor-not-allowed disabled:opacity-60';

interface KapitusSignInFormProps {
  redirect?: string;
  initialEmail?: string;
}

export function KapitusSignInForm({ redirect, initialEmail }: KapitusSignInFormProps) {
  const router = useRouter();
  const stubMode = !isSupabaseConfiguredOnClient();

  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (stubMode) {
      await handleStubSignIn();
      return;
    }

    if (password.length === 0) {
      setError('Enter a password, or use the magic link button below.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(redirect ?? '/learn');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError('');
    if (email.length === 0) {
      setError('Enter your email first.');
      return;
    }
    if (stubMode) {
      await handleStubSignIn();
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${redirect ?? '/learn'}`
          : undefined;
      const { error: magicErr } = await supabase.auth.signInWithOtp({
        email,
        ...(redirectTo !== undefined ? { options: { emailRedirectTo: redirectTo } } : {}),
      });
      if (magicErr) {
        setError(magicErr.message);
        return;
      }
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleStubSignIn() {
    if (email.length === 0) {
      setError('Enter your email to use dev-bypass sign-in.');
      return;
    }
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/auth/dev-bypass`);
      url.searchParams.set('email', email);
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Dev-bypass request failed');
      }
      const data = (await res.json()) as { accessToken: string; redirectTo: string };
      window.localStorage.setItem('levelup_dev_access_token', data.accessToken);
      router.push(redirect ?? data.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {stubMode && (
        <div className="rounded-kp-sm border border-kp-rule bg-kp-cream px-4 py-3">
          <p className="kp-body-sm font-semibold text-kp-ink">Dev bypass &middot; stub mode</p>
          <p className="kp-body-sm mt-1 text-kp-ink-soft">
            Supabase Auth isn&rsquo;t configured here. Sign-in mints a fake token via the dev-bypass
            route.
          </p>
        </div>
      )}

      {magicLinkSent && (
        <div className="rounded-kp-sm border border-[rgb(var(--kp-success)_/_0.4)] bg-[rgb(var(--kp-success)_/_0.08)] px-4 py-3">
          <p className="kp-body-sm font-semibold text-kp-success">Magic link sent</p>
          <p className="kp-body-sm mt-1 text-kp-ink-soft">
            Check <strong>{email}</strong> and click the link to sign in.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-kp-sm border border-kp-danger/30 bg-[rgb(var(--kp-danger)_/_0.05)] px-4 py-3">
          <p className="kp-body-sm font-semibold text-kp-danger">We couldn&rsquo;t sign you in.</p>
          <p className="kp-body-sm mt-1 text-kp-ink-soft">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kp-signin-email" className="kp-body-sm font-medium text-kp-ink">
            Work email
          </label>
          <input
            id="kp-signin-email"
            type="email"
            className={FIELD_INPUT}
            autoComplete="email"
            placeholder="you@kapitus.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {!stubMode && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kp-signin-password" className="kp-body-sm font-medium text-kp-ink">
              Password
            </label>
            <input
              id="kp-signin-password"
              type="password"
              className={FIELD_INPUT}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-kp-sm bg-kp-purple-deep px-6 text-base font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Signing in…' : stubMode ? 'Continue (dev bypass)' : 'Sign in'}
        </button>

        {!stubMode && (
          <button
            type="button"
            disabled={loading}
            onClick={handleMagicLink}
            className="inline-flex h-11 w-full items-center justify-center rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-6 text-base font-medium text-kp-ink transition-colors duration-200 ease-kp-out hover:bg-kp-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple disabled:cursor-not-allowed disabled:opacity-70"
          >
            Send magic link instead
          </button>
        )}
      </form>
    </div>
  );
}
