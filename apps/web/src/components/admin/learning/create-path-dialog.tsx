'use client';

import * as React from 'react';
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
  Textarea,
  toast,
} from '@levelup/ui';
import { paths } from '@/lib/api';
import type { LearningPath } from '@/lib/api/paths';
import type { CreateLearningPathInput } from '@levelup/types';

interface CreatePathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (path: LearningPath) => void;
}

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const;

const LEVELS = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'] as const;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function CreatePathDialog({ open, onOpenChange, onCreated }: CreatePathDialogProps) {
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [targetRole, setTargetRole] = React.useState<CreateLearningPathInput['targetRole'] | ''>(
    '',
  );
  const [targetLevel, setTargetLevel] = React.useState<(typeof LEVELS)[number]>('BEGINNER');
  const [loading, setLoading] = React.useState(false);
  const [slugEdited, setSlugEdited] = React.useState(false);

  React.useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

  React.useEffect(() => {
    if (!open) {
      setTitle('');
      setSlug('');
      setDescription('');
      setTargetRole('');
      setTargetLevel('BEGINNER');
      setSlugEdited(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    setLoading(true);
    try {
      const path = await paths.createPath({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        targetRole: targetRole || null,
        targetLevel: targetLevel,
        isPublished: false,
      });
      toast({ title: `"${path.title}" created.` });
      onCreated(path);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to create path',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create custom path</DialogTitle>
          <DialogDescription>
            Build a learning path tailored to your organisation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-title">Title</Label>
            <Input
              id="cp-title"
              placeholder="e.g. AI for Marketing Teams"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-slug">Slug</Label>
            <Input
              id="cp-slug"
              placeholder="ai-for-marketing-teams"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              pattern="[a-z0-9-]+"
              title="Lowercase letters, numbers and dashes only"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-desc">Description</Label>
            <Textarea
              id="cp-desc"
              placeholder="What will learners achieve?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-role">Target role</Label>
              <select
                id="cp-role"
                value={targetRole ?? ''}
                onChange={(e) =>
                  setTargetRole((e.target.value as CreateLearningPathInput['targetRole']) || '')
                }
                className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-paper-100"
              >
                <option value="">Any role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-level">Target level</Label>
              <select
                id="cp-level"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value as (typeof LEVELS)[number])}
                className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-paper-100"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l.replace(/_/g, ' ').charAt(0) + l.replace(/_/g, ' ').slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create path'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
