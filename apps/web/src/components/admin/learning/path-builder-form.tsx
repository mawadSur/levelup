'use client';

/**
 * PathBuilderForm — CR.33 admin UX.
 *
 * Flow:
 *   1. Admin types prompt + optional audience and submits → creates a request.
 *   2. Component polls GET /path-builder/requests/:id every 3s until status is
 *      terminal (READY | FAILED | CANCELLED).
 *   3. On READY: shows a generated path preview with two CTAs:
 *        - "Accept as-is": calls accept then redirects to /admin/learning.
 *        - "Edit in detail": opens a dialog where the admin can tweak path
 *          title/description and per-lesson title/estimated minutes/body
 *          before accepting. Quizzes and slugs are not editable here — that
 *          keeps the contract small; full editing happens after acceptance
 *          via the standard lesson management UI.
 *
 * Recent requests sidebar shows the last 10 requests; clicking one re-loads
 * its draft into the preview area.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Clock, Loader2, Pencil, Sparkles, XCircle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { pathBuilder } from '@/lib/api';
import type { PathBuilderRequest } from '@/lib/api/path-builder';
import type {
  GeneratedLessonEdit,
  GeneratedPath,
  GeneratedPathEdits,
  PathGenerationStatusValue,
} from '@levelup/types';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES: ReadonlySet<PathGenerationStatusValue> = new Set([
  'READY',
  'FAILED',
  'CANCELLED',
]);

const GENERATING_STEPS = [
  'Reading the prompt',
  'Outlining 6 lessons',
  'Drafting lesson bodies',
  'Writing quizzes',
  'Polishing the curriculum',
] as const;

interface PathBuilderFormProps {
  initialRecent: PathBuilderRequest[];
}

export function PathBuilderForm({ initialRecent }: PathBuilderFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState('');
  const [audience, setAudience] = React.useState('');
  const [recent, setRecent] = React.useState<PathBuilderRequest[]>(initialRecent);
  const [active, setActive] = React.useState<PathBuilderRequest | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [accepting, setAccepting] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  // ---------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------
  React.useEffect(() => {
    if (!active) return;
    if (TERMINAL_STATUSES.has(active.status)) return;

    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const updated = await pathBuilder.getRequest(active.id);
        if (cancelled) return;
        setActive(updated);
        setRecent((prev) => upsertRequest(prev, updated));
        if (TERMINAL_STATUSES.has(updated.status)) {
          window.clearInterval(id);
        }
      } catch (err) {
        // Polling errors are silent unless they persist — surface only when
        // the user retries.

        console.warn('path-builder poll failed', err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active]);

  // ---------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 8) {
      toast({
        title: 'Tell me a bit more',
        description: 'A prompt of at least 8 characters is required.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const created = await pathBuilder.createRequest({
        prompt: prompt.trim(),
        ...(audience.trim() ? { audience: audience.trim() } : {}),
      });
      setActive(created);
      setRecent((prev) => upsertRequest(prev, created));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const isDailyLimit =
        message.toLowerCase().includes('daily') || message.toLowerCase().includes('limit reached');
      const isRateLimit =
        message.toLowerCase().includes('rate limit') ||
        message.toLowerCase().includes('try again in');
      toast({
        title: isDailyLimit
          ? 'Daily limit reached'
          : isRateLimit
            ? 'Rate limit hit'
            : 'Could not start generation',
        description: isDailyLimit
          ? "You've hit the daily limit. Reach out if your team needs more capacity."
          : message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept(edits?: GeneratedPathEdits) {
    if (!active) return;
    setAccepting(true);
    try {
      const path = await pathBuilder.acceptRequest(active.id, edits ? { edits } : {});
      toast({ title: `"${path.title}" created from AI draft.` });
      setEditOpen(false);
      router.push('/admin/learning');
      router.refresh();
    } catch (err) {
      toast({
        title: 'Accept failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  }

  async function handleRetry() {
    if (!active) return;
    setActive(null);
  }

  function handleSelectRecent(req: PathBuilderRequest) {
    setActive(req);
    setPrompt(req.prompt);
    setAudience(req.audience ?? '');
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      {/* ---------- Main column ---------- */}
      <div className="space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-paper-100">
              Build a path with AI
            </h1>
          </div>
          <p className="text-sm text-paper-300">
            Describe what your team needs to learn. Our AI drafts a 6-lesson path with quizzes you
            can review, edit, and ship.
          </p>
        </header>

        {/* Prompt form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-ink-600 bg-ink-800 p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="pb-prompt">Describe the path</Label>
            <Textarea
              id="pb-prompt"
              rows={4}
              placeholder="Help my sales team navigate enterprise discovery calls without leaking deal info."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              minLength={8}
              maxLength={2000}
            />
            <p className="text-xs text-paper-300">
              The more specific the better. Mention tools, workflows, or constraints unique to your
              team.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb-audience">Audience (optional)</Label>
            <Input
              id="pb-audience"
              placeholder="Sales reps, Account managers, etc."
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={submitting || prompt.trim().length < 8}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate path
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Active request status */}
        {active && (
          <ActiveRequestPanel
            request={active}
            accepting={accepting}
            onAccept={() => void handleAccept()}
            onEdit={() => setEditOpen(true)}
            onRetry={() => void handleRetry()}
          />
        )}
      </div>

      {/* ---------- Sidebar ---------- */}
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-300">
          Recent generations
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-paper-300">
            No generations yet. Your previous requests will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelectRecent(r)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-ink-700/50 ${
                    active?.id === r.id ? 'border-indigo-500' : 'border-ink-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-paper-300">{formatRelative(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-paper-100">{r.prompt}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Edit dialog */}
      {active?.draft && (
        <EditDraftDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          draft={active.draft}
          onAccept={(edits) => void handleAccept(edits)}
          accepting={accepting}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActiveRequestPanel — renders one of: GENERATING / READY / FAILED / CANCELLED
// ---------------------------------------------------------------------------

interface ActiveRequestPanelProps {
  request: PathBuilderRequest;
  accepting: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onRetry: () => void;
}

function ActiveRequestPanel({
  request,
  accepting,
  onAccept,
  onEdit,
  onRetry,
}: ActiveRequestPanelProps) {
  if (request.status === 'PENDING' || request.status === 'GENERATING') {
    return <GeneratingPanel />;
  }
  if (request.status === 'FAILED') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Generation failed</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{request.failedReason ?? 'Unknown error from the AI provider.'}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (request.status === 'CANCELLED') {
    return (
      <Alert>
        <XCircle className="h-4 w-4" />
        <AlertTitle>Cancelled</AlertTitle>
        <AlertDescription>This generation was cancelled.</AlertDescription>
      </Alert>
    );
  }

  // READY
  if (!request.draft) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Draft missing</AlertTitle>
        <AlertDescription>
          The request is marked READY but no draft was stored. Please regenerate.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ReadyPanel
      draft={request.draft}
      accepting={accepting}
      onAccept={onAccept}
      onEdit={onEdit}
      acceptedPathId={request.generatedPathId}
    />
  );
}

function GeneratingPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          Generating your path
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-paper-300">
          Estimated wait: 30 to 60 seconds. Hold tight — the AI is drafting lessons and quizzes.
        </p>
        <ol className="space-y-2">
          <AnimatePresence>
            {GENERATING_STEPS.map((step, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.4, duration: 0.3 }}
                className="flex items-center gap-2 text-sm"
              >
                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                <span>{step}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </CardContent>
    </Card>
  );
}

interface ReadyPanelProps {
  draft: GeneratedPath;
  accepting: boolean;
  onAccept: () => void;
  onEdit: () => void;
  acceptedPathId: string | null;
}

function ReadyPanel({ draft, accepting, onAccept, onEdit, acceptedPathId }: ReadyPanelProps) {
  const totalMinutes = draft.lessons.reduce((acc, l) => acc + l.estimatedMinutes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Draft ready
            </CardTitle>
            <p className="mt-2 text-lg font-semibold text-paper-100">{draft.title}</p>
            <p className="mt-1 text-sm text-paper-300">{draft.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{draft.targetLevel}</Badge>
              {draft.targetRole && <Badge variant="outline">For: {draft.targetRole}</Badge>}
              <Badge variant="outline">
                {draft.lessons.length} lessons · {totalMinutes}m total
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2">
          {draft.lessons.map((lesson, i) => (
            <li
              key={lesson.slug}
              className="flex items-start justify-between gap-3 rounded-lg border border-ink-600 bg-ink-900 p-3"
            >
              <div>
                <p className="text-sm font-medium text-paper-100">
                  {i + 1}. {lesson.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-paper-300">
                  {lesson.body.replace(/[#*`]/g, '').slice(0, 160)}…
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-paper-300">
                <Clock className="h-3 w-3" />
                {lesson.estimatedMinutes}m
              </span>
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-end gap-2">
          {acceptedPathId ? (
            <p className="text-sm text-paper-300">Already accepted as a learning path.</p>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onEdit} className="gap-1.5">
                <Pencil className="h-4 w-4" />
                Edit in detail
              </Button>
              <Button type="button" onClick={onAccept} disabled={accepting} className="gap-1.5">
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept as-is
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// EditDraftDialog — minimal-surface lesson editor.
//
// Scope: top-level title/description/targetLevel + per-lesson title,
// estimated minutes, and body markdown. Quizzes and slugs are NOT editable
// here — full editing happens via the standard lesson admin UI after the
// path is materialized. This keeps the diff small and reduces the chance of
// breaking the draft schema mid-edit.
// ---------------------------------------------------------------------------

interface EditDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: GeneratedPath;
  onAccept: (edits: GeneratedPathEdits) => void;
  accepting: boolean;
}

const TARGET_LEVELS = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'] as const;

function EditDraftDialog({ open, onOpenChange, draft, onAccept, accepting }: EditDraftDialogProps) {
  const [title, setTitle] = React.useState(draft.title);
  const [description, setDescription] = React.useState(draft.description);
  const [targetLevel, setTargetLevel] = React.useState<GeneratedPath['targetLevel']>(
    draft.targetLevel,
  );
  const [lessons, setLessons] = React.useState(draft.lessons);

  React.useEffect(() => {
    if (open) {
      setTitle(draft.title);
      setDescription(draft.description);
      setTargetLevel(draft.targetLevel);
      setLessons(draft.lessons);
    }
  }, [open, draft]);

  function updateLesson(index: number, patch: Partial<GeneratedPath['lessons'][number]>) {
    setLessons((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function handleSubmit() {
    const edits: GeneratedPathEdits = {
      title: title.trim(),
      description: description.trim(),
      targetLevel,
      lessons: lessons.map<GeneratedLessonEdit>((l) => ({
        slug: l.slug,
        title: l.title,
        estimatedMinutes: l.estimatedMinutes,
        body: l.body,
      })),
    };
    onAccept(edits);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit draft</DialogTitle>
          <DialogDescription>
            Tweak the path before saving. Quizzes can be edited later from the lesson admin UI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="ed-title">Title</Label>
            <Input
              id="ed-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea
              id="ed-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-level">Target level</Label>
            <select
              id="ed-level"
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value as GeneratedPath['targetLevel'])}
              className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm"
            >
              {TARGET_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Lessons</h3>
            {lessons.map((lesson, i) => (
              <div key={lesson.slug} className="space-y-2 rounded-lg border border-ink-600 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-paper-300">{i + 1}</span>
                  <Input
                    value={lesson.title}
                    onChange={(e) => updateLesson(i, { title: e.target.value })}
                    maxLength={200}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={600}
                    value={lesson.estimatedMinutes}
                    onChange={(e) =>
                      updateLesson(i, {
                        estimatedMinutes: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-20"
                  />
                  <span className="shrink-0 text-xs text-paper-300">min</span>
                </div>
                <Textarea
                  rows={5}
                  value={lesson.body}
                  onChange={(e) => updateLesson(i, { body: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={accepting}>
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save and accept'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: PathGenerationStatusValue }) {
  switch (status) {
    case 'PENDING':
    case 'GENERATING':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === 'PENDING' ? 'Queued' : 'Generating'}
        </Badge>
      );
    case 'READY':
      return (
        <Badge variant="default" className="gap-1 bg-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      );
  }
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function upsertRequest(list: PathBuilderRequest[], next: PathBuilderRequest): PathBuilderRequest[] {
  const idx = list.findIndex((r) => r.id === next.id);
  if (idx === -1) return [next, ...list].slice(0, 10);
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}
