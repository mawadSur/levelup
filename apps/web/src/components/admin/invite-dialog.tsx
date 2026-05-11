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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@levelup/ui';
import { invitations, billing } from '@/lib/api';
import { isApiError } from '@/lib/api/errors';
import type { Department } from '@/lib/api/departments';
import { SeatAddOnModal, type SeatAddOnReason } from './seat-add-on-modal';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
}

interface SeatAddOnState {
  reason: SeatAddOnReason;
  pendingEmail: string;
  currentSeats?: number;
  planSeats?: number;
  planName?: string;
}

export function InviteDialog({ open, onOpenChange, departments }: InviteDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [departmentId, setDepartmentId] = React.useState<string>('__none__');
  const [seatAddOn, setSeatAddOn] = React.useState<SeatAddOnState | null>(null);

  function reset() {
    setEmail('');
    setRole('EMPLOYEE');
    setDepartmentId('__none__');
  }

  async function submitInvite(targetEmail: string): Promise<void> {
    await invitations.createInvite({
      email: targetEmail.trim(),
      role,
      ...(departmentId && departmentId !== '__none__' ? { departmentId } : {}),
    });
  }

  async function classifyForbidden(
    targetEmail: string,
    err: unknown,
  ): Promise<SeatAddOnState | null> {
    // Prefer the explicit error code surfaced by the API. The plan-enforcement
    // guard returns code === 'PLAN_LIMIT' or 'TRIAL_EXPIRED' on 403; the
    // surrounding filter may strip the nested structure, so we also look at
    // /billing/me as a fallback.
    if (isApiError(err)) {
      if (err.code === 'TRIAL_EXPIRED') {
        return { reason: 'TRIAL_EXPIRED', pendingEmail: targetEmail };
      }
      if (err.code === 'PLAN_LIMIT' || err.isPlanLimit) {
        const meta = await safeBillingMe();
        return {
          reason: 'PLAN_LIMIT',
          pendingEmail: targetEmail,
          ...(meta ?? {}),
        };
      }
      if (err.status !== 403) {
        return null;
      }
    } else {
      return null;
    }

    // Status 403 with no structured code — probe /billing/me.
    const meta = await safeBillingMe();
    if (!meta) return null;
    if (meta.planName === 'TRIAL') {
      return { reason: 'TRIAL_EXPIRED', pendingEmail: targetEmail };
    }
    if (typeof meta.currentSeats === 'number' && typeof meta.planSeats === 'number') {
      if (meta.currentSeats >= meta.planSeats) {
        return { reason: 'PLAN_LIMIT', pendingEmail: targetEmail, ...meta };
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const targetEmail = email.trim();
    setLoading(true);
    try {
      await submitInvite(targetEmail);
      toast.success(`Invitation sent to ${targetEmail}`);
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const seatPrompt = await classifyForbidden(targetEmail, err);
      if (seatPrompt) {
        setSeatAddOn(seatPrompt);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to send invitation';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSeatAddOnConfirmed(newSeatTotal: number) {
    const pending = seatAddOn;
    setSeatAddOn(null);
    if (!pending) return;
    toast.success(`Seats updated — total ${newSeatTotal}.`);
    try {
      await submitInvite(pending.pendingEmail);
      toast.success(`Invitation sent to ${pending.pendingEmail}`);
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Seats added, but the invite still failed.';
      toast.error(message);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They&apos;ll receive an email with a link to create their account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'ADMIN' | 'MANAGER' | 'EMPLOYEE')}
                disabled={loading}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-dept">Department (optional)</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={loading}>
                <SelectTrigger id="invite-dept">
                  <SelectValue placeholder="No department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email}>
                {loading ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {seatAddOn ? (
        <SeatAddOnModal
          open={true}
          reason={seatAddOn.reason}
          pendingEmail={seatAddOn.pendingEmail}
          currentSeats={seatAddOn.currentSeats}
          planSeats={seatAddOn.planSeats}
          planName={seatAddOn.planName}
          onOpenChange={(v) => {
            if (!v) setSeatAddOn(null);
          }}
          onConfirmed={handleSeatAddOnConfirmed}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function safeBillingMe(): Promise<{
  currentSeats: number;
  planSeats: number;
  planName: string;
} | null> {
  try {
    const info = await billing.getMyBilling();
    return {
      currentSeats: info.usedSeats,
      planSeats: info.seats,
      planName: info.plan,
    };
  } catch {
    return null;
  }
}
