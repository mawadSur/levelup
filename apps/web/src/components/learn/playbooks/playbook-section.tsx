import Link from 'next/link';
import { Card, CardContent, CardFooter, Badge, Button, MonoLabel } from '@levelup/ui';
import type { LearningPath } from '@/lib/api/paths';

interface PlaybookSectionProps {
  /** Optional — when omitted, the parent NumberedSection provides the heading. */
  title: string;
  description?: string;
  paths: LearningPath[];
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    ADVANCED: 'ADVANCED',
  };
  return map[level] ?? level.toUpperCase();
}

function codeForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return String(hash % 100).padStart(2, '0');
}

function PlaybookCard({ path }: { path: LearningPath }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b border-ink-600 px-4 py-2">
        <MonoLabel>PATH-{codeForSlug(path.slug)}</MonoLabel>
        <MonoLabel className="text-paper-300">{levelLabel(path.targetLevel)}</MonoLabel>
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        {path.targetRole && (
          <div>
            <Badge variant="default">{path.targetRole}</Badge>
          </div>
        )}
        <h3 className="font-serif text-h2 italic leading-snug text-paper-100">{path.title}</h3>
        {path.description && (
          <p className="line-clamp-2 text-body-sm text-paper-300">{path.description}</p>
        )}
        <p className="mt-auto pt-2 font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-500">
          {path.lessonCount} LESSONS · ~{path.estimatedMinutes} MIN
        </p>
      </CardContent>
      <CardFooter className="pb-4 pt-0">
        <Button asChild size="sm" variant="secondary" className="w-full">
          <Link href={`/learn/${path.slug}`}>Read intro</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PlaybookSection({ title, description, paths }: PlaybookSectionProps) {
  if (paths.length === 0) return null;

  const heading = title.trim().length > 0;

  return (
    <section
      aria-labelledby={heading ? `section-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
    >
      {heading && (
        <div className="mb-4">
          <h2
            id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="font-serif text-h1 italic text-paper-100"
          >
            {title}
          </h2>
          {description && <p className="mt-1 text-body text-paper-300">{description}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paths.map((path) => (
          <PlaybookCard key={path.id} path={path} />
        ))}
      </div>
    </section>
  );
}
