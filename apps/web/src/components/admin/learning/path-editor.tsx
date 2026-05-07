'use client';

/**
 * PathEditor — CR.32 manual path editor.
 *
 * Layout:
 * - Header: path title (inline editable), back link, Save + Publish buttons.
 *   An oxblood dot signals unsaved changes.
 * - Left rail: lesson list with HTML5 drag-to-reorder. "+ Add lesson" at the
 *   bottom.
 * - Main area: selected lesson title / minutes / body markdown / quiz.
 * - Right rail: live markdown preview of the selected lesson body.
 *
 * Persistence: calls `paths.saveBulk(pathId, draft)`. Optimistic "Saving…"
 * state; resets the dirty flag on success.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button, Input, Label, Textarea, toast } from '@levelup/ui';
import { paths as pathsApi } from '@/lib/api';
import type { BulkLesson, BulkQuiz, LearningPath, SaveBulkInput } from '@/lib/api/paths';
import { LessonEditorRow } from './lesson-editor-row';
import { QuizEditor } from './quiz-editor';
import { MarkdownView } from '@/components/learn/markdown-view';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PathEditorLesson extends BulkLesson {
  /** Internal key for React: stable across reorders */
  _key: string;
}

interface PathEditorProps {
  pathId: string;
  initialPath: LearningPath & {
    lessons: PathEditorLesson[];
  };
}

