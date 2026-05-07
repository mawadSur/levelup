'use client';

import { useRouter } from 'next/navigation';

interface MobileTocLesson {
  slug: string;
  title: string;
  order: number;
}

interface MobileTocSelectProps {
  pathSlug: string;
  lessons: MobileTocLesson[];
  currentLessonSlug: string;
}

export function MobileTocSelect({ pathSlug, lessons, currentLessonSlug }: MobileTocSelectProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    if (slug && slug !== currentLessonSlug) {
      router.push(`/learn/${pathSlug}/${slug}`);
    }
  }

  return (
    <div className="lg:hidden mb-6">
      <label
        htmlFor="mobile-toc"
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        Jump to lesson
      </label>
      <select
        id="mobile-toc"
        value={currentLessonSlug}
        onChange={handleChange}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {lessons.map((lesson) => (
          <option key={lesson.slug} value={lesson.slug}>
            {lesson.order}. {lesson.title}
          </option>
        ))}
      </select>
    </div>
  );
}
