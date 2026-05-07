'use client';

/**
 * LessonEditorRow — a single row in the lesson list sidebar.
 *
 * Shows drag handle + title + estimated minutes + click to select.
 */

import * as React from 'react';
import { GripVertical } from 'lucide-react';
import type { BulkLesson } from '@/lib/api/paths';

interface LessonEditorRowProps {
  lesson: BulkLesson;
  index: number;
  isActive: boolean;
  onClick: () => void;
  /** HTML5 drag-and-drop handlers */
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function LessonEditorRow({
  lesson,
  index,
  isActive,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: LessonEditorRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-pressed={isActive}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-sm transition-colors ${
        isActive
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
          : 'border-border bg-background hover:bg-muted/40'
      }`}
    >
      <span className="cursor-grab text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="mr-1 shrink-0 text-xs font-mono text-muted-foreground">{index + 1}</span>
      <span className="flex-1 truncate font-medium text-foreground">
        {lesson.title || <span className="italic text-muted-foreground">Untitled</span>}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{lesson.estimatedMinutes}m</span>
    </div>
  );
}
