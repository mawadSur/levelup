'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { SignInResponse } from '@levelup/types';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ??
      (typeof window !== 'undefined' ? '' : 'http://localhost:4000'))
    : 'http://localhost:4000';

const FIELD_INPUT =
  'h-11 w-full rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-3.5 text-base text-kp-ink placeholder:text-kp-ink-faint shadow-[inset_0_1px_0_rgba(15,23,42,0.02)] transition-colors duration-150 ease-kp-out focus:border-kp-purple focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-kp-purple/30 disabled:cursor-not-allowed disabled:opacity-60';

const OAUTH_BUTTON =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-4 text-sm font-medium text-kp-ink transition-colors duration-150 ease-kp-out hover:bg-kp-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple disabled:cursor-not-allowed disabled:opacity-60';

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

  async function handleOAuth(provider: 'azure' | 'google') {
    setError('');
    if (stubMode) {
      // Dev-bypass: pretend the OAuth handshake succeeded and mint a token for
      // whatever email is in the field (or a default per provider).
      const stubEmail =
        email.length > 0
          ? email
          : provider === 'azure'
            ? 'dev.user@kapitus.com'
            : 'dev.user@gmail.com';
      setEmail(stubEmail);
      await handleStubSignIn(stubEmail);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${redirect ?? '/learn'}`
          : undefined;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        ...(redirectTo !== undefined ? { options: { redirectTo } } : {}),
      });
      if (oauthErr) {
        setError(oauthErr.message);
        setLoading(false);
      }
      // On success Supabase redirects the browser; no need to push.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

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
      // Route password sign-in through the API proxy so the per-IP Redis
      // rate-limit (AuthRateLimitGuard, 10/min) gates brute-force attempts.
      // OAuth + magic-link stay on the Supabase SDK below — they don't
      // benefit from our rate limiter (Supabase already gates them) and
      // need to do their own redirect handshake.
      const result = await apiPost<{ email: string; password: string }, SignInResponse>(
        '/auth/sign-in',
        { email, password },
      );
      // Hand the freshly issued session to the Supabase browser client so
      // subsequent SDK calls (and the API client's bearer-injection path)
      // pick it up without a round-trip.
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
      } catch {
        // Stub mode or misconfigured client — fall through; the API token
        // is still stored below and the request pipeline will use it.
      }
      router.push(redirect ?? result.redirectTo ?? '/learn');
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

  async function handleStubSignIn(forceEmail?: string) {
    const useEmail = forceEmail ?? email;
    if (useEmail.length === 0) {
      setError('Enter your email to use dev-bypass sign-in.');
      return;
    }
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/auth/dev-bypass`);
      url.searchParams.set('email', useEmail);
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Dev-bypass request failed');
      }
      const data = (await res.json()) as { accessToken: string; redirectTo: string };
      document.cookie = `sb-stub-auth-token=${data.accessToken}; path=/; max-age=28800; samesite=lax`;
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuth('azure')}
          className={OAUTH_BUTTON}
        >
          <OutlookIcon /> Continue with Outlook
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuth('google')}
          className={OAUTH_BUTTON}
        >
          <GoogleIcon /> Continue with Google
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-kp-rule" aria-hidden />
        <span className="kp-body-sm text-kp-ink-mute">or with your email</span>
        <span className="h-px flex-1 bg-kp-rule" aria-hidden />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kp-signin-email" className="kp-body-sm font-medium text-kp-ink">
            Kapitus email
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

function OutlookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="4" width="13" height="16" rx="1" fill="#0078D4" />
      <rect x="5" y="7" width="7" height="3" fill="#fff" />
      <rect x="5" y="11" width="7" height="3" fill="#fff" />
      <rect x="5" y="15" width="7" height="3" fill="#fff" />
      <path d="M15 9L22 5V19L15 15V9Z" fill="#0078D4" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
