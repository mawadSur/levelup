import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { AssignPathDto } from './dto/assign-path.dto';
import { SaveBulkDto } from './dto/save-bulk.dto';
import { AiLevel } from '@levelup/db';

// The curriculum map renders paths in named tiers. AiLevel values map to
// learner-facing labels so the frontend doesn't need to know about the enum.
const TIER_META: Record<AiLevel, { label: string; tagline: string; order: number }> = {
  BEGINNER: {
    label: 'Apprentice',
    tagline: 'Start here. Get safe. Get oriented.',
    order: 0,
  },
  PRACTITIONER: {
    label: 'Practitioner',
    tagline: 'Apply AI to your daily Kapitus work.',
    order: 1,
  },
  POWER_USER: {
    label: 'Specialist',
    tagline: 'Repeatable patterns, deeper technique.',
    order: 2,
  },
  CHAMPION: {
    label: 'Hero',
    tagline: 'Lead AI culture for your team.',
    order: 3,
  },
};

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

  /**
   * Curriculum map — paths grouped by tier with the user's progress overlay.
   *
   * Returns the data the /learn/curriculum page needs to render the full
   * Kapitus academy: tiers as columns, paths as cards within each tier,
   * prerequisite slugs encoded on each card so the client can draw locks +
   * arrows.
   */
  async getCurriculumMap(user: SessionPayload) {
    const paths = await this.prisma.learningPath.findMany({
      where: {
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
        isPublished: true,
      },
      orderBy: [{ tier: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { lessons: true } },
        lessons: { select: { id: true } },
        assignments: { where: { userId: user.userId }, select: { id: true } },
      },
    });

    // Fetch the user's lesson completions in one query so we can compute
    // path-level completionRate without N+1.
    const allLessonIds = paths.flatMap((p) => p.lessons.map((l) => l.id));
    const progress = allLessonIds.length
      ? await this.prisma.userProgress.findMany({
          where: { userId: user.userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true, status: true },
        })
      : [];
    const completedLessonIds = new Set(
      progress.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId),
    );

    // Build a slug → completionRate map (used to compute prerequisite unlocks).
    const completionBySlug = new Map<string, number>();
    for (const p of paths) {
      const total = p._count.lessons;
      const done = p.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      completionBySlug.set(p.slug, total === 0 ? 0 : done / total);
    }

    // Second pass: build the card shape including unlock status.
    const cards = paths.map((p) => {
      const total = p._count.lessons;
      const done = p.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const completionRate = total === 0 ? 0 : done / total;
      const prereqs = (p.prerequisiteSlugs as string[]) ?? [];
      const blockingPrereqs = prereqs.filter((slug) => (completionBySlug.get(slug) ?? 0) < 1);
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        tier: p.tier,
        isCore: p.isCore,
        prerequisiteSlugs: prereqs,
        blockingPrereqs,
        isUnlocked: blockingPrereqs.length === 0,
        lessonCount: total,
        completedLessons: done,
        completionRate,
        isComplete: total > 0 && completionRate === 1,
        isAssigned: p.assignments.length > 0,
        orderIndex: p.orderIndex,
      };
    });

    // Group by tier in display order.
    const byTier = new Map<AiLevel, typeof cards>();
    for (const card of cards) {
      const list = byTier.get(card.tier) ?? [];
      list.push(card);
      byTier.set(card.tier, list);
    }

    const tiers = Object.entries(TIER_META)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, meta]) => ({
        key: key as AiLevel,
        label: meta.label,
        tagline: meta.tagline,
        paths: byTier.get(key as AiLevel) ?? [],
      }));

    // Compute the user's effective tier from completed core paths. A user who
    // has finished all CORE paths in a tier graduates to the next tier.
    const completedSlugs = new Set(cards.filter((c) => c.isComplete).map((c) => c.slug));
    const tierOrder: AiLevel[] = ['BEGINNER', 'PRACTITIONER', 'POWER_USER', 'CHAMPION'];
    let userTier: AiLevel = 'BEGINNER';
    for (const t of tierOrder) {
      const coreInTier = cards.filter((c) => c.tier === t && c.isCore);
      const allCoreDone =
        coreInTier.length > 0 && coreInTier.every((c) => completedSlugs.has(c.slug));
      if (allCoreDone) {
        const next = tierOrder[tierOrder.indexOf(t) + 1];
        if (next) userTier = next;
      }
    }

    return {
      user: {
        id: user.userId,
        tierKey: userTier,
        tierLabel: TIER_META[userTier].label,
      },
      tiers,
    };
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
