'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Hash, Lock, ShieldCheck } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  cn,
} from '@levelup/ui';
import {
  acceptSlackConsent,
  listSlackMonitoredChannels,
  updateSlackMonitoredChannels,
  type SlackChannelSummary,
} from '@/lib/api/integrations';

interface SlackMonitoredChannelsProps {
  /** Disable the controls when the integration is not active. */
  disabled?: boolean;
}

/** Bump this string when the privacy one-pager changes — admins re-consent. */
const CONSENT_VERSION = '2026-01-v1';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      channels: SlackChannelSummary[];
      monitored: Set<string>;
      consentVersion: string | null;
    };

export function SlackMonitoredChannels({ disabled }: SlackMonitoredChannelsProps) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load on mount + whenever `disabled` flips (integration toggled in parent).
  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    listSlackMonitoredChannels()
      .then((resp) => {
        if (cancelled) return;
        setState({
          kind: 'ready',
          channels: resp.channels,
          monitored: new Set(resp.monitoredChannels),
          consentVersion: resp.consentVersion,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load Slack channels';
        setState({ kind: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  const filtered = useMemo(() => {
    if (state.kind !== 'ready') return [] as SlackChannelSummary[];
    const term = filter.trim().toLowerCase();
    if (!term) return state.channels;
    return state.channels.filter((c) => c.name.toLowerCase().includes(term));
  }, [state, filter]);

  function toggleChannel(id: string) {
    if (state.kind !== 'ready') return;
    setSaveError(null);
    const next = new Set(state.monitored);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setState({ ...state, monitored: next });
  }

  async function handleSave() {
    if (state.kind !== 'ready') return;
    setSaving(true);
    setSaveError(null);
    try {
      const ids = Array.from(state.monitored);
      const resp = await updateSlackMonitoredChannels(ids);
      setState({ ...state, monitored: new Set(resp.monitoredChannels) });
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save monitored channels');
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptConsent() {
    if (state.kind !== 'ready') return;
    try {
      await acceptSlackConsent(CONSENT_VERSION);
      setState({ ...state, consentVersion: CONSENT_VERSION });
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to record consent');
    }
  }

  if (disabled) {
    return null;
  }

  const needsConsent = state.kind === 'ready' && state.consentVersion !== CONSENT_VERSION;

  return (
    <Card>
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-signal" />
          <CardTitle className="text-base font-semibold">Monitored Channels</CardTitle>
          {state.kind === 'ready' && (
            <Badge variant="outline" className="ml-auto text-xs">
              {state.monitored.size} active
            </Badge>
          )}
        </div>
        <p className="text-xs text-paper-300">
          The LevelUp bot scans messages in opted-in channels for sensitive data (PII, secrets,
          client records). Senders get a private warning — the channel never sees it.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {needsConsent && <ConsentOnePager onAccept={() => void handleAcceptConsent()} />}

        {state.kind === 'loading' && <p className="text-sm text-paper-300">Loading channels…</p>}

        {state.kind === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state.kind === 'ready' && !needsConsent && state.channels.length === 0 && (
          <div className="rounded-md border border-dashed border-paper-700 px-4 py-6 text-center text-sm text-paper-300">
            No channels available yet. The bot needs to be invited to the channels you want to
            monitor (use <span className="font-mono">/invite @levelup</span> in Slack).
          </div>
        )}

        {state.kind === 'ready' && !needsConsent && state.channels.length > 0 && (
          <>
            {state.monitored.size === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No channels monitored yet. The bot will not scan any messages until you opt one
                  in.
                </AlertDescription>
              </Alert>
            )}
            <Input
              placeholder="Filter channels…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-paper-800/40 bg-paper-900/30 p-2">
              {filtered.length === 0 ? (
                <p className="px-2 py-1 text-xs text-paper-300">No matching channels.</p>
              ) : (
                filtered.map((c) => {
                  const checked = state.monitored.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                        'hover:bg-paper-800/30',
                        checked && 'bg-paper-800/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-signal"
                        checked={checked}
                        onChange={() => toggleChannel(c.id)}
                        aria-label={`Monitor #${c.name}`}
                      />
                      {c.isPrivate ? (
                        <Lock className="h-3.5 w-3.5 text-paper-400" />
                      ) : (
                        <Hash className="h-3.5 w-3.5 text-paper-400" />
                      )}
                      <span className="font-medium text-paper-100">{c.name}</span>
                      {!c.isMember && (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          bot not in channel
                        </Badge>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : 'Save monitored channels'}
              </Button>
              <span className="text-xs text-paper-400">Consent v{state.consentVersion ?? '—'}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Consent one-pager
// ---------------------------------------------------------------------------

function ConsentOnePager({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-signal/30 bg-signal/5 p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold text-paper-100">
        <ShieldCheck className="h-4 w-4 text-signal" />
        Before you opt in any channels — quick privacy check
      </div>
      <ul className="space-y-2 text-xs text-paper-200">
        <li>
          <span className="font-semibold text-paper-100">What this does:</span> the LevelUp bot
          scans message text in channels you opt in to. When a message looks like it contains a
          secret, client SSN, payment data, or PHI, the bot sends an ephemeral warning to the sender
          only.
        </li>
        <li>
          <span className="font-semibold text-paper-100">What it does NOT do:</span> read DMs the
          bot isn't in, post anything visible to other users, share data with third parties, or
          store raw message content.
        </li>
        <li>
          <span className="font-semibold text-paper-100">Where data is stored:</span> only a SHA-256
          hash of flagged messages plus the detection categories are persisted to the audit log. Raw
          text never leaves Slack.
        </li>
        <li>
          <span className="font-semibold text-paper-100">How to opt in:</span> check the boxes below
          for channels you want monitored. Uncheck to stop scanning. You can change this at any
          time.
        </li>
      </ul>
      <Button size="sm" onClick={onAccept}>
        I understand — continue
      </Button>
    </div>
  );
}
