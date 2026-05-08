'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
  toast,
} from '@levelup/ui';
import type { DeletionRequestDto } from '@levelup/types';
import { privacy } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const STATUS_VARIANTS: Record<
  DeletionRequestDto['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'secondary',
  CONFIRMED: 'destructive',
  CANCELLED: 'outline',
  COMPLETED: 'outline',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialRequests: DeletionRequestDto[];
  showConfirmedToast?: boolean;
}

export function DeletionRequest({ initialRequests, showConfirmedToast }: Props) {
  const [requests, setRequests] = useState<DeletionRequestDto[]>(initialRequests);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  // Show a success toast when the user returns from confirming via email link
  useEffect(() => {
    if (showConfirmedToast) {
      toast({
        title: 'Deletion confirmed',
        description:
          'Your deletion request has been confirmed. You can cancel it any time before the scheduled date.',
      });
    }
  }, [showConfirmedToast]);

  function handleRequestDeletion() {
    startTransition(async () => {
      try {
        const newRequest = await privacy.requestDeletion({ reason: reason.trim() || undefined });
        setRequests((prev) => [newRequest, ...prev]);
        setDialogOpen(false);
        setReason('');
        toast({
          title: 'Deletion request submitted',
          description:
            "We've sent you a confirmation email. Your account will be scheduled for deletion after the 30-day grace period.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit deletion request.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      try {
        const updated = await privacy.cancelDeletion(id);
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toast({ title: 'Deletion cancelled', description: 'Your account will not be deleted.' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel deletion request.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    });
  }

  // Active = any PENDING or CONFIRMED request
  const activeRequest = requests.find((r) => r.status === 'PENDING' || r.status === 'CONFIRMED');

  const confirmedPendingGrace =
    activeRequest?.status === 'CONFIRMED' &&
    activeRequest.scheduledFor &&
    new Date(activeRequest.scheduledFor) > new Date();

  return (
    <>
      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger">Delete your account</CardTitle>
          <CardDescription>
            Request permanent deletion of your account and all associated data. You&apos;ll have 30
            days to cancel after confirming via email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmedPendingGrace && activeRequest && (
            <Alert variant="destructive">
              <AlertTitle>Deletion scheduled</AlertTitle>
              <AlertDescription>
                Your account is scheduled for deletion on{' '}
                <strong>
                  {new Date(activeRequest.scheduledFor).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
                . Cancel any time before then.
              </AlertDescription>
            </Alert>
          )}

          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            disabled={isPending || !!activeRequest}
          >
            {activeRequest ? 'Deletion already requested' : 'Request account deletion'}
          </Button>

          {requests.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[req.status]}>{req.status}</Badge>
                      <span className="text-xs text-paper-300">
                        Requested{' '}
                        {new Date(req.requestedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {(req.status === 'PENDING' || req.status === 'CONFIRMED') && (
                      <p className="text-xs text-paper-300">
                        Scheduled for{' '}
                        {new Date(req.scheduledFor).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                    {req.reason && (
                      <p className="text-xs text-paper-300 italic">&ldquo;{req.reason}&rdquo;</p>
                    )}
                  </div>
                  {(req.status === 'PENDING' || req.status === 'CONFIRMED') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(req.id)}
                      disabled={isPending}
                      className="shrink-0"
                    >
                      Cancel deletion
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request account deletion?</DialogTitle>
            <DialogDescription>
              This will schedule your account for deletion in <strong>30 days</strong>. We&apos;ll
              send you an email to confirm. You can cancel any time before the deadline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="deletion-reason">Reason (optional)</Label>
            <Textarea
              id="deletion-reason"
              placeholder="Tell us why you're leaving (helps us improve)…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-right text-xs text-paper-300">{reason.length}/500</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRequestDeletion} disabled={isPending}>
              {isPending ? 'Submitting…' : 'Yes, request deletion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
