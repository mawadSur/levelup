'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { Flag, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@levelup/ui';
import { cn } from '@levelup/ui';
import type { EvaluatedFlag, UpsertFlagInput } from '@levelup/types';
import { upsertFlag, deleteFlag } from '@/lib/api/flags';

// ---------------------------------------------------------------------------
// Simple accessible toggle switch (no external dep needed)
// ---------------------------------------------------------------------------
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-signal' : 'bg-transparent',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-ink-900 shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------
function SourceBadge({ source }: { source: EvaluatedFlag['source'] }) {
  if (source === 'org') {
    return (
      <Badge className="bg-[#8B1A1A] text-white hover:bg-[#7a1717] text-[10px] px-1.5 py-0.5">
        Org override
      </Badge>
    );
  }
  if (source === 'global') {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
        Global default
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
      Default off
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Add flag dialog
// ---------------------------------------------------------------------------
function AddFlagDialog({ onAdded }: { onAdded: (flag: EvaluatedFlag) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    key: string;
    enabled: boolean;
    rolloutPercent: string;
  }>({ key: '', enabled: false, rolloutPercent: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rollout = form.rolloutPercent.trim() === '' ? null : Number(form.rolloutPercent);

    if (rollout !== null && (isNaN(rollout) || rollout < 0 || rollout > 100)) {
      setError('Rollout must be a whole number between 0 and 100, or blank.');
      return;
    }

    const input: UpsertFlagInput = {
      key: form.key.trim(),
      enabled: form.enabled,
      rolloutPercent: rollout,
    };

    startTransition(async () => {
      try {
        const created = await upsertFlag(input);
        onAdded(created);
        setOpen(false);
        setForm({ key: '', enabled: false, rolloutPercent: '' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create flag');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add flag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add feature flag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              placeholder="e.g. new-ai-coach or feature:beta.quiz"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              required
              pattern="[a-zA-Z0-9\-_:.]+"
              title="Only letters, numbers, dashes, underscores, dots, and colons"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="flag-enabled">Enabled</Label>
            <ToggleSwitch
              label="Flag enabled"
              checked={form.enabled}
              onChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag-rollout">
              Rollout % <span className="text-paper-300">(blank = 100%)</span>
            </Label>
            <Input
              id="flag-rollout"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0–100"
              value={form.rolloutPercent}
              onChange={(e) => setForm((f) => ({ ...f, rolloutPercent: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !form.key.trim()}>
              {pending ? 'Saving…' : 'Create flag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Single flag row
// ---------------------------------------------------------------------------
function FlagRow({
  flag,
  onUpdate,
  onDelete,
}: {
  flag: EvaluatedFlag;
  onUpdate: (updated: EvaluatedFlag) => void;
  onDelete: (key: string) => void;
}) {
  const [rolloutInput, setRolloutInput] = useState(
    flag.rolloutPercent != null ? String(flag.rolloutPercent) : '',
  );
  const [toggling, startToggle] = useTransition();
  const [resetting, startReset] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      startToggle(async () => {
        try {
          const updated = await upsertFlag({
            key: flag.key,
            enabled,
            rolloutPercent: flag.rolloutPercent,
            metadata: flag.metadata ?? undefined,
          });
          onUpdate(updated);
        } catch {
          // revert — parent holds source of truth
        }
      });
    },
    [flag, onUpdate],
  );

  const handleRolloutChange = useCallback(
    (value: string) => {
      setRolloutInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const rollout = value.trim() === '' ? null : Number(value);
        if (rollout !== null && (isNaN(rollout) || rollout < 0 || rollout > 100)) {
          return;
        }
        try {
          const updated = await upsertFlag({
            key: flag.key,
            enabled: flag.enabled,
            rolloutPercent: rollout,
            metadata: flag.metadata ?? undefined,
          });
          onUpdate(updated);
        } catch {
          // silent — user will see stale value
        }
      }, 600);
    },
    [flag, onUpdate],
  );

  const handleReset = useCallback(() => {
    startReset(async () => {
      try {
        await deleteFlag(flag.key);
        onDelete(flag.key);
      } catch {
        // silent
      }
    });
  }, [flag.key, onDelete]);

  return (
    <tr className="border-b border-ink-600 last:border-0 hover:bg-ink-700/30 transition-colors">
      {/* Key */}
      <td className="py-3 pl-4 pr-2 font-mono text-sm text-paper-100">
        <span className="flex items-center gap-1.5">
          <Flag className="h-3 w-3 shrink-0 text-paper-300" />
          {flag.key}
        </span>
      </td>

      {/* Enabled toggle */}
      <td className="py-3 px-2">
        <ToggleSwitch
          label={`Toggle ${flag.key}`}
          checked={flag.enabled}
          onChange={handleToggle}
          disabled={toggling}
        />
      </td>

      {/* Rollout % */}
      <td className="py-3 px-2">
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          placeholder="100"
          value={rolloutInput}
          onChange={(e) => handleRolloutChange(e.target.value)}
          className="h-7 w-20 text-sm"
          aria-label={`Rollout percent for ${flag.key}`}
        />
      </td>

      {/* Source */}
      <td className="py-3 px-2">
        <SourceBadge source={flag.source} />
      </td>

      {/* Actions */}
      <td className="py-3 pl-2 pr-4">
        {flag.source === 'org' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-paper-300 hover:text-paper-100"
            onClick={handleReset}
            disabled={resetting}
            title="Reset to global default"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
        {flag.source === 'default' && <span className="text-xs text-paper-300/50">—</span>}
        {flag.source === 'global' && <span className="text-xs text-paper-300/50">Global</span>}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------
interface FlagsTableProps {
  initialFlags: EvaluatedFlag[];
}

export function FlagsTable({ initialFlags }: FlagsTableProps) {
  const [flags, setFlags] = useState<EvaluatedFlag[]>(initialFlags);

  const handleUpdate = useCallback((updated: EvaluatedFlag) => {
    setFlags((prev) => prev.map((f) => (f.key === updated.key ? updated : f)));
  }, []);

  const handleDelete = useCallback((key: string) => {
    // After deleting an org override, the flag may still exist as a global
    // default. We optimistically remove it from the list; the user can
    // refresh to see the global default re-appear.
    setFlags((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const handleAdded = useCallback((added: EvaluatedFlag) => {
    setFlags((prev) => {
      const existing = prev.findIndex((f) => f.key === added.key);
      if (existing >= 0) {
        return prev.map((f, i) => (i === existing ? added : f));
      }
      return [...prev, added].sort((a, b) => a.key.localeCompare(b.key));
    });
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Feature flags</CardTitle>
        <AddFlagDialog onAdded={handleAdded} />
      </CardHeader>
      <CardContent className="p-0">
        {flags.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Flag className="h-8 w-8 text-paper-300/40" />
            <p className="text-sm font-medium text-paper-100">No flags configured</p>
            <p className="text-sm text-paper-300">
              Add your first flag to control feature rollout for this org.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-600 bg-ink-700/40">
                  <th className="py-2.5 pl-4 pr-2 text-xs font-medium text-paper-300">Key</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-paper-300">Enabled</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-paper-300">Rollout %</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-paper-300">Source</th>
                  <th className="py-2.5 pl-2 pr-4 text-xs font-medium text-paper-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <FlagRow
                    key={flag.key}
                    flag={flag}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
