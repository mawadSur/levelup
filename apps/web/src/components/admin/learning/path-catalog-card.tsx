'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Pencil, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  MonoLabel,
} from '@levelup/ui';
import type { LearningPath } from '@/lib/api/paths';

interface PathCatalogCardProps {
  path: LearningPath;
  onAssign: (path: LearningPath) => void;
}

/** Deterministic 2-digit path code derived from the slug. */
function codeForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return String(hash % 100).padStart(2, '0');
}

export function PathCatalogCard({ path, onAssign }: PathCatalogCardProps) {
  const code = codeForSlug(path.slug);

  return (
    <Card className="flex flex-col">
      {/* Mono header strip with PATH code + level */}
      <div className="flex items-center justify-between border-b border-ink-600 px-5 py-2.5">
        <MonoLabel>PATH-{code}</MonoLabel>
        <MonoLabel className="text-paper-300">{path.targetLevel}</MonoLabel>
      </div>

      <CardHeader className="pb-3 pt-4">
        <CardTitle className="line-clamp-2 font-serif text-h2 italic text-paper-100">
          {path.title}
        </CardTitle>
        {path.targetRole && (
          <div className="mt-2">
            <Badge variant="default">{path.targetRole}</Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3 text-body-sm text-paper-300">
        {path.description && <p className="line-clamp-3">{path.description}</p>}
        <div className="flex items-center gap-4 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {path.lessonCount} {path.lessonCount === 1 ? 'LESSON' : 'LESSONS'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {path.estimatedMinutes} MIN
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button size="sm" variant="primary" className="flex-1" onClick={() => onAssign(path)}>
          <Users className="h-4 w-4" />
          Assign
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href={`/admin/learning/${path.id}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
