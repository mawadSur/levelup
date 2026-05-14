import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { paths as pathsApi, lessons as lessonsApi, quizzes as quizzesApi } from '@/lib/api';
import { PathEditor } from '@/components/admin/learning/path-editor';
import type { PathEditorLesson } from '@/components/admin/learning/path-editor';
import type { BulkQuiz, BulkQuizQuestion } from '@/lib/api/paths';
import type { AdminQuizQuestion } from '@/lib/api/quizzes';
import { ssrGet } from '@/lib/api/server-fetch';
import type { LabSummary, StuckLearner } from '@/lib/api/labs';
import {
  StuckLearnersTable,
  type StuckLearnerRow,
} from '@/components/admin/learning/stuck-learners-table';

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

  let stuckRows: StuckLearnerRow[] = [];
  try {
    const labs = await ssrGet<LabSummary[]>('/labs');
    const pathLabs = labs.filter((l) => l.learningPathId === pathId);
    const perLab = await Promise.all(
      pathLabs.map(async (lab) => {
        try {
          const rows = await ssrGet<StuckLearner[]>(
            `/admin/labs/${encodeURIComponent(lab.slug)}/stuck-learners`,
          );
          return rows.map<StuckLearnerRow>((r) => ({
            ...r,
            labSlug: lab.slug,
            labTitle: lab.title,
          }));
        } catch {
          return [] as StuckLearnerRow[];
        }
      }),
    );
    stuckRows = perLab.flat().sort((a, b) => b.attemptCount - a.attemptCount);
  } catch {
    stuckRows = [];
  }

  return (
    <>
      <div className="h-[calc(100vh-4rem)] overflow-hidden">
        <PathEditor pathId={pathId} initialPath={initialPath} />
      </div>
      <div className="mx-auto max-w-content px-6 py-10">
        <StuckLearnersTable rows={stuckRows} />
      </div>
    </>
  );
}
