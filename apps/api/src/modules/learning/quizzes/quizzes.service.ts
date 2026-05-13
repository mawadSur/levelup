import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma';
import { ProgressService } from '../progress/progress.service';
import { GameService } from '../../game/game.service';
import { SessionPayload } from '@levelup/auth-client';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
// SubmitAttemptDto is { answers: number[] } — quizId comes from the URL param

// ---------------------------------------------------------------------------
// Internal DTO for quiz creation / update
// ---------------------------------------------------------------------------

const questionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(10),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0),
});

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(questionSchema).min(1).max(50),
});

export type CreateQuizDto = z.infer<typeof createQuizSchema>;

// ---------------------------------------------------------------------------
// Helper: strip correctIndex for public reads
// ---------------------------------------------------------------------------

type SafeQuestion = {
  id: string;
  quizId: string;
  prompt: string;
  choices: unknown;
  explanation: string | null;
  orderIndex: number;
};

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
    private readonly gameService: GameService,
  ) {}

  // -------------------------------------------------------------------------
  // Org-scope helpers
  // -------------------------------------------------------------------------

  private async assertLessonAccess(lessonId: string, user: SessionPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { learningPath: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const orgOk =
      lesson.learningPath.organizationId === user.organizationId ||
      lesson.learningPath.organizationId === null;
    if (!orgOk) throw new NotFoundException('Lesson not found');

    return lesson;
  }

  private async assertLessonOwnership(lessonId: string, user: SessionPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { learningPath: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.learningPath.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot modify this quiz');
    }
    return lesson;
  }

  private async assertQuizAccess(quizId: string, user: SessionPayload) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { learningPath: true } },
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const orgOk =
      quiz.lesson.learningPath.organizationId === user.organizationId ||
      quiz.lesson.learningPath.organizationId === null;
    if (!orgOk) throw new NotFoundException('Quiz not found');

    return quiz;
  }

  private async assertQuizOwnership(quizId: string, user: SessionPayload) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { learningPath: true } },
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.lesson.learningPath.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot modify this quiz');
    }
    return quiz;
  }

  // -------------------------------------------------------------------------
  // READ
  // -------------------------------------------------------------------------

  async listQuizzes(lessonId: string, user: SessionPayload) {
    await this.assertLessonAccess(lessonId, user);

    const quizzes = await this.prisma.quiz.findMany({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            quizId: true,
            prompt: true,
            choices: true,
            explanation: true,
            orderIndex: true,
            // correctIndex deliberately omitted
          },
        },
      },
    });

    return quizzes;
  }

  async getQuiz(quizId: string, user: SessionPayload) {
    const quiz = await this.assertQuizAccess(quizId, user);

    const safeQuestions: SafeQuestion[] = quiz.questions.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      prompt: q.prompt,
      choices: q.choices,
      explanation: q.explanation,
      orderIndex: q.orderIndex,
      // correctIndex omitted
    }));

    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      title: quiz.title,
      questions: safeQuestions,
    };
  }

  // -------------------------------------------------------------------------
  // MUTATIONS
  // -------------------------------------------------------------------------

  async createQuiz(lessonId: string, user: SessionPayload, dto: CreateQuizDto) {
    await this.assertLessonOwnership(lessonId, user);

    const quiz = await this.prisma.quiz.create({
      data: {
        lessonId,
        title: dto.title,
        questions: {
          create: dto.questions.map((q) => ({
            prompt: q.prompt,
            choices: q.choices,
            correctIndex: q.correctIndex,
            explanation: q.explanation ?? null,
            orderIndex: q.orderIndex,
          })),
        },
      },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'quiz.create',
        targetType: 'Quiz',
        targetId: quiz.id,
        metadata: { title: quiz.title, lessonId, questionCount: dto.questions.length },
      },
    });

    return quiz;
  }

  async updateQuiz(quizId: string, user: SessionPayload, dto: CreateQuizDto) {
    await this.assertQuizOwnership(quizId, user);

    // Transactionally replace all questions
    const quiz = await this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { quizId } });

      return tx.quiz.update({
        where: { id: quizId },
        data: {
          title: dto.title,
          questions: {
            create: dto.questions.map((q) => ({
              prompt: q.prompt,
              choices: q.choices,
              correctIndex: q.correctIndex,
              explanation: q.explanation ?? null,
              orderIndex: q.orderIndex,
            })),
          },
        },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'quiz.update',
        targetType: 'Quiz',
        targetId: quizId,
        metadata: { questionCount: dto.questions.length },
      },
    });

    return quiz;
  }

  async deleteQuiz(quizId: string, user: SessionPayload) {
    const quiz = await this.assertQuizOwnership(quizId, user);

    await this.prisma.quiz.delete({ where: { id: quizId } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'quiz.delete',
        targetType: 'Quiz',
        targetId: quizId,
        metadata: { title: quiz.title },
      },
    });

    return { deleted: true };
  }

  // -------------------------------------------------------------------------
  // ATTEMPT
  // -------------------------------------------------------------------------

  /**
   * SEV-17 fix: a failing attempt previously echoed back the full
   * `correctAnswers` and `explanations` arrays, letting a user farm the answer
   * key by submitting a deliberate failure first. We now withhold those fields
   * until the user has *earned* them — either by passing, or by exhausting
   * MAX_ATTEMPTS_BEFORE_REVEAL failed attempts (so a stuck learner is not
   * locked out forever).
   *
   * Wire shape:
   *   - `score`, `total`, `passed` are always returned.
   *   - `attemptsRemaining` is the number of failing attempts before the
   *     answers will be revealed. `null` when answers are already included.
   *   - `correctAnswers` and `explanations` are present iff `passed === true`
   *     OR this is the user's MAX_ATTEMPTS_BEFORE_REVEAL'th (or later) attempt.
   *
   * If you change this, also update `quizAttemptResultSchema` in
   * @levelup/types and the rendering branches in apps/web quiz-runner.tsx.
   */
  private static readonly MAX_ATTEMPTS_BEFORE_REVEAL = 3;

  async submitAttempt(
    quizId: string,
    user: SessionPayload,
    dto: SubmitAttemptDto,
  ): Promise<{
    attemptId: string;
    score: number;
    total: number;
    passed: boolean;
    attemptsRemaining: number | null;
    correctAnswers?: number[];
    explanations?: Record<string, string>;
  }> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        lesson: { include: { learningPath: true } },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    const orgOk =
      quiz.lesson.learningPath.organizationId === user.organizationId ||
      quiz.lesson.learningPath.organizationId === null;
    if (!orgOk) throw new NotFoundException('Quiz not found');

    const questions = quiz.questions;

    if (dto.answers.length !== questions.length) {
      throw new BadRequestException(
        `Expected ${questions.length} answers, got ${dto.answers.length}`,
      );
    }

    // Score the attempt — we always compute the answer key locally; whether
    // we *return* it to the caller is decided below based on pass / attempt
    // count. NEVER short-circuit this loop.
    let correctCount = 0;
    const correctAnswers: number[] = [];
    const explanations: Record<string, string> = {};

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      const userAnswer = dto.answers[i];
      correctAnswers.push(q.correctIndex);
      if (q.explanation) {
        explanations[q.id] = q.explanation;
      }
      if (userAnswer !== undefined && userAnswer === q.correctIndex) {
        correctCount++;
      }
    }

    const total = questions.length;
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= 70;

    // Did this user have any prior attempts at this quiz? Determines whether
    // a passing attempt earns the FIRST_TRY bonus or only the RETRY award.
    const priorAttemptCount = await this.prisma.quizAttempt.count({
      where: { quizId, userId: user.userId },
    });
    const isFirstAttempt = priorAttemptCount === 0;

    // Persist attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.userId,
        answers: dto.answers,
        score,
        passed,
      },
    });

    // Total attempts including the row we just inserted.
    const totalAttempts = priorAttemptCount + 1;

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'quiz.attempt',
        targetType: 'Quiz',
        targetId: quizId,
        metadata: {
          score,
          passed,
          attemptId: attempt.id,
          attemptNumber: totalAttempts,
        },
      },
    });

    // If passing → mark lesson COMPLETED via ProgressService
    if (passed) {
      await this.progressService.completeLessonFromQuiz(quiz.lessonId, user, score);

      // Award quiz XP. sourceId pinned to the quiz (and "kind" disambiguates
      // first-try vs retry), so the same first-try bonus can't be double-
      // collected even if the same quiz is re-passed later.
      await this.gameService.awardXp({
        userId: user.userId,
        organizationId: user.organizationId,
        kind: isFirstAttempt ? 'QUIZ_PASSED_FIRST_TRY' : 'QUIZ_PASSED_RETRY',
        sourceType: 'Quiz',
        sourceId: quizId,
      });

      await this.gameService.incrementQuestProgress(user.userId, 'quiz', 1);
    }

    // SEV-17 reveal gate: pass OR Nth+ failed attempt earns the answer key.
    const reveal = passed || totalAttempts >= QuizzesService.MAX_ATTEMPTS_BEFORE_REVEAL;
    const attemptsRemaining = reveal
      ? null
      : Math.max(0, QuizzesService.MAX_ATTEMPTS_BEFORE_REVEAL - totalAttempts);

    if (reveal) {
      return {
        attemptId: attempt.id,
        score,
        total,
        passed,
        attemptsRemaining,
        correctAnswers,
        explanations,
      };
    }

    return {
      attemptId: attempt.id,
      score,
      total,
      passed,
      attemptsRemaining,
    };
  }

  async getMyAttempts(quizId: string, user: SessionPayload) {
    await this.assertQuizAccess(quizId, user);

    return this.prisma.quizAttempt.findMany({
      where: { quizId, userId: user.userId },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        answers: true,
        completedAt: true,
      },
    });
  }
}
