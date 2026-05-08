'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  MissionNumber,
  MonoLabel,
} from '@levelup/ui';
import { PerSeatSlider } from '@/components/marketing/per-seat-slider';
import { billing } from '@/lib/api';
import { isApiError } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// Two-mode modal: PLAN_LIMIT (slider + prorated preview + confirm) and
// TRIAL_EXPIRED (upgrade nudge → /pricing). Mode is decided by the parent
// based on the failing API error code.
// ---------------------------------------------------------------------------

export type SeatAddOnReason = 'PLAN_LIMIT' | 'TRIAL_EXPIRED';

interface SeatAddOnModalProps {
  open: boolean;
  reason: SeatAddOnReason;
  /** Email of the teammate the admin tried to invite — for inline copy. */
  pendingEmail: string;
  /** Current seats consumed; unknown until /billing/me runs. */
  currentSeats?: number;
  /** Plan cap (org's configured planSeats). */
  planSeats?: number;
  /** Plan name (e.g. "TEAM"); shown in the header for context. */
  planName?: string;
  onOpenChange: (open: boolean) => void;
  /** Called after the seat purchase succeeds — parent retries the invite. */
  onConfirmed: (newSeatTotal: number) => Promise<void> | void;
}

const DEBOUNCE_MS = 250;
const DEFAULT_BUMP = 5;
const MIN_BUMP = 1;
const MAX_BUMP = 100;

export function SeatAddOnModal({
  open,
  reason,
  pendingEmail,
  currentSeats,
  planSeats,
  planName,
  onOpenChange,
  onConfirmed,
}: SeatAddOnModalProps) {
  if (reason === 'TRIAL_EXPIRED') {
    return (
      <TrialExpiredView
        open={open}
        pendingEmail={pendingEmail}
        onOpenChange={onOpenChange}
      />
    );
  }
  return (
    <PlanLimitView
      open={open}
      pendingEmail={pendingEmail}
      currentSeats={currentSeats}
      planSeats={planSeats}
      planName={planName}
      onOpenChange={onOpenChange}
      onConfirmed={onConfirmed}
    />
  );
}

// ---------------------------------------------------------------------------
// PLAN_LIMIT — slider + prorated preview + confirm
// ---------------------------------------------------------------------------

function PlanLimitView({
  open,
  pendingEmail,
  currentSeats,
  planSeats,
  planName,
  onOpenChange,
  onConfirmed,
}: Omit<SeatAddOnModalProps, 'reason'>) {
  const [bump, setBump] = React.useState<number>(DEFAULT_BUMP);
  const [preview, setPreview] = React.useState<billing.SeatProrationPreview | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  // Reset state on open/close.
  React.useEffect(() => {
    if (open) {
      setBump(DEFAULT_BUMP);
      setPreview(null);
      setPreviewError(null);
      setConfirmError(null);
    }
  }, [open]);

  // Debounced preview refresh whenever the bump changes while open.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    const handle = window.setTimeout(async () => {
      try {
        const next = await billing.previewSeats(bump);
        if (!cancelled) {
          setPreview(next);
          setPreviewLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewLoading(false);
          setPreviewError(prorationErrorMessage(err));
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [bump, open]);

  const newTotalSeats =
    typeof planSeats === 'number' ? planSeats + bump : preview?.newQuantity ?? bump;

  const proratedDollars = preview ? preview.amountDueCents / 100 : 0;

  async function handleConfirm() {
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const result = await billing.addSeats(newTotalSeats);
      await onConfirmed(result.newQuantity);
    } catch (err) {
      setConfirmError(prorationErrorMessage(err));
      setConfirmLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <MonoLabel tone="signal">SEAT LIMIT REACHED</MonoLabel>
          <DialogTitle className="font-serif text-h1 italic">
            Add seats to invite this teammate.
          </DialogTitle>
          <DialogDescription>
            {typeof currentSeats === 'number' && typeof planSeats === 'number' ? (
              <>
                Your{' '}
                {planName ? <span className="font-mono uppercase">{planName}</span> : 'current'}{' '}
                plan is at <strong>{currentSeats}</strong> of <strong>{planSeats}</strong> seats.
                To invite <strong>{pendingEmail || 'this teammate'}</strong>, add seats below.
              </>
            ) : (
              <>
                Your plan has reached its seat cap. To invite{' '}
                <strong>{pendingEmail || 'this teammate'}</strong>, add seats below.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <PerSeatSlider
            value={bump}
            onChange={setBump}
            min={MIN_BUMP}
            max={MAX_BUMP}
            step={1}
            label={`ADD ${bump} SEAT${bump === 1 ? '' : 'S'}`}
            hint={`NEW TOTAL · ${newTotalSeats}`}
          />

          <div className="border border-ink-600 bg-ink-800 p-4 rounded-sm space-y-3">
            <div className="flex items-baseline justify-between">
              <MonoLabel className="text-paper-500">PRORATED CHARGE</MonoLabel>
              <span className="font-serif text-h2 italic tabular-nums text-paper-100">
                {previewLoading ? (
                  <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    CALCULATING…
                  </span>
                ) : preview ? (
                  <MissionNumber value={proratedDollars} format="currency" />
                ) : previewError ? (
                  <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-danger">
                    UNAVAILABLE
                  </span>
                ) : (
                  <span className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
                    —
                  </span>
                )}
              </span>
            </div>
            <p className="font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              Billed today via Stripe. Renews at the new total on your next cycle.
            </p>
            {previewError ? (
              <p className="font-mono text-mono-sm text-danger">{previewError}</p>
            ) : null}
          </div>

          {confirmError ? (
            <div className="border border-danger/60 bg-danger/10 p-3 text-body-sm text-danger rounded-sm">
              {confirmError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={confirmLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={confirmLoading || previewLoading || !preview}
          >
            {confirmLoading ? 'Charging…' : 'CONFIRM & CHARGE →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TRIAL_EXPIRED — non-purchasable; nudge to /pricing
// ---------------------------------------------------------------------------

function TrialExpiredView({
  open,
  pendingEmail,
  onOpenChange,
}: {
  open: boolean;
  pendingEmail: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <MonoLabel tone="signal">TRIAL EXPIRED</MonoLabel>
          <DialogTitle className="font-serif text-h1 italic">
            Your trial has expired.
          </DialogTitle>
          <DialogDescription>
            Upgrade to a paid plan to invite{' '}
            <strong>{pendingEmail || 'new teammates'}</strong> and unlock admin actions again.
            Nothing has been deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild variant="primary">
            <Link href="/pricing">VIEW PLANS →</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prorationErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    if (err.status === 400 && /no active subscription/i.test(err.message)) {
      return 'No active subscription on file. Start a paid plan from /pricing first.';
    }
    if (err.status === 402) {
      return 'Payment failed — check the card on file in the billing portal.';
    }
    return err.message;
  }
  return 'Could not contact billing. Try again in a moment.';
}
