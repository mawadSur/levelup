'use client';

import { useState, useTransition } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@levelup/ui';
import { paths as pathsApi } from '@/lib/api';
import type { LearningPath } from '@/lib/api/paths';

interface SuggestPathDialogProps {
  userId: string;
  userName: string;
  availablePaths: LearningPath[];
  trigger: React.ReactNode;
}

export function SuggestPathDialog({
  userId,
  userName,
  availablePaths,
  trigger,
}: SuggestPathDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    if (!selectedPathId) return;
    startTransition(async () => {
      try {
        await pathsApi.assignPath({ learningPathId: selectedPathId, userIds: [userId] });
        toast({
          title: 'Path assigned',
          description: `Assigned to ${userName}.`,
        });
        setOpen(false);
        setSelectedPathId('');
      } catch {
        toast({
          title: 'Assignment failed',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Suggest a path</DialogTitle>
          <DialogDescription>Assign a learning path to {userName}.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Select value={selectedPathId} onValueChange={setSelectedPathId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a path..." />
            </SelectTrigger>
            <SelectContent>
              {availablePaths.map((path) => (
                <SelectItem key={path.id} value={path.id}>
                  {path.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isPending || !selectedPathId}>
            {isPending ? 'Assigning...' : 'Assign path'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
