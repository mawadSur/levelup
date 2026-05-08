'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Pencil, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from '@levelup/ui';
import type { LearningPath } from '@/lib/api/paths';

// ---------------------------------------------------------------------------
// Gradient helper — deterministic based on slug
// ---------------------------------------------------------------------------
const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-indigo-600',
] as const;

function gradientForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length] ?? GRADIENTS[0];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PathCatalogCardProps {
  path: LearningPath;
  onAssign: (path: LearningPath) => void;
}

export function PathCatalogCard({ path, onAssign }: PathCatalogCardProps) {
  const gradient = gradientForSlug(path.slug);

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Cover gradient */}
      <div className={`h-28 bg-gradient-to-br ${gradient}`} aria-hidden="true" />

      <CardHeader className="pb-2 pt-4">
        <CardTitle className="line-clamp-2 text-base">{path.title}</CardTitle>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {path.targetRole && (
            <Badge variant="secondary" className="text-xs">
              {path.targetRole}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {path.targetLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3 text-sm text-paper-300">
        {path.description && <p className="line-clamp-3 text-sm">{path.description}</p>}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {path.lessonCount} {path.lessonCount === 1 ? 'lesson' : 'lessons'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {path.estimatedMinutes}m
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => onAssign(path)}
        >
          <Users className="h-4 w-4" />
          Assign
        </Button>
        <Button asChild size="sm" variant="ghost" className="gap-1.5">
          <Link href={`/admin/learning/${path.id}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
