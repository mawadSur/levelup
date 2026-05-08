'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizationSchema } from '@levelup/types';
import { apiPost } from '@/lib/api';
import { getSupabaseBrowserClient, isSupabaseConfiguredOnClient } from '@/lib/supabase/client';

interface CreateOrgResponse {
  id: string;
  name: string;
  signInUrl: string;
}

const FIELD_INPUT =
  'h-11 w-full rounded-kp-sm border border-kp-rule-strong bg-kp-paper px-3.5 text-base text-kp-ink placeholder:text-kp-ink-faint shadow-[inset_0_1px_0_rgba(15,23,42,0.02)] transition-colors duration-150 ease-kp-out focus:border-kp-purple focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-kp-purple/30 disabled:cursor-not-allowed disabled:opacity-60';

export function KapitusSignUpForm() {
  const router = useRouter();
  const stubMode = !isSupabaseConfiguredOnClient();

  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companySize, setCompanySize] = useState('');
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
            data: {
              full_name: adminName,
              org_id: data.id,
              industry: 'FINANCIAL_SERVICES',
              intent: 'kapitus',
              company_size: companySize,
            },
          },
        });
        if (signUpErr) {
          setApiError(signUpErr.message);
          return;
        }
      }

      router.push(
        `/clients/kapitus/sign-in${data.signInUrl.includes('?') ? data.signInUrl.slice(data.signInUrl.indexOf('?')) : ''}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('404')) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('levelup_org_hint', orgName);
        }
        router.push(
          `/clients/kapitus/sign-in?redirect=%2Fadmin&email=${encodeURIComponent(adminEmail)}`,
        );
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
            We couldn&rsquo;t create that account.
          </p>
          <p className="kp-body-sm mt-1 text-kp-ink-soft">{apiError}</p>
        </div>
      )}

      <Field label="Organization name" htmlFor="kp-org-name" error={fieldErrors.name}>
        <input
          id="kp-org-name"
          className={FIELD_INPUT}
          placeholder="Kapitus"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          disabled={loading}
        />
      </Field>

      <Field label="Your full name" htmlFor="kp-admin-name" error={fieldErrors.adminName}>
        <input
          id="kp-admin-name"
          className={FIELD_INPUT}
          placeholder="Jane Smith"
          autoComplete="name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          disabled={loading}
        />
      </Field>

      <Field label="Work email" htmlFor="kp-admin-email" error={fieldErrors.adminEmail}>
        <input
          id="kp-admin-email"
          type="email"
          className={FIELD_INPUT}
          placeholder="you@kapitus.com"
          autoComplete="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          disabled={loading}
        />
      </Field>

      <Field label="Company size" htmlFor="kp-company-size" hint="Optional">
        <input
          id="kp-company-size"
          className={FIELD_INPUT}
          placeholder="e.g. 120 employees"
          value={companySize}
          onChange={(e) => setCompanySize(e.target.value)}
          disabled={loading}
        />
      </Field>

      <Field label="Industry" htmlFor="kp-industry" hint="Pre-filled">
        <input
          id="kp-industry"
          className={`${FIELD_INPUT} bg-kp-mist text-kp-ink-soft`}
          value="Financial services"
          readOnly
          aria-readonly="true"
        />
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
        {loading ? 'Creating Account…' : 'Create Account'}
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
