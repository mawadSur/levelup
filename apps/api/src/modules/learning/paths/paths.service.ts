import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import type { CreatePathDto } from './dto/create-path.dto';
import type { UpdatePathDto } from './dto/update-path.dto';
import type { AssignPathDto } from './dto/assign-path.dto';
import type { SaveBulkDto } from './dto/save-bulk.dto';

@Injectable()
export class PathsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // READ helpers
  // -------------------------------------------------------------------------

  /** Returns org-scoped + global paths with lesson count and assignment flag */
  async listPaths(user: SessionPayload) {
    const paths = await this.prisma.learningPath.findMany({
      where: {
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
        isPublished: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { lessons: true } },
        assignments: {
          where: { userId: user.userId },
          select: { id: true },
        },
      },
    });

    return paths.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      title: p.title,
      slug: p.slug,
      description: p.description,
      targetRole: p.targetRole,
      targetLevel: p.targetLevel,
      coverImageUrl: p.coverImageUrl,
      isPublished: p.isPublished,
      orderIndex: p.orderIndex,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lessonCount: p._count.lessons,
      isAssigned: p.assignments.length > 0,
    }));
  }

  /** Single path with lessons (ordered) — no quiz internals */
  async getPathBySlug(slug: string, user: SessionPayload) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        slug,
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            estimatedMinutes: true,
            orderIndex: true,
            videoUrl: true,
          },
        },
      },
    });

    if (!path) throw new NotFoundException('Learning path not found');

    return path;
  }

  // -------------------------------------------------------------------------
  // MUTATIONS
  // -------------------------------------------------------------------------

  async createPath(user: SessionPayload, dto: CreatePathDto) {
    const path = await this.prisma.learningPath.create({
      data: {
        organizationId: user.organizationId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        targetRole: dto.targetRole ?? null,
        targetLevel: dto.targetLevel,
        coverImageUrl: dto.coverImageUrl,
        isPublished: dto.isPublished,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'path.create',
        targetType: 'LearningPath',
        targetId: path.id,
        metadata: { title: path.title, slug: path.slug },
      },
    });

    return path;
  }

  async updatePath(id: string, user: SessionPayload, dto: UpdatePathDto) {
    const existing = await this.prisma.learningPath.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundException('Learning path not found');
    if (existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot modify a path outside your organization');
    }

    const updated = await this.prisma.learningPath.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetRole !== undefined && { targetRole: dto.targetRole }),
        ...(dto.targetLevel !== undefined && { targetLevel: dto.targetLevel }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'path.update',
        targetType: 'LearningPath',
        targetId: id,
        metadata: { changes: dto },
      },
    });

    return updated;
  }

  async deletePath(id: string, user: SessionPayload) {
    const existing = await this.prisma.learningPath.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundException('Learning path not found');
    if (existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot delete a path outside your organization');
    }

    await this.prisma.learningPath.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'path.delete',
        targetType: 'LearningPath',
        targetId: id,
        metadata: { title: existing.title },
      },
    });

    return { deleted: true };
  }

  // -------------------------------------------------------------------------
  // ASSIGNMENTS
  // -------------------------------------------------------------------------

  async assignUsers(id: string, user: SessionPayload, dto: AssignPathDto) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id,
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
    });

    if (!path) throw new NotFoundException('Learning path not found');

    // Upsert each assignment (idempotent)
    await this.prisma.$transaction(
      dto.userIds.map((userId) =>
        this.prisma.learningPathAssignment.upsert({
          where: { learningPathId_userId: { learningPathId: id, userId } },
          create: {
            learningPathId: id,
            userId,
            assignedById: user.userId,
          },
          update: {},
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'path.assign',
        targetType: 'LearningPath',
        targetId: id,
        metadata: { userIds: dto.userIds, count: dto.userIds.length },
      },
    });

    return { assigned: dto.userIds.length };
  }

  async unassignUsers(id: string, user: SessionPayload, dto: AssignPathDto) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id,
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
    });

    if (!path) throw new NotFoundException('Learning path not found');

    await this.prisma.learningPathAssignment.deleteMany({
      where: {
        learningPathId: id,
        userId: { in: dto.userIds },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'path.unassign',
        targetType: 'LearningPath',
        targetId: id,
        metadata: { userIds: dto.userIds, count: dto.userIds.length },
      },
    });

    return { unassigned: dto.userIds.length };
  }

  // -------------------------------------------------------------------------
  // SAVE-BULK  (manual path editor endpoint)
  // -------------------------------------------------------------------------

  /**
   * Atomically applies a full-path diff supplied by the admin editor.
   *
   * Strategy:
   * - Path metadata fields are shallow-patched (only supplied fields applied).
   * - Lessons: lessons with an `id` are updated in-place; those without an `id`
   *   are created. Existing lessons whose `id` does NOT appear in the incoming
   *   list are deleted. OrderIndex comes from the array position.
   * - Quizzes: if `quiz` is present on a lesson it replaces the lesson's quiz
   *   (delete all old questions + re-create). Omitting `quiz` leaves the
   *   existing quiz untouched.
   *
   * Everything runs inside a single transaction so partial writes are impossible.
   */
  async saveBulk(id: string, user: SessionPayload, dto: SaveBulkDto) {
    const existing = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
          include: { quizzes: { include: { questions: true } } },
        },
      },
    });

    if (!existing) throw new NotFoundException('Learning path not found');
    if (existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot modify a path outside your organization');
    }

    const existingLessonIds = new Set(existing.lessons.map((l) => l.id));
    const incomingIds = new Set(dto.lessons.map((l) => l.id).filter(Boolean) as string[]);
    const toDelete = [...existingLessonIds].filter((lid) => !incomingIds.has(lid));

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update path metadata
      const updatedPath = await tx.learningPath.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.targetRole !== undefined && { targetRole: dto.targetRole }),
          ...(dto.targetLevel !== undefined && { targetLevel: dto.targetLevel }),
          ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        },
      });

      // 2. Delete removed lessons (cascades to quizzes + questions)
      if (toDelete.length > 0) {
        await tx.lesson.deleteMany({ where: { id: { in: toDelete } } });
      }

      // 3. Upsert lessons
      for (let i = 0; i < dto.lessons.length; i++) {
        const lessonDto = dto.lessons[i];
        if (!lessonDto) continue;

        let lessonId: string;

        if (lessonDto.id && existingLessonIds.has(lessonDto.id)) {
          // Update existing lesson
          await tx.lesson.update({
            where: { id: lessonDto.id },
            data: {
              title: lessonDto.title,
              slug: lessonDto.slug,
              body: lessonDto.body,
              estimatedMinutes: lessonDto.estimatedMinutes,
              orderIndex: i,
            },
          });
          lessonId = lessonDto.id;
        } else {
          // Create new lesson
          const newLesson = await tx.lesson.create({
            data: {
              learningPathId: id,
              title: lessonDto.title,
              slug: lessonDto.slug,
              body: lessonDto.body,
              estimatedMinutes: lessonDto.estimatedMinutes,
              orderIndex: i,
            },
          });
          lessonId = newLesson.id;
        }

        // 4. Upsert quiz if provided
        if (lessonDto.quiz) {
          const quizDto = lessonDto.quiz;

          // Find the lesson's existing quiz (if any)
          const existingQuiz = lessonDto.id
            ? existing.lessons.find((l) => l.id === lessonDto.id)?.quizzes[0]
            : undefined;

          if (existingQuiz) {
            // Replace questions wholesale
            await tx.quizQuestion.deleteMany({ where: { quizId: existingQuiz.id } });
            await tx.quiz.update({
              where: { id: existingQuiz.id },
              data: {
                title: quizDto.title,
                questions: {
                  create: quizDto.questions.map((q) => ({
                    prompt: q.prompt,
                    choices: q.choices,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation ?? null,
                    orderIndex: q.orderIndex,
                  })),
                },
              },
            });
          } else {
            // Create brand-new quiz
            await tx.quiz.create({
              data: {
                lessonId,
                title: quizDto.title,
                questions: {
                  create: quizDto.questions.map((q) => ({
                    prompt: q.prompt,
                    choices: q.choices,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation ?? null,
                    orderIndex: q.orderIndex,
                  })),
                },
              },
            });
          }
        }
      }

      return updatedPath;
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'path.bulk_save',
        targetType: 'LearningPath',
        targetId: id,
        metadata: {
          lessonCount: dto.lessons.length,
          deletedLessons: toDelete.length,
          isPublished: dto.isPublished,
        },
      },
    });

    return result;
  }

  async getPathLearners(id: string, user: SessionPayload) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id,
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
      include: {
        _count: { select: { lessons: true } },
      },
    });

    if (!path) throw new NotFoundException('Learning path not found');

    const assignments = await this.prisma.learningPathAssignment.findMany({
      where: { learningPathId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    const totalLessons = path._count.lessons;

    // Batch progress look-up for all assigned users
    const userIds = assignments.map((a) => a.userId);
    const progressRows = await this.prisma.userProgress.findMany({
      where: {
        userId: { in: userIds },
        lesson: { learningPathId: id },
        status: 'COMPLETED',
      },
      select: { userId: true },
    });

    const completedByUser = new Map<string, number>();
    for (const row of progressRows) {
      completedByUser.set(row.userId, (completedByUser.get(row.userId) ?? 0) + 1);
    }

    return assignments.map((a) => {
      const completed = completedByUser.get(a.userId) ?? 0;
      const progressPct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      return {
        user: a.user,
        assignedAt: a.assignedAt,
        lessonsCompleted: completed,
        totalLessons,
        progressPct,
      };
    });
  }
}
