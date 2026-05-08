'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
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
  'Writing',
  'Email',
  'Sales',
  'Support',
  'HR',
  'Engineering',
  'Marketing',
  'Analysis',
  'Meetings',
] as const;

interface SavePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptText: string;
  /** Whether the current user can share to org (manager+). */
  canShare: boolean;
  defaultTitle?: string;
  defaultCategory?: string;
}

export function SavePromptDialog({
  open,
  onOpenChange,
  promptText,
  canShare,
  defaultTitle = '',
  defaultCategory = 'General',
}: SavePromptDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [category, setCategory] = useState(defaultCategory);
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error('Please give your prompt a title');
      return;
    }
    setSaving(true);
    try {
      await prompts.savePrompt({
        title: title.trim(),
        promptText,
        category,
        isShared: canShare ? share : false,
      });
      toast.success('Prompt saved to your library');
      onOpenChange(false);
      // Reset for next time
      setTitle('');
      setShare(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save prompt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this prompt</DialogTitle>
          <DialogDescription>
            Add it to your library so you can re-use or share it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-title">Title</Label>
            <Input
              id="prompt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cold outreach to CMOs"
              maxLength={120}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="prompt-category">
                <SelectValue placeholder="Select a category" />
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
            <Label className="text-xs text-paper-300">Preview</Label>
            <pre className="max-h-32 overflow-auto rounded-md border bg-ink-700/40 p-3 text-xs text-paper-100 whitespace-pre-wrap">
              {promptText}
            </pre>
          </div>

          {canShare && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm hover:bg-ink-700/30">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-500 text-signal focus-visible:ring-2 focus-visible:ring-signal"
              />
              <span>
                <span className="block font-medium text-paper-100">Share to my organisation</span>
                <span className="block text-xs text-paper-300">
                  Anyone in your org will be able to find and clone this prompt.
                </span>
              </span>
            </label>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
