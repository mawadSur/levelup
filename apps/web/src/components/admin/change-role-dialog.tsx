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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from '@levelup/ui';
import { users } from '@/lib/api';
import type { User } from '@/lib/api/users';

interface ChangeRoleDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Total number of ADMIN users in the org — used to prevent demoting the last admin */
  adminCount: number;
}

export function ChangeRoleDialog({ user, open, onOpenChange, adminCount }: ChangeRoleDialogProps) {
  const router = useRouter();
  const [role, setRole] = React.useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>(
    (user?.role ?? 'EMPLOYEE') as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
  );
  const [loading, setLoading] = React.useState(false);

  // Keep local state in sync when the dialog target changes
  React.useEffect(() => {
    if (user) {
      setRole(user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE');
    }
  }, [user]);

  const isDemotingLastAdmin = user?.role === 'ADMIN' && role !== 'ADMIN' && adminCount <= 1;

  async function handleConfirm() {
    if (!user || isDemotingLastAdmin) return;
    setLoading(true);
    try {
      await users.updateRole({ userId: user.id, role });
      toast.success(`${user.name ?? user.email}'s role updated to ${role.toLowerCase()}`);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Updating role for{' '}
            <span className="font-medium text-foreground">
              {user?.name ?? user?.email ?? 'this user'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-select">New role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as 'ADMIN' | 'MANAGER' | 'EMPLOYEE')}
              disabled={loading}
            >
              <SelectTrigger id="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isDemotingLastAdmin && (
            <Alert variant="destructive">
              <AlertDescription>
                You cannot demote the last admin. Promote another user to Admin first.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || isDemotingLastAdmin || role === user?.role}
          >
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
