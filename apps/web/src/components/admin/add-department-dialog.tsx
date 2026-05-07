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
import { departments } from '@/lib/api';
import type { Department } from '@/lib/api/departments';

/* ------------------------------------------------------------------ */
/* Add                                                                  */
/* ------------------------------------------------------------------ */
interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDepartmentDialog({ open, onOpenChange }: AddDepartmentDialogProps) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await departments.createDept({ name: name.trim() });
      toast.success(`Department "${name.trim()}" created`);
      setName('');
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create department';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setName('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add department</DialogTitle>
          <DialogDescription>Create a new department for your organisation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Department name</Label>
            <Input
              id="dept-name"
              placeholder="e.g. Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Edit                                                                 */
/* ------------------------------------------------------------------ */
interface EditDepartmentDialogProps {
  dept: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDepartmentDialog({ dept, open, onOpenChange }: EditDepartmentDialogProps) {
  const router = useRouter();
  const [name, setName] = React.useState(dept?.name ?? '');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (dept) setName(dept.name);
  }, [dept]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dept || !name.trim()) return;
    setLoading(true);
    try {
      await departments.updateDept(dept.id, { name: name.trim() });
      toast.success('Department updated');
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update department';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit department</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept-name">Department name</Label>
            <Input
              id="edit-dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || name.trim() === dept?.name}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
