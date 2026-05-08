'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, Badge, Button, MonoLabel } from '@levelup/ui';
import { cn } from '@levelup/ui';
import { Check } from 'lucide-react';

export interface PathCardData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  targetRole: string | null;
  targetLevel: string;
  coverImageUrl: string | null;
  lessonCount: number;
  estimatedMinutes: number;
  completedLessons?: number;
  completionRate?: number;
  isAssigned?: boolean;
}

interface PathCardProps {
  path: PathCardData;
  recommended?: boolean;
}

/** Deterministic 2-digit path code derived from the slug. */
function codeForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return String(hash % 100).padStart(2, '0');
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'BEGINNER',
    PRACTITIONER: 'PRACTITIONER',
    POWER_USER: 'POWER USER',
    CHAMPION: 'CHAMPION',
  };
  return map[level] ?? level.toUpperCase();
}

export function PathCard({ path, recommended = false }: PathCardProps) {
  const completedLessons = path.completedLessons ?? 0;
  const completionRate = path.completionRate ?? 0;
  const hasProgress = completionRate > 0;
  const isComplete = completionRate >= 100;
  const code = codeForSlug(path.slug);

  return (
    <Card className={cn('flex flex-col', recommended && 'border-dashed')}>
      {/* Mono header strip */}
      <div className="flex items-center justify-between border-b border-ink-600 px-5 py-2.5">
        <MonoLabel>PATH-{code}</MonoLabel>
        <div className="flex items-center gap-2">
          <MonoLabel className="text-paper-300">{levelLabel(path.targetLevel)}</MonoLabel>
          {isComplete && (
            <span
              aria-label="Path complete"
              className="flex h-5 w-5 items-center justify-center rounded-data bg-success/20"
            >
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        {path.targetRole && (
          <div>
            <Badge variant="default">{path.targetRole}</Badge>
          </div>
        )}

        <h3 className="font-serif text-h2 italic leading-tight text-paper-100">{path.title}</h3>

        {path.description && (
          <p className="line-clamp-2 text-body-sm text-paper-300">{path.description}</p>
        )}

        {!recommended && (
          <div className="mt-auto space-y-1.5 pt-3">
            <div className="flex items-center justify-between font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
              <span>
                {completedLessons} / {path.lessonCount} LESSONS
              </span>
              <span className="text-paper-100">{Math.round(completionRate)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-data bg-ink-700">
              <div
                className="h-full bg-signal transition-[width] duration-500 ease-mission"
                style={{ width: `${Math.max(completionRate, 2)}%` }}
              />
            </div>
          </div>
        )}

        {recommended && (
          <p className="mt-auto pt-3 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
            {path.lessonCount} LESSONS · ~{path.estimatedMinutes} MIN
          </p>
        )}
      </CardContent>

      <CardFooter className="pb-5 pt-0">
        {recommended ? (
          <Link
            href={`/learn/${path.slug}`}
            className="font-mono text-mono-sm uppercase tracking-[0.05em] text-signal hover:text-paper-100"
          >
            REQUEST ASSIGNMENT →
          </Link>
        ) : (
          <Button
            asChild
            size="sm"
            className="w-full"
            variant={hasProgress ? 'primary' : 'secondary'}
          >
            <Link href={`/learn/${path.slug}`}>
              {isComplete ? 'Review' : hasProgress ? 'Continue' : 'Start'}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
