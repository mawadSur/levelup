import Link from 'next/link';
import { Card, CardContent, CardFooter, Badge, Button } from '@levelup/ui';
import type { LearningPath } from '@/lib/api/paths';

interface PlaybookSectionProps {
  title: string;
  description?: string;
  paths: LearningPath[];
}

/** Deterministic gradient based on path slug. */
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

function levelVariant(level: string): 'default' | 'secondary' | 'outline' {
  if (level === 'BEGINNER') return 'secondary';
  if (level === 'ADVANCED') return 'default';
  return 'outline';
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  };
  return map[level] ?? level;
}

function PlaybookCard({ path }: { path: LearningPath }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className={`h-24 bg-gradient-to-br ${getCoverGradient(path.slug)}`} aria-hidden="true" />
      <CardContent className="flex flex-1 flex-col gap-2 pt-4">
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
        <h3 className="text-sm font-semibold leading-snug text-foreground">{path.title}</h3>
        {path.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{path.description}</p>
        )}
        <p className="mt-auto pt-2 text-xs text-muted-foreground">
          {path.lessonCount} lessons &middot; ~{path.estimatedMinutes} min
        </p>
      </CardContent>
      <CardFooter className="pb-4 pt-0">
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={`/learn/${path.slug}`}>Read intro</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PlaybookSection({ title, description, paths }: PlaybookSectionProps) {
  if (paths.length === 0) return null;

  return (
    <section aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="mb-4">
        <h2
          id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paths.map((path) => (
          <PlaybookCard key={path.id} path={path} />
        ))}
      </div>
    </section>
  );
}
