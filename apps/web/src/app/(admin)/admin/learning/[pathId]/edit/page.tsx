import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { paths as pathsApi, lessons as lessonsApi, quizzes as quizzesApi } from '@/lib/api';
import { PathEditor } from '@/components/admin/learning/path-editor';
import type { PathEditorLesson } from '@/components/admin/learning/path-editor';
import type { BulkQuiz, BulkQuizQuestion } from '@/lib/api/paths';
import type { AdminQuizQuestion } from '@/lib/api/quizzes';

export const metadata: Metadata = {
  title: 'Edit path — Admin',
};

interface PageProps {
  params: Promise<{ pathId: string }>;
}

export default async function PathEditPage({ params }: PageProps) {
  const { pathId } = await params;

  let path;
  let lessonList;
  try {
    [path, lessonList] = await Promise.all([
      pathsApi.getPath(pathId),
      lessonsApi.listLessons(pathId),
    ]);
  } catch {
    notFound();
  }

  // For each lesson, load the quiz (best-effort)
  const editorLessons: PathEditorLesson[] = await Promise.all(
    lessonList.map(async (lesson, i) => {
      let quiz: BulkQuiz | undefined;
      try {
        const quizList = await quizzesApi.listQuizzes(lesson.id);
        const first = quizList[0];
        if (first) {
          // listQuizzes does not include correctIndex; getQuiz does, but we
          // need correctIndex for the editor. Fetch full quiz.
          const fullQuiz = await quizzesApi.getQuizWithAnswers(first.id);
          if (fullQuiz) {
            quiz = {
              id: fullQuiz.id,
              title: fullQuiz.title,
              questions: fullQuiz.questions.map<BulkQuizQuestion>((q: AdminQuizQuestion, qi) => ({
                prompt: q.prompt,
                choices: Array.isArray(q.choices) ? (q.choices as string[]) : [],
                correctIndex: q.correctIndex ?? 0,
                explanation: q.explanation ?? null,
                orderIndex: qi,
              })),
            };
          }
        }
      } catch {
        // quiz unavailable — editor will show "No quiz"
      }

      return {
        _key: lesson.id,
        id: lesson.id,
        slug: lesson.slug ?? '',
        title: lesson.title,
        body: (lesson as { body?: string }).body ?? '',
        estimatedMinutes: lesson.estimatedMinutes ?? 10,
        orderIndex: i,
        quiz,
      };
    }),
  );

  const initialPath = {
    ...path,
    lessons: editorLessons,
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <PathEditor pathId={pathId} initialPath={initialPath} />
    </div>
  );
}
