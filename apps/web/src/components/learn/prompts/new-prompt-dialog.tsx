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
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@levelup/ui';
import { prompts } from '@/lib/api';

const CATEGORIES = [
  'General',
  'Sales',
  'Marketing',
  'Support',
  'HR',
  'Manager',
  'Exec',
  'Engineering',
] as const;

interface NewPromptDialogProps {
  canShare: boolean;
  /** The caller's department id — used to show the dept-scope selector. */
  departmentId?: string | null;
  /** Human-readable department name shown in the scope selector label. */
  departmentName?: string | null;
  onCreated?: () => void;
  trigger?: React.ReactNode;
}

export function NewPromptDialog({
  canShare,
  departmentId,
  departmentName,
  onCreated,
  trigger,
}: NewPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [promptText, setPromptText] = useState('');
  const [isShared, setIsShared] = useState(false);
  /** 'org' = no dept restriction; 'dept' = scoped to user's department. */
  const [shareScope, setShareScope] = useState<'org' | 'dept'>('org');
  const [isPending, startTransition] = useTransition();

  const showScopeSelector = canShare && isShared && !!departmentId;

  function reset() {
    setTitle('');
    setCategory('General');
    setPromptText('');
    setIsShared(false);
    setShareScope('org');
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    setOpen(nextOpen);
  }

  function handleSave() {
    if (!title.trim() || !promptText.trim()) return;
    const effectiveIsShared = canShare ? isShared : false;
    const effectiveDeptId =
      effectiveIsShared && shareScope === 'dept' && departmentId ? departmentId : null;

    startTransition(async () => {
      try {
        await prompts.savePrompt({
          title: title.trim(),
          category,
          promptText: promptText.trim(),
          isShared: effectiveIsShared,
          departmentId: effectiveDeptId,
        });
        toast({ title: 'Prompt saved', description: 'Your new prompt is in your library.' });
        setOpen(false);
        reset();
        onCreated?.();
      } catch {
        toast({ title: 'Save failed', description: 'Please try again.', variant: 'destructive' });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>New prompt</Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New prompt</DialogTitle>
          <DialogDescription>Create a reusable prompt for yourself or your team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-title">Title</Label>
            <Input
              id="prompt-title"
              placeholder="e.g. Summarise sales call notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="prompt-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt-text">Prompt text</Label>
            <Textarea
              id="prompt-text"
              placeholder="Write your prompt here. Use [VARIABLE] for placeholders."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[160px] font-mono text-sm resize-y"
            />
            <p className="text-xs text-muted-foreground">{promptText.length} chars</p>
          </div>

          {canShare && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prompt-shared"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <Label htmlFor="prompt-shared" className="cursor-pointer text-sm font-normal">
                  Share with my organisation
                </Label>
              </div>
              {showScopeSelector && (
                <div className="space-y-1.5 pl-6">
                  <Label htmlFor="prompt-scope" className="text-sm">
                    Scope
                  </Label>
                  <Select
                    value={shareScope}
                    onValueChange={(v) => setShareScope(v as 'org' | 'dept')}
                  >
                    <SelectTrigger id="prompt-scope" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org">Org-wide</SelectItem>
                      <SelectItem value="dept">{departmentName ?? 'My department'} only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !title.trim() || !promptText.trim()}>
            {isPending ? 'Saving...' : 'Save prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
