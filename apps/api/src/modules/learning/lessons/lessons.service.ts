import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { enqueueEmbedContent } from '@levelup/queue';
import { SessionPayload } from '@levelup/auth-client';
import { UpsertLessonDto } from './dto/upsert-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Asserts the path is visible to the user and returns it */
  private async assertPathAccess(pathId: string, user: SessionPayload) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id: pathId,
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');
    return path;
  }

  /** Asserts that the caller's org owns the path (for mutations) */
  private async assertPathOwnership(pathId: string, user: SessionPayload) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });
    if (!path) throw new NotFoundException('Learning path not found');
    if (path.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot modify lessons outside your organization');
    }
    return path;
  }

  /** Asserts a lesson exists and the caller can reach it, returning the lesson + path */
  private async assertLessonAccess(lessonId: string, user: SessionPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { learningPath: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const { learningPath } = lesson;
    const orgOk =
      learningPath.organizationId === user.organizationId || learningPath.organizationId === null;
    if (!orgOk) throw new NotFoundException('Lesson not found');

    return lesson;
  }

  /** Asserts the lesson belongs to a path the caller's org owns */
  private async assertLessonOwnership(lessonId: string, user: SessionPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { learningPath: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.learningPath.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot modify this lesson');
    }
    return lesson;
  }

  // -------------------------------------------------------------------------
  // READ
  // -------------------------------------------------------------------------

  async listLessons(pathId: string, user: SessionPayload) {
    await this.assertPathAccess(pathId, user);

    const rows = await this.prisma.lesson.findMany({
      where: { learningPathId: pathId },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        learningPathId: true,
        title: true,
        slug: true,
        estimatedMinutes: true,
        orderIndex: true,
        videoUrl: true,
        // quizzes: at most one per lesson in current data model. We expose
        // the first id so the lesson page can navigate without a separate
        // GET /quizzes?lessonId= probe.
        quizzes: { select: { id: true }, take: 1 },
      },
    });

    return rows.map(({ quizzes, ...rest }) => ({
      ...rest,
      quizId: quizzes[0]?.id ?? null,
    }));
  }

  async getLesson(lessonId: string, user: SessionPayload) {
    const lesson = await this.assertLessonAccess(lessonId, user);

    // Resolve the (at most one) quiz id so the lesson page can fetch the
    // quiz directly via /quizzes/:id without probing a non-existent
    // by-lesson route.
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId: lesson.id },
      select: { id: true },
    });

    // Pre-rendered scene images (only populated for scenario lessons). We
    // surface them on the same GET so the renderer doesn't need a second
    // round trip — empty record for non-scenario lessons.
    const sceneAssets = await this.prisma.lessonSceneAsset.findMany({
      where: { lessonId: lesson.id },
      select: { sceneSlug: true, blobUrl: true },
    });
    const sceneAssetMap: Record<string, string> = {};
    for (const a of sceneAssets) sceneAssetMap[a.sceneSlug] = a.blobUrl;

    // Pre-rendered per-lesson images (READ-kind lessons whose markdown body
    // contains one or more `[image]` directives). Returned ordered by slot so
    // the renderer can pair each directive with its blob URL by occurrence.
    const imageAssetsRows = await this.prisma.lessonImageAsset.findMany({
      where: { lessonId: lesson.id },
      orderBy: { slot: 'asc' },
      select: { slot: true, blobUrl: true },
    });

    // For lab-kind lessons, surface the *visible* lab fields so the renderer
    // can mount the lab runner inline. SystemPrompt / seededContext / rubric
    // remain server-only and are fetched separately via the labs runs/attempts
    // endpoints when the learner interacts.
    let labSummary: {
      id: string;
      slug: string;
      title: string;
      brief: string;
      estimatedMinutes: number;
      modelKey: string;
    } | null = null;
    if (lesson.kind === 'LAB' && lesson.labId) {
      const lab = await this.prisma.lab.findUnique({
        where: { id: lesson.labId },
        select: {
          id: true,
          slug: true,
          title: true,
          brief: true,
          estimatedMinutes: true,
          modelKey: true,
        },
      });
      labSummary = lab;
    }

    return {
      id: lesson.id,
      learningPathId: lesson.learningPathId,
      title: lesson.title,
      slug: lesson.slug,
      body: lesson.body,
      videoUrl: lesson.videoUrl,
      estimatedMinutes: lesson.estimatedMinutes,
      orderIndex: lesson.orderIndex,
      kind: lesson.kind,
      quizId: quiz?.id ?? null,
      sceneAssets: sceneAssetMap,
      imageAssets: imageAssetsRows,
      lab: labSummary,
    };
  }

  // -------------------------------------------------------------------------
  // MUTATIONS
  // -------------------------------------------------------------------------

  async createLesson(pathId: string, user: SessionPayload, dto: UpsertLessonDto) {
    await this.assertPathOwnership(pathId, user);

    const lesson = await this.prisma.lesson.create({
      data: {
        learningPathId: pathId,
        title: dto.title,
        slug: dto.slug,
        body: dto.body,
        videoUrl: dto.videoUrl ?? null,
        estimatedMinutes: dto.estimatedMinutes,
        orderIndex: dto.orderIndex,
      },
    });

    // Enqueue embedding job (fire and forget — no await on the promise rejection)
    void enqueueEmbedContent({ lessonId: lesson.id });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'lesson.create',
        targetType: 'Lesson',
        targetId: lesson.id,
        metadata: { title: lesson.title, pathId },
      },
    });

    return lesson;
  }

  async updateLesson(lessonId: string, user: SessionPayload, dto: UpsertLessonDto) {
    const existing = await this.assertLessonOwnership(lessonId, user);

    const lesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title,
        slug: dto.slug,
        body: dto.body,
        videoUrl: dto.videoUrl ?? null,
        estimatedMinutes: dto.estimatedMinutes,
        orderIndex: dto.orderIndex,
      },
    });

    // Re-enqueue embedding if the body content changed
    if (dto.body !== existing.body) {
      void enqueueEmbedContent({ lessonId: lesson.id });
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'lesson.update',
        targetType: 'Lesson',
        targetId: lessonId,
        metadata: { changes: dto },
      },
    });

    return lesson;
  }

  async deleteLesson(lessonId: string, user: SessionPayload) {
    const existing = await this.assertLessonOwnership(lessonId, user);

    await this.prisma.lesson.delete({ where: { id: lessonId } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'lesson.delete',
        targetType: 'Lesson',
        targetId: lessonId,
        metadata: { title: existing.title },
      },
    });

    return { deleted: true };
  }

  async reorderLessons(pathId: string, user: SessionPayload, lessonIds: string[]) {
    await this.assertPathOwnership(pathId, user);

    // Validate all lessons belong to the path
    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: lessonIds }, learningPathId: pathId },
      select: { id: true },
    });

    if (lessons.length !== lessonIds.length) {
      throw new NotFoundException('One or more lesson IDs do not belong to this path');
    }

    await this.prisma.$transaction(
      lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'lesson.reorder',
        targetType: 'LearningPath',
        targetId: pathId,
        metadata: { lessonIds },
      },
    });

    return { reordered: lessonIds.length };
  }
}
