'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@levelup/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@levelup/ui';
import { demo } from '@/lib/api';
import type { DemoResetInput } from '@levelup/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DemoResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SeedSize = 'small' | 'medium' | 'large';

const SEED_SIZE_LABELS: Record<SeedSize, string> = {
  small: 'Small (4 users)',
  medium: 'Medium (8 users)',
  large: 'Large (16 users)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DemoResetDialog({ open, onOpenChange }: DemoResetDialogProps) {
  const router = useRouter();

  const [companyName, setCompanyName] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [seedSize, setSeedSize] = React.useState<SeedSize>('medium');
  const [confirmText, setConfirmText] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function reset() {
    setCompanyName('');
    setIndustry('');
    setSeedSize('medium');
    setConfirmText('');
  }

  const isConfirmed = companyName.trim().length >= 2 && confirmText.trim() === companyName.trim();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isConfirmed || loading) return;

    setLoading(true);
    try {
      const input: DemoResetInput = {
        companyName: companyName.trim(),
        seedSize,
        ...(industry.trim() ? { industry: industry.trim() } : {}),
      };

      const result = await demo.reset(input);

      toast.success(
        `Demo reset complete — ${result.usersCreated} users, ` +
          `${result.lessonsCompleted} lessons seeded in ${result.durationMs} ms.`,
      );

      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Demo reset failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-destructive">Reset demo data</DialogTitle>
          <DialogDescription>
            This wipes ALL data in this org and re-seeds it with fresh demo content shaped around
            the company name you provide. <strong>This action cannot be undone.</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company name */}
          <div className="space-y-1.5">
            <Label htmlFor="demo-company-name">
              Company name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="demo-company-name"
              type="text"
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setConfirmText(''); // reset confirmation when name changes
              }}
              required
              minLength={2}
              maxLength={60}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* Industry (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="demo-industry">Industry (optional)</Label>
            <Input
              id="demo-industry"
              type="text"
              placeholder="e.g. Healthcare, Finance, Retail"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              maxLength={40}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* Seed size */}
          <fieldset className="space-y-2" disabled={loading}>
            <legend className="text-sm font-medium leading-none text-foreground">Seed size</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SEED_SIZE_LABELS) as SeedSize[]).map((size) => (
                <label
                  key={size}
                  className={[
                    'flex cursor-pointer flex-col items-center rounded-lg border px-3 py-2.5 text-center text-sm transition-colors',
                    seedSize === size
                      ? 'border-primary bg-primary/5 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    loading ? 'pointer-events-none opacity-60' : '',
                  ]
                    .join(' ')
                    .trim()}
                >
                  <input
                    type="radio"
                    name="seedSize"
                    value={size}
                    checked={seedSize === size}
                    onChange={() => setSeedSize(size)}
                    className="sr-only"
                  />
                  <span className="capitalize">{size}</span>
                  <span className="mt-0.5 text-xs opacity-70">
                    {size === 'small' && '4 users'}
                    {size === 'medium' && '8 users'}
                    {size === 'large' && '16 users'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Destructive confirmation */}
          {companyName.trim().length >= 2 && (
            <div className="space-y-1.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <Label htmlFor="demo-confirm" className="text-sm text-destructive">
                Type <span className="font-mono font-semibold">{companyName.trim()}</span> to
                confirm
              </Label>
              <Input
                id="demo-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={companyName.trim()}
                disabled={loading}
                autoComplete="off"
                className="border-destructive/50 focus-visible:ring-destructive/50"
              />
            </div>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!isConfirmed || loading}>
              {loading ? 'Resetting…' : 'Reset demo data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
