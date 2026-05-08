'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  Badge,
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
import type { Prompt } from '@/lib/api/prompts';
import { PromptDetailDialog } from './prompt-detail-dialog';

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

type Scope = 'mine' | 'org' | 'dept' | 'library';

function getScope(prompt: Prompt, currentUserId: string): Scope {
  if (prompt.authorId === currentUserId) return 'mine';
  if (prompt.isShared && prompt.departmentId) return 'dept';
  if (prompt.isShared) return 'org';
  return 'library';
}

const scopeBadgeLabel: Record<Scope, string> = {
  mine: 'My prompt',
  org: 'Org',
  dept: 'Dept',
  library: 'Library',
};

const scopeBadgeVariant: Record<Scope, 'default' | 'secondary' | 'outline'> = {
  mine: 'default',
  org: 'secondary',
  dept: 'secondary',
  library: 'outline',
};

interface EditDialogProps {
  prompt: Prompt;
  canShare: boolean;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditDialog({ prompt, canShare, open, onClose, onSaved }: EditDialogProps) {
  const [title, setTitle] = useState(prompt.title);
  const [category, setCategory] = useState(prompt.category);
  const [promptText, setPromptText] = useState(prompt.promptText);
  const [isShared, setIsShared] = useState(prompt.isShared);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await prompts.updatePrompt(prompt.id, {
          title: title.trim(),
          category,
          promptText: promptText.trim(),
          isShared: canShare ? isShared : prompt.isShared,
        });
        toast({ title: 'Prompt updated' });
        onSaved();
        onClose();
      } catch {
        toast({ title: 'Update failed', description: 'Please try again.', variant: 'destructive' });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit prompt</DialogTitle>
          <DialogDescription>Update your prompt details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="edit-category">
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
            <Label htmlFor="edit-text">Prompt text</Label>
            <Textarea
              id="edit-text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[140px] font-mono text-sm resize-y"
            />
          </div>
          {canShare && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-shared"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 accent-primary"
              />
              <Label htmlFor="edit-shared" className="cursor-pointer text-sm font-normal">
                Share with my organisation
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !title.trim() || !promptText.trim()}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PromptCardProps {
  prompt: Prompt;
  currentUserId: string;
  canShare: boolean;
  /** Human-readable name for the prompt's department (for the badge tooltip). */
  departmentName?: string | null;
  onMutated?: () => void;
}

export function PromptCard({
  prompt,
  currentUserId,
  canShare,
  departmentName,
  onMutated,
}: PromptCardProps) {
  const scope = getScope(prompt, currentUserId);
  const isMine = scope === 'mine';
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [isCloning, startClone] = useTransition();
  const [isSharing, startShare] = useTransition();

  const preview = prompt.promptText.slice(0, 200) + (prompt.promptText.length > 200 ? '…' : '');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt.promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  }

  function handleDelete() {
    if (!confirm('Delete this prompt? This cannot be undone.')) return;
    startDelete(async () => {
      try {
        await prompts.deletePrompt(prompt.id);
        toast({ title: 'Prompt deleted' });
        onMutated?.();
      } catch {
        toast({ title: 'Delete failed', variant: 'destructive' });
      }
    });
  }

  function handleClone() {
    startClone(async () => {
      try {
        await prompts.clonePrompt(prompt.id);
        toast({ title: 'Saved to your library' });
        onMutated?.();
      } catch {
        toast({ title: 'Clone failed', variant: 'destructive' });
      }
    });
  }

  function handleShareToggle() {
    startShare(async () => {
      try {
        await prompts.sharePrompt(prompt.id, !prompt.isShared);
        toast({
          title: prompt.isShared ? 'Unshared from org' : 'Shared with org',
        });
        onMutated?.();
      } catch {
        toast({ title: 'Share toggle failed', variant: 'destructive' });
      }
    });
  }

  return (
    <>
      <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="flex flex-1 flex-col gap-3 pt-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {prompt.category}
            </Badge>
            <Badge variant={scopeBadgeVariant[scope]} className="text-xs">
              {scopeBadgeLabel[scope]}
            </Badge>
            {prompt.departmentId && (
              <span
                title={
                  departmentName ? `Shared with ${departmentName}` : 'Shared with a department'
                }
              >
                <Badge
                  variant="outline"
                  className="text-xs bg-[#fdf8f0] text-[#7c1c1c] border-[#d4a574]"
                >
                  Dept
                </Badge>
              </span>
            )}
          </div>

          {/* Title */}
          <PromptDetailDialog
            prompt={prompt}
            trigger={
              <button
                type="button"
                className="text-left text-base font-semibold text-paper-100 hover:text-signal transition-colors"
              >
                {prompt.title}
              </button>
            }
          />

          {/* Preview */}
          <pre className="rounded-md bg-ink-700/50 p-3 text-xs font-mono text-paper-300 whitespace-pre-wrap line-clamp-4 leading-relaxed border border-ink-600/60">
            {preview}
          </pre>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 pb-4 pt-2">
          {/* Always available */}
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/coach?prompt=${prompt.id}`}>Use in coach</Link>
          </Button>

          {/* Owner actions */}
          {isMine ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              {canShare && (
                <Button variant="ghost" size="sm" onClick={handleShareToggle} disabled={isSharing}>
                  {isSharing ? '...' : prompt.isShared ? 'Unshare from org' : 'Share to org'}
                </Button>
              )}
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleClone} disabled={isCloning}>
              {isCloning ? 'Saving...' : 'Save to my library'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {editOpen && (
        <EditDialog
          prompt={prompt}
          canShare={canShare}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => onMutated?.()}
        />
      )}
    </>
  );
}