const DEFAULT_QUIZ: BulkQuiz = {
  title: 'Quiz',
  questions: [
    {
      prompt: '',
      choices: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
      orderIndex: 0,
    },
  ],
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PathEditor({ pathId, initialPath }: PathEditorProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState(initialPath.title);
  const [description, setDescription] = React.useState(initialPath.description ?? '');
  const [isPublished, setIsPublished] = React.useState(initialPath.isPublished);
  const [lessons, setLessons] = React.useState<PathEditorLesson[]>(initialPath.lessons);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(
    initialPath.lessons[0]?._key ?? null,
  );

  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [quizOpen, setQuizOpen] = React.useState<Record<string, boolean>>({});
  const [confirmDeleteKey, setConfirmDeleteKey] = React.useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const dragSourceRef = React.useRef<string | null>(null);

  const selectedLesson = lessons.find((l) => l._key === selectedKey) ?? null;
  const selectedIndex = lessons.findIndex((l) => l._key === selectedKey);

  // ---------------------------------------------------------------------------
  // Mark dirty on any change
  // ---------------------------------------------------------------------------
  function markDirty() {
    setDirty(true);
  }

  // ---------------------------------------------------------------------------
  // Lesson mutations
  // ---------------------------------------------------------------------------
  function addLesson() {
    const key = `new-${Date.now()}`;
    const newLesson: PathEditorLesson = {
      _key: key,
      slug: `lesson-${Date.now()}`,
      title: 'New lesson',
      body: '',
      estimatedMinutes: 10,
      orderIndex: lessons.length,
    };
    setLessons((prev) => [...prev, newLesson]);
    setSelectedKey(key);
    markDirty();
  }

  function updateLesson(key: string, patch: Partial<PathEditorLesson>) {
    setLessons((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
    markDirty();
  }

  function deleteLesson(key: string) {
    const updated = lessons.filter((l) => l._key !== key).map((l, i) => ({ ...l, orderIndex: i }));
    setLessons(updated);
    if (selectedKey === key) {
      setSelectedKey(updated[0]?._key ?? null);
    }
    setConfirmDeleteKey(null);
    markDirty();
  }

  function toggleQuiz(key: string) {
    setQuizOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateQuiz(key: string, quiz: BulkQuiz) {
    updateLesson(key, { quiz });
  }

  function addQuizToLesson(key: string) {
    updateLesson(key, { quiz: { ...DEFAULT_QUIZ } });
    setQuizOpen((prev) => ({ ...prev, [key]: true }));
  }

  // ---------------------------------------------------------------------------
  // HTML5 Drag-and-drop reorder
  // ---------------------------------------------------------------------------
  function handleDragStart(key: string) {
    dragSourceRef.current = key;
  }

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    setDragOverKey(key);
  }

  function handleDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    setDragOverKey(null);
    const sourceKey = dragSourceRef.current;
    if (!sourceKey || sourceKey === targetKey) return;

    setLessons((prev) => {
      const sourceIdx = prev.findIndex((l) => l._key === sourceKey);
      const targetIdx = prev.findIndex((l) => l._key === targetKey);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const reordered = [...prev];
      const [removed] = reordered.splice(sourceIdx, 1);
      if (!removed) return prev;
      reordered.splice(targetIdx, 0, removed);
      return reordered.map((l, i) => ({ ...l, orderIndex: i }));
    });
    markDirty();
  }

  function handleDragEnd() {
    dragSourceRef.current = null;
    setDragOverKey(null);
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  async function handleSave() {
    setSaving(true);
    try {
      const input: SaveBulkInput = {
        title: title.trim() || undefined,
        description: description.trim() || null,
        isPublished,
        lessons: lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          body: l.body,
          estimatedMinutes: l.estimatedMinutes,
          orderIndex: l.orderIndex,
          quiz: l.quiz,
        })),
      };
      await pathsApi.saveBulk(pathId, input);
      setDirty(false);
      toast({ title: 'Changes saved.' });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    const next = !isPublished;
    setIsPublished(next);
    markDirty();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      {/* ---- Header bar ---- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Link
          href="/admin/learning"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Learning
        </Link>

        <span className="text-muted-foreground">/</span>

        {/* Inline-editable title */}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none ring-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5"
          aria-label="Path title"
          maxLength={200}
        />

        {/* Unsaved indicator */}
        {dirty && (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-[#8B1A1A]"
            title="Unsaved changes"
            aria-label="Unsaved changes"
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Publish toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isPublished}
            onClick={handlePublishToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              isPublished ? 'bg-indigo-600' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                isPublished ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
            <span className="sr-only">{isPublished ? 'Published' : 'Draft'}</span>
          </button>
          <span className="text-xs text-muted-foreground">
            {isPublished ? 'Published' : 'Draft'}
          </span>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </header>

      {/* ---- Body (3-column layout) ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left rail — lesson list */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/20 overflow-y-auto">
          <div className="flex-1 space-y-1 p-2">
            {lessons.map((lesson, i) => (
              <div key={lesson._key} className={dragOverKey === lesson._key ? 'opacity-50' : ''}>
                <LessonEditorRow
                  lesson={lesson}
                  index={i}
                  isActive={selectedKey === lesson._key}
                  onClick={() => setSelectedKey(lesson._key)}
                  onDragStart={() => handleDragStart(lesson._key)}
                  onDragOver={(e) => handleDragOver(e, lesson._key)}
                  onDrop={(e) => handleDrop(e, lesson._key)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addLesson}>
              <Plus className="h-3.5 w-3.5" />
              Add lesson
            </Button>
          </div>
        </aside>

        {/* Main area — lesson detail editor */}
        <main className="flex-1 overflow-y-auto p-5">
          {!selectedLesson ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <p>Select a lesson from the left to start editing.</p>
              <Button variant="outline" onClick={addLesson} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add first lesson
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Lesson {selectedIndex + 1}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDeleteKey(selectedLesson._key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete lesson
                </Button>
              </div>

              {/* Delete confirm inline */}
              {confirmDeleteKey === selectedLesson._key && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Delete this lesson?</p>
                  <p className="mt-1 text-muted-foreground">This cannot be undone.</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteLesson(selectedLesson._key)}
                    >
                      Delete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDeleteKey(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="l-title">Title</Label>
                  <Input
                    id="l-title"
                    value={selectedLesson.title}
                    onChange={(e) => updateLesson(selectedLesson._key, { title: e.target.value })}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5 w-28">
                  <Label htmlFor="l-mins">Est. minutes</Label>
                  <Input
                    id="l-mins"
                    type="number"
                    min={1}
                    max={600}
                    value={selectedLesson.estimatedMinutes}
                    onChange={(e) =>
                      updateLesson(selectedLesson._key, {
                        estimatedMinutes: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="l-slug">Slug</Label>
                <Input
                  id="l-slug"
                  value={selectedLesson.slug}
                  onChange={(e) => updateLesson(selectedLesson._key, { slug: e.target.value })}
                  maxLength={80}
                  placeholder="kebab-case-slug"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="l-body">Body (Markdown)</Label>
                <Textarea
                  id="l-body"
                  rows={14}
                  value={selectedLesson.body}
                  onChange={(e) => updateLesson(selectedLesson._key, { body: e.target.value })}
                  className="font-mono text-xs"
                  placeholder="Write the lesson content in Markdown…"
                />
              </div>

              {/* Quiz section */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
                  onClick={() => {
                    if (!selectedLesson.quiz) {
                      addQuizToLesson(selectedLesson._key);
                    } else {
                      toggleQuiz(selectedLesson._key);
                    }
                  }}
                >
                  <span>Quiz</span>
                  {selectedLesson.quiz ? (
                    quizOpen[selectedLesson._key] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">
                      No quiz — click to add
                    </span>
                  )}
                </button>
                {selectedLesson.quiz && quizOpen[selectedLesson._key] && (
                  <div className="border-t border-border p-4">
                    <QuizEditor
                      quiz={selectedLesson.quiz}
                      onChange={(quiz) => updateQuiz(selectedLesson._key, quiz)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right rail — live preview */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-muted/10 p-4 xl:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          {selectedLesson?.body ? (
            <MarkdownView content={selectedLesson.body} />
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Write lesson body markdown on the left to see a live preview here.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
