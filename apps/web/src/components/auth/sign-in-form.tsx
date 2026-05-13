'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Alert, AlertDescription, AlertTitle, MonoLabel } from '@levelup/ui';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ??
      (typeof window !== 'undefined' ? '' : 'http://localhost:4000'))
    : 'http://localhost:4000';

interface SignInFormProps {
  redirect?: string;
}

/**
 * Email/password sign-in via Supabase Auth.
 *
 * In stub mode (no Supabase env configured) we fall back to the API's
 * dev-bypass route which mints a Supabase-shaped JWT. The token is stored in
 * localStorage so the API client picks it up as a Bearer header.
 */
export function SignInForm({ redirect }: SignInFormProps) {
  const router = useRouter();
  const stubMode = !isSupabaseConfiguredOnClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        <Alert>
          <AlertTitle>
            <MonoLabel tone="signal">DEV BYPASS · STUB MODE</MonoLabel>
          </AlertTitle>
          <AlertDescription>
            Supabase Auth is not configured. Sign-in will mint a fake access token via the
            dev-bypass route.
          </AlertDescription>
        </Alert>
      )}

      {magicLinkSent && (
        <Alert>
          <AlertTitle>
            <MonoLabel tone="success">MAGIC LINK SENT</MonoLabel>
          </AlertTitle>
          <AlertDescription>
            Check <strong>{email}</strong> and click the link to sign in.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>
            <MonoLabel tone="danger">SIGN-IN FAILED</MonoLabel>
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleEmailPasswordSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">
            <MonoLabel>WORK EMAIL</MonoLabel>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="commander@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {!stubMode && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">
              <MonoLabel>PASSWORD</MonoLabel>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? 'SIGNING IN…' : stubMode ? 'CONTINUE (DEV BYPASS) →' : 'SIGN IN →'}
        </Button>

        {!stubMode && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading}
            onClick={handleMagicLink}
          >
            SEND MAGIC LINK INSTEAD
          </Button>
        )}
      </form>
    </div>
  );
}
