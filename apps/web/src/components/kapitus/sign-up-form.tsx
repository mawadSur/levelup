'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizationSchema } from '@levelup/types';
import { apiPost } from '@/lib/api';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';
import { kRoutes } from './routes';

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

interface CreateOrgResponse {
  id: string;
  name: string;
  signInUrl: string;
}

const FIELD_INPUT =
  'h-11 w-full rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-3.5 text-base text-kp-ink placeholder:text-kp-ink-faint shadow-[inset_0_1px_0_rgba(15,23,42,0.02)] transition-colors duration-150 ease-kp-out focus:border-kp-purple focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-kp-purple/30 disabled:cursor-not-allowed disabled:opacity-60';

const OAUTH_BUTTON =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-4 text-sm font-medium text-kp-ink transition-colors duration-150 ease-kp-out hover:bg-kp-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple disabled:cursor-not-allowed disabled:opacity-60';

const DEPARTMENTS = [
  'Lending',
  'Underwriting',
  'Compliance',
  'Operations',
  'Sales',
  'Customer Support',
  'Human Resources',
  'Marketing',
  'Finance',
  'Engineering',
  'Other',
];

const ROLES = ['Employee', 'Manager'] as const;
type RoleOption = (typeof ROLES)[number];

export function KapitusSignUpForm() {
  const router = useRouter();
  const stubMode = !isSupabaseConfiguredOnClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<RoleOption>('Employee');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleOAuth(provider: 'azure' | 'google') {
    setApiError('');
    setFieldErrors({});
    if (stubMode) {
      // Stub mode: bypass Supabase, mint a dev token for either the typed
      // email or a sensible default per provider so the developer can land in
      // the academy without configuring OAuth.
      const stubEmail =
        email.length > 0
          ? email
          : provider === 'azure'
            ? 'dev.user@kapitus.com'
            : 'dev.user@gmail.com';
      setEmail(stubEmail);
      setLoading(true);
      try {
        const url = new URL(`${API_BASE}/api/auth/dev-bypass`);
        url.searchParams.set('email', stubEmail);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Dev-bypass request failed');
        const data = (await res.json()) as { accessToken: string; redirectTo: string };
        window.localStorage.setItem('levelup_dev_access_token', data.accessToken);
        router.push(data.redirectTo);
        router.refresh();
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/learn` : undefined;
      // The API attaches new Kapitus users to the shared org on first
      // /auth/me call (CLIENT=kapitus on the server), so we don't need to POST
      // /organizations for OAuth signups. Department + role get filled in
      // later via /profile if the user wants to attribute them.
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        ...(redirectTo !== undefined ? { options: { redirectTo } } : {}),
      });
      if (oauthErr) {
        setApiError(oauthErr.message);
        setLoading(false);
      }
      // On success Supabase redirects the browser; no need to push.
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setApiError('');

    // The Kapitus academy is single-tenant — the org is implicit. Internally
    // we still need a name + adminEmail to satisfy the API contract, so the
    // org name is hard-coded and the user's email/name flow through as-is.
    const parsed = createOrganizationSchema.safeParse({
      name: 'Kapitus',
      adminName: fullName,
      adminEmail: email,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !errors[field]) {
          // Re-key the API field names to our UI field names so the right
          // input gets highlighted.
          const uiKey =
            field === 'adminName' ? 'fullName' : field === 'adminEmail' ? 'email' : field;
          errors[uiKey] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    if (department.length === 0) {
      setFieldErrors({ department: 'Pick the team that best matches your role.' });
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
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              org_id: data.id,
              industry: 'FINANCIAL_SERVICES',
              intent: 'kapitus',
              department,
              employee_role: role,
            },
          },
        });
        if (signUpErr) {
          setApiError(signUpErr.message);
          return;
        }
      }

      const qs = data.signInUrl.includes('?')
        ? data.signInUrl.slice(data.signInUrl.indexOf('?'))
        : '';
      router.push(`${kRoutes.signIn}${qs}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('404')) {
        router.push(`${kRoutes.signIn}?redirect=%2Flearn&email=${encodeURIComponent(email)}`);
      } else {
        setApiError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {apiError && (
        <div className="rounded-kp-sm border border-kp-danger/30 bg-[rgb(var(--kp-danger)_/_0.05)] px-4 py-3">
          <p className="kp-body-sm font-semibold text-kp-danger">
            We couldn&rsquo;t enroll you just yet.
          </p>
          <p className="kp-body-sm mt-1 text-kp-ink-soft">{apiError}</p>
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
        <span className="kp-body-sm text-kp-ink-mute">or with your Kapitus email</span>
        <span className="h-px flex-1 bg-kp-rule" aria-hidden />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Full name" htmlFor="kp-full-name" error={fieldErrors.fullName}>
          <input
            id="kp-full-name"
            className={FIELD_INPUT}
            placeholder="Jane Smith"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </Field>

        <Field label="Kapitus email" htmlFor="kp-email" error={fieldErrors.email}>
          <input
            id="kp-email"
            type="email"
            className={FIELD_INPUT}
            placeholder="you@kapitus.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </Field>

        <Field label="Department" htmlFor="kp-department" error={fieldErrors.department}>
          <select
            id="kp-department"
            className={FIELD_INPUT}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={loading}
          >
            <option value="">Pick your department…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Your role" htmlFor="kp-role" hint="Pick Manager if you have direct reports">
          <select
            id="kp-role"
            className={FIELD_INPUT}
            value={role}
            onChange={(e) => setRole(e.target.value as RoleOption)}
            disabled={loading}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        {!stubMode && (
          <Field label="Password" htmlFor="kp-password" error={fieldErrors.password}>
            <input
              id="kp-password"
              type="password"
              className={FIELD_INPUT}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </Field>
        )}

        <input type="hidden" name="intent" value="kapitus" />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-kp-sm bg-kp-purple-deep px-6 text-base font-semibold text-white shadow-kp-sm transition-colors duration-200 ease-kp-out hover:bg-kp-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-purple disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Enrolling…' : 'Enroll'}
        </button>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="kp-body-sm font-medium text-kp-ink">
          {label}
        </label>
        {hint && <span className="kp-body-sm text-kp-ink-mute">{hint}</span>}
      </div>
      {children}
      {error && <p className="kp-body-sm text-kp-danger">{error}</p>}
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
