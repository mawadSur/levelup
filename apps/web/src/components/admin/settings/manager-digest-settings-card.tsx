'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, MonoLabel } from '@levelup/ui';
import { updateManagerDigestSettings } from '@/lib/api/admin-ops';
import type { ManagerDigestSettings } from '@/lib/api/admin-ops';

interface Props {
  initial: ManagerDigestSettings;
}

export function ManagerDigestSettingsCard({ initial }: Props) {
  const [settings, setSettings] = useState<ManagerDigestSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function persist(next: ManagerDigestSettings) {
    if (pending) return;
    setError(null);
    const prev = settings;
    setSettings(next); // optimistic
    startTransition(async () => {
      try {
        await updateManagerDigestSettings(next);
        router.refresh();
      } catch (err) {
        setSettings(prev); // rollback
        setError(err instanceof Error ? err.message : 'Failed to update preference');
      }
    });
  }

  function toggleEnabled() {
    persist({ ...settings, enabled: !settings.enabled });
  }

  function setCadence(cadence: ManagerDigestSettings['cadence']) {
    persist({ ...settings, cadence });
  }

  return (
    <Card id="manager-digest">
      <CardContent className="space-y-5 p-6">
        <header className="space-y-1">
          <MonoLabel>MANAGER DIGEST</MonoLabel>
          <p className="max-w-reading text-body-sm text-paper-300">
            A weekly prose narrative sent to managers and admins summarising their team&apos;s AI
            training: lessons completed, lab pass-rate movement, wins, and concerns. Slack DMs are
            sent automatically when a Slack integration is active.
          </p>
        </header>

        <div className="flex items-center justify-between gap-6 rounded-data border border-ink-600 bg-ink-900/60 p-4">
          <div className="space-y-1">
            <p className="font-medium text-paper-100">
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-body-sm text-paper-300">
              {settings.enabled
                ? 'Managers and admins in this org receive the digest on schedule.'
                : 'No managers in this org receive the digest. Re-enable to resume delivery.'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Enable manager digest"
            onClick={toggleEnabled}
            disabled={pending}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              settings.enabled ? 'border-signal/60 bg-signal/30' : 'border-ink-600 bg-ink-800'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 transform rounded-full bg-paper-100 transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2 rounded-data border border-ink-600 bg-ink-900/60 p-4">
          <p className="font-medium text-paper-100">Cadence</p>
          <div className="flex gap-2">
            {(['weekly', 'biweekly'] as const).map((c) => {
              const active = settings.cadence === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCadence(c)}
                  disabled={pending || !settings.enabled}
                  className={`rounded-data border px-3 py-1.5 text-body-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'border-signal/60 bg-signal/30 text-paper-100'
                      : 'border-ink-600 bg-ink-800 text-paper-300 hover:text-paper-100'
                  }`}
                  aria-pressed={active}
                >
                  {c === 'weekly' ? 'Weekly (Mondays)' : 'Biweekly (every other Monday)'}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-red-400">{error}</p>
        ) : null}

        <p className="font-mono text-mono-xs uppercase tracking-[0.05em] text-paper-500">
          Stub-mode LLM generates deterministic prose locally. Real-mode caches output per (org,
          week) so re-runs do not re-charge OpenAI.
        </p>
      </CardContent>
    </Card>
  );
}
