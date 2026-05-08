'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Alert, AlertDescription, AlertTitle, MonoLabel } from '@levelup/ui';
import { createOrganizationSchema } from '@levelup/types';
import { apiPost } from '@/lib/api';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';

interface CreateOrgResponse {
  id: string;
  name: string;
  signInUrl: string;
}

/**
 * Bootstrap a fresh organization. The flow is:
 *   1. POST /api/organizations — creates the org row and returns a signInUrl.
 *   2. (Real Supabase) call supabase.auth.signUp({ email, password }) so the
 *      caller gets a Supabase Auth identity. The first authenticated request
 *      to the API attaches the supabaseUserId to the org's admin user.
 *   3. (Stub mode) skip the Supabase call and just push to the signInUrl;
 *      the signInForm will dev-bypass into the right org.
 */
export function SignUpForm() {
  const router = useRouter();
  const stubMode = !isSupabaseConfiguredOnClient();

  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setApiError('');

    const parsed = createOrganizationSchema.safeParse({
      name: orgName,
      adminName,
      adminEmail,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    if (!stubMode && password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost<typeof parsed.data, CreateOrgResponse>(
        '/organizations',
        parsed.data,
      );

      if (!stubMode) {
        const supabase = getSupabaseBrowserClient();
        const { error: signUpErr } = await supabase.auth.signUp({
          email: adminEmail,
          password,
          options: {
            data: { full_name: adminName, org_id: data.id },
          },
        });
        if (signUpErr) {
          setApiError(signUpErr.message);
          return;
        }
      }

      router.push(data.signInUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('404')) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('levelup_org_hint', orgName);
        }
        router.push(`/sign-in?redirect=%2Fadmin&email=${encodeURIComponent(adminEmail)}`);
      } else {
        setApiError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {apiError && (
        <Alert variant="destructive">
          <AlertTitle>
            <MonoLabel tone="danger">PROVISIONING FAILED</MonoLabel>
          </AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">
          <MonoLabel>ORGANIZATION NAME</MonoLabel>
        </Label>
        <Input
          id="org-name"
          placeholder="Acme Corp"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          disabled={loading}
        />
        {fieldErrors.name && (
          <MonoLabel tone="danger">! {fieldErrors.name.toUpperCase()}</MonoLabel>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-name">
          <MonoLabel>YOUR FULL NAME</MonoLabel>
        </Label>
        <Input
          id="admin-name"
          placeholder="Jane Smith"
          autoComplete="name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          disabled={loading}
        />
        {fieldErrors.adminName && (
          <MonoLabel tone="danger">! {fieldErrors.adminName.toUpperCase()}</MonoLabel>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-email">
          <MonoLabel>WORK EMAIL</MonoLabel>
        </Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="commander@company.com"
          autoComplete="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          disabled={loading}
        />
        {fieldErrors.adminEmail && (
          <MonoLabel tone="danger">! {fieldErrors.adminEmail.toUpperCase()}</MonoLabel>
        )}
      </div>

      {!stubMode && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">
            <MonoLabel>PASSWORD</MonoLabel>
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          {fieldErrors.password && (
            <MonoLabel tone="danger">! {fieldErrors.password.toUpperCase()}</MonoLabel>
          )}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? 'PROVISIONING…' : 'CREATE ORGANIZATION →'}
      </Button>
    </form>
  );
}
