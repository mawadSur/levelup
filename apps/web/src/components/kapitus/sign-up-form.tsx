'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizationSchema } from '@levelup/types';
import { apiPost } from '@/lib/api';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';
import { kRoutes } from './routes';

interface CreateOrgResponse {
  id: string;
  name: string;
  signInUrl: string;
}

const FIELD_INPUT =
  'h-11 w-full rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-3.5 text-base text-kp-ink placeholder:text-kp-ink-faint shadow-[inset_0_1px_0_rgba(15,23,42,0.02)] transition-colors duration-150 ease-kp-out focus:border-kp-purple focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-kp-purple/30 disabled:cursor-not-allowed disabled:opacity-60';

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {apiError && (
        <div className="rounded-kp-sm border border-kp-danger/30 bg-[rgb(var(--kp-danger)_/_0.05)] px-4 py-3">
          <p className="kp-body-sm font-semibold text-kp-danger">
            We couldn&rsquo;t enroll you just yet.
          </p>
          <p className="kp-body-sm mt-1 text-kp-ink-soft">{apiError}</p>
        </div>
      )}

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
