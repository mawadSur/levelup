'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Alert, AlertDescription, AlertTitle, MonoLabel } from '@levelup/ui';
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

  async function postSignIn(email: string): Promise<string | null> {
    if (stubMode) {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ??
        (typeof window !== 'undefined' ? '' : 'http://localhost:4000');
      const url = new URL(`${apiBase}/api/auth/dev-bypass`);
      url.searchParams.set('email', email);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Dev-bypass failed');
      const data = (await res.json()) as { accessToken: string };
      window.localStorage.setItem('levelup_dev_access_token', data.accessToken);
      return null;
    }

    const supabase = getSupabaseBrowserClient();
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {apiError && (
        <Alert variant="destructive">
          <AlertTitle>
            <MonoLabel tone="danger">INVITATION ERROR</MonoLabel>
          </AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="full-name">
          <MonoLabel>YOUR FULL NAME</MonoLabel>
        </Label>
        <Input
          id="full-name"
          placeholder="Jane Smith"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        {fieldError && <MonoLabel tone="danger">! {fieldError.toUpperCase()}</MonoLabel>}
      </div>

      {!stubMode && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-password">
            <MonoLabel>SET PASSWORD</MonoLabel>
          </Label>
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

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? 'ACCEPTING…' : 'ACCEPT INVITATION →'}
      </Button>
    </form>
  );
}
