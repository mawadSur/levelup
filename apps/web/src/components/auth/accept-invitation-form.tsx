'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Alert, AlertDescription } from '@levelup/ui';
import { acceptInvitationSchema } from '@levelup/types';
import { apiPost } from '@/lib/api';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';

interface AcceptInvitationFormProps {
  token: string;
  defaultRedirect?: string;
}

interface AcceptInvitationResponse {
  ok: true;
  redirect: string;
  email: string;
}

/**
 * Two-step invitation acceptance:
 *   1. POST /api/auth/accept-invitation — creates / updates the User row in
 *      the invited org. Server returns the canonical email.
 *   2. (Real Supabase) supabase.auth.signUp({ email, password }) so the user
 *      gets a Supabase Auth identity. The first authenticated request to the
 *      API attaches `supabaseUserId` to the freshly-created row.
 *   3. (Stub mode) skip the Supabase call and dev-bypass instead.
 */
export function AcceptInvitationForm({
  token,
  defaultRedirect = '/learn',
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const stubMode = !isSupabaseConfiguredOnClient();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError('');
    setApiError('');

    const parsed = acceptInvitationSchema.safeParse({ token, name });
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === 'name');
      if (issue) {
        setFieldError(issue.message);
        return;
      }
    }

    if (!stubMode && password.length < 8) {
      setFieldError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      // Step 1
      const accepted = await apiPost<typeof parsed.data, AcceptInvitationResponse>(
        '/auth/accept-invitation',
        parsed.data!,
      );

      const role = await postSignIn(accepted.email);
      const destination =
        role === 'ADMIN' || role === 'MANAGER' ? '/admin' : accepted.redirect || defaultRedirect;
      router.push(destination);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.toLowerCase().includes('expired') || message.includes('410')) {
        setApiError('This invitation has expired. Ask your admin to resend it.');
      } else if (message.toLowerCase().includes('not found') || message.includes('404')) {
        setApiError('This invitation link is invalid. Ask your admin for a new one.');
      } else {
        setApiError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sign in the freshly-accepted user. Returns the role string for
   * post-login routing.
   */
  async function postSignIn(email: string): Promise<string | null> {
    if (stubMode) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const url = new URL(`${apiBase}/api/auth/dev-bypass`);
      url.searchParams.set('email', email);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Dev-bypass failed');
      const data = (await res.json()) as { accessToken: string };
      window.localStorage.setItem('levelup_dev_access_token', data.accessToken);
      return null;
    }

    const supabase = getSupabaseBrowserClient();
    // SignUp will succeed on a fresh user, or return an "already registered"
    // error if the user previously had an account. In that case fall through
    // to a password sign-in.
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (signUpErr && !signUpErr.message.toLowerCase().includes('registered')) {
      throw new Error(signUpErr.message);
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) throw new Error(signInErr.message);
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full-name">Your full name</Label>
        <Input
          id="full-name"
          placeholder="Jane Smith"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      </div>

      {!stubMode && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-password">Set a password</Label>
          <Input
            id="invite-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Accepting…' : 'Accept invitation'}
      </Button>
    </form>
  );
}
