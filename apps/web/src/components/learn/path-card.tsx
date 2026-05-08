'use client';

import Link from 'next/link';
import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { Card, CardContent, CardFooter, Badge, Progress, Button } from '@levelup/ui';
import { cn } from '@levelup/ui';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

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

/** Gradient cover based on slug determinism so each path has a consistent colour. */
function getCoverGradient(slug: string): string {
  const palette = [
    'from-violet-500 to-indigo-600',
    'from-sky-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-fuchsia-500 to-purple-600',
  ];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Beginner',
    PRACTITIONER: 'Practitioner',
    POWER_USER: 'Power User',
    CHAMPION: 'Champion',
  };
  return map[level] ?? level;
}

function levelVariant(level: string): 'default' | 'secondary' | 'outline' {
  if (level === 'BEGINNER') return 'secondary';
  if (level === 'CHAMPION') return 'default';
  return 'outline';
}

const MAX_TILT = 6; // degrees

export function PathCard({ path, recommended = false }: PathCardProps) {
  const completedLessons = path.completedLessons ?? 0;
  const completionRate = path.completionRate ?? 0;
  const hasProgress = completionRate > 0;
  const isComplete = completionRate >= 100;

  const prefersReduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // Raw motion values for cursor offset
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Spring-damped rotation values
  const rotateX = useSpring(rawX, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rawY, { stiffness: 200, damping: 20 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (prefersReduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);
    // Invert Y so moving up tilts the top toward you
    rawX.set(-offsetY * MAX_TILT);
    rawY.set(offsetX * MAX_TILT);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  const cardJsx = (
    <Card
      className={cn(
        'flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        recommended && 'border-dashed opacity-90',
      )}
    >
      {/* Cover */}
      <div
        className={cn(
          'h-28 bg-gradient-to-br',
          getCoverGradient(path.slug),
          'relative flex items-end p-4',
        )}
        aria-hidden="true"
      >
        {isComplete && (
          <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-success shadow-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7.5l3 3 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 pt-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={levelVariant(path.targetLevel)} className="text-xs">
            {levelLabel(path.targetLevel)}
          </Badge>
          {path.targetRole && (
            <Badge variant="outline" className="text-xs">
              {path.targetRole}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold leading-snug text-paper-100">{path.title}</h3>

        {/* Description */}
        {path.description && (
          <p className="line-clamp-2 text-xs text-paper-300">{path.description}</p>
        )}

        {/* Progress */}
        {!recommended && (
          <div className="mt-auto pt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-paper-300">
              <span>
                {completedLessons} / {path.lessonCount} lessons
              </span>
              <span>{Math.round(completionRate)}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
        )}

        {recommended && (
          <p className="mt-auto pt-3 text-xs text-paper-300">
            {path.lessonCount} lessons &middot; ~{path.estimatedMinutes} min
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        {recommended ? (
          <Link
            href={`/learn/${path.slug}`}
            className="text-sm font-medium text-signal hover:underline"
          >
            Get assigned &rarr;
          </Link>
        ) : (
          <Button
            asChild
            size="sm"
            className="w-full"
            variant={hasProgress ? 'default' : 'outline'}
          >
            <Link href={`/learn/${path.slug}`}>
              {isComplete ? 'Review' : hasProgress ? 'Continue' : 'Start'}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  if (prefersReduced) {
    return cardJsx;
  }

  return (
    <div
      ref={cardRef}
      style={{ perspective: '1200px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {cardJsx}
      </motion.div>
    </div>
  );
}
