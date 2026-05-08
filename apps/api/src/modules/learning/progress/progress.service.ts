import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { LessonStatus } from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import type { TeamProgressEntry } from '@levelup/types';
import { GameService } from '../../game/game.service';
import { signCertificate } from '../../certificates/cert-signing';
import { track, captureEvent } from '@levelup/analytics';

const FIRST_LESSON_BADGE_SLUG = 'first-lesson';
const PASS_THRESHOLD = 70;
const MAX_TEAM_PROGRESS_USER_IDS = 200;

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
  ) {}

  // -------------------------------------------------------------------------
  // READ
  // -------------------------------------------------------------------------

  /**
   * Per-assigned-path progress summary for the signed-in user.
   *
   * Returns one row per assignment with:
   *   - pathId, pathSlug, pathTitle
   *   - lessonsTotal / lessonsCompleted
   *   - percentComplete (0–100, integer)
   *   - lastActivityAt — most recent lesson completedAt across the path,
   *     or null if no lesson has been completed yet
   *   - currentLessonId — first incomplete lesson id (for "Continue" CTAs)
   */
  async getMyProgress(user: SessionPayload) {
    const assignments = await this.prisma.learningPathAssignment.findMany({
      where: { userId: user.userId },
      include: {
        learningPath: {
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, orderIndex: true },
            },
          },
        },
      },
    });

    if (assignments.length === 0) return [];

    const pathIds = assignments.map((a) => a.learningPathId);
    const progressRows = await this.prisma.userProgress.findMany({
      where: {
        userId: user.userId,
        lesson: { learningPathId: { in: pathIds } },
      },
      select: { lessonId: true, status: true, completedAt: true, score: true },
    });

    const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

    return assignments.map((a) => {
      const lessons = a.learningPath.lessons;
      const total = lessons.length;
      const completed = lessons.filter(
        (l) => progressMap.get(l.id)?.status === LessonStatus.COMPLETED,
      ).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const currentLesson =
        lessons.find((l) => progressMap.get(l.id)?.status !== LessonStatus.COMPLETED) ?? null;

      // Most recent activity timestamp across the path. Falls back to the
      // assignedAt date when no lesson activity has occurred yet so the UI
      // always has something to sort/display.
      let lastActivityAt: Date = a.assignedAt;
      for (const l of lessons) {
        const p = progressMap.get(l.id);
        if (p?.completedAt && p.completedAt > lastActivityAt) {
          lastActivityAt = p.completedAt;
        }
      }

      return {
        pathId: a.learningPath.id,
        pathSlug: a.learningPath.slug,
        pathTitle: a.learningPath.title,
        lessonsTotal: total,
        lessonsCompleted: completed,
        percentComplete: pct,
        lastActivityAt: lastActivityAt.toISOString(),
        currentLessonId: currentLesson?.id ?? null,
        assignedAt: a.assignedAt.toISOString(),
      };
    });
  }

  /** Drilled-down progress for a single assigned path */
  async getMyPathProgress(pathId: string, user: SessionPayload) {
    const path = await this.prisma.learningPath.findFirst({
      where: {
        id: pathId,
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
          },
        },
      },
    });

    if (!path) throw new NotFoundException('Learning path not found');

    const lessonIds = path.lessons.map((l) => l.id);
    const progressRows = await this.prisma.userProgress.findMany({
      where: { userId: user.userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, status: true, completedAt: true, score: true },
    });
    const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

    const lessons = path.lessons.map((l) => ({
      ...l,
      status: progressMap.get(l.id)?.status ?? LessonStatus.NOT_STARTED,
      completedAt: progressMap.get(l.id)?.completedAt ?? null,
      score: progressMap.get(l.id)?.score ?? null,
    }));

    const completed = lessons.filter((l) => l.status === LessonStatus.COMPLETED).length;
    const total = lessons.length;

    return {
      learningPath: { id: path.id, title: path.title, slug: path.slug },
      lessons,
      lessonsCompleted: completed,
      totalLessons: total,
      progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /** Admin/Manager view of a specific user's progress */
  async getUserProgress(targetUserId: string, user: SessionPayload) {
    // Validate the target user is in the same org
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { organizationId: true, name: true, email: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');
    if (targetUser.organizationId !== user.organizationId) {
      throw new ForbiddenException('User is outside your organization');
    }

    // Re-use getMyProgress logic by impersonating the target user's ID
    const assignments = await this.prisma.learningPathAssignment.findMany({
      where: { userId: targetUserId },
      include: {
        learningPath: {
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, orderIndex: true },
            },
          },
        },
      },
    });

    const pathIds = assignments.map((a) => a.learningPathId);
    const progressRows = await this.prisma.userProgress.findMany({
      where: {
        userId: targetUserId,
        lesson: { learningPathId: { in: pathIds } },
      },
      select: { lessonId: true, status: true, completedAt: true },
    });
    const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

    return assignments.map((a) => {
      const lessons = a.learningPath.lessons;
      const total = lessons.length;
      const completed = lessons.filter(
        (l) => progressMap.get(l.id)?.status === LessonStatus.COMPLETED,
      ).length;
      return {
        learningPath: {
          id: a.learningPath.id,
          title: a.learningPath.title,
          slug: a.learningPath.slug,
        },
        assignedAt: a.assignedAt,
        lessonsCompleted: completed,
        totalLessons: total,
        progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }

  /**
   * Bulk fetch progress for a team. Replaces the N+1 pattern on the team page.
   *
   * Authorization:
   *  - Caller must be ADMIN or MANAGER (enforced at the controller via @Roles).
   *  - We filter the requested userIds down to those in the caller's
   *    organization. Cross-org ids are silently dropped (rather than 403'd) so
   *    that a stale client cache can't trigger a hard error — the missing ids
   *    just won't appear in the response.
   *  - Department-level scoping is intentionally NOT applied here: the existing
   *    `getUserProgress` (single-user) endpoint scopes only by organization,
   *    and managers in this product manage cross-department reports. If finer
   *    scoping is added later, layer it on `getUserProgress` first so the two
   *    code paths stay consistent.
   *
   * Implementation: three round trips regardless of `userIds.length`:
   *  1. assignment rows for all users
   *  2. completed-vs-total lesson counts via `groupBy`
   *  3. last-activity timestamp from `User.lastLoginAt`
   *  Aggregated in-memory, then one entry produced per requested userId. Users
   *  who exist in the org but have zero assignments still appear with zeros.
   */
  async getTeamProgress(
    callerUser: SessionPayload,
    userIds: string[],
  ): Promise<TeamProgressEntry[]> {
    if (userIds.length === 0) return [];
    if (userIds.length > MAX_TEAM_PROGRESS_USER_IDS) {
      throw new BadRequestException(
        `Cannot request more than ${MAX_TEAM_PROGRESS_USER_IDS} userIds per call`,
      );
    }

    if (callerUser.role === 'EMPLOYEE') {
      // Defensive: controller @Roles('MANAGER') already excludes EMPLOYEE, but
      // throw explicitly so a future direct service caller doesn't bypass it.
      throw new ForbiddenException('Manager or admin role required');
    }

    // Filter to org-scoped users only. We only need ids + lastLoginAt.
    const orgUsers = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: callerUser.organizationId,
      },
      select: { id: true, lastLoginAt: true },
    });
    const allowedUserIds = orgUsers.map((u) => u.id);

    if (allowedUserIds.length === 0) {
      return userIds.map((userId) => ({
        userId,
        assignedPaths: 0,
        completedLessons: 0,
        totalLessons: 0,
        completionRate: 0,
        lastActiveAt: null,
      }));
    }

    const lastActiveByUser = new Map<string, Date | null>(
      orgUsers.map((u) => [u.id, u.lastLoginAt]),
    );

    // Pull all assignments + per-path lesson totals in a single query.
    const assignments = await this.prisma.learningPathAssignment.findMany({
      where: { userId: { in: allowedUserIds } },
      select: {
        userId: true,
        learningPathId: true,
        learningPath: {
          select: {
            _count: { select: { lessons: true } },
          },
        },
      },
    });

    // Build a per-user aggregate of assigned-path count + total lessons.
    const aggregateByUser = new Map<
      string,
      { assignedPaths: number; totalLessons: number; pathIds: Set<string> }
    >();
    for (const userId of allowedUserIds) {
      aggregateByUser.set(userId, {
        assignedPaths: 0,
        totalLessons: 0,
        pathIds: new Set<string>(),
      });
    }
    for (const a of assignments) {
      const agg = aggregateByUser.get(a.userId);
      if (!agg) continue;
      agg.assignedPaths += 1;
      agg.totalLessons += a.learningPath._count.lessons;
      agg.pathIds.add(a.learningPathId);
    }

    // Completed-lesson counts per user. We only count lessons that belong to
    // a path the user is currently assigned to so a learner who completed a
    // lesson before being unassigned doesn't inflate their completion ratio.
    const completedByUser = new Map<string, number>();
    if (assignments.length > 0) {
      const completedRows = await this.prisma.userProgress.groupBy({
        by: ['userId'],
        where: {
          userId: { in: allowedUserIds },
          status: LessonStatus.COMPLETED,
          lesson: {
            learningPath: {
              assignments: {
                some: { userId: { in: allowedUserIds } },
              },
            },
          },
        },
        _count: { _all: true },
      });
      for (const row of completedRows) {
        completedByUser.set(row.userId, row._count._all);
      }
    }

    // Materialise one entry per requested userId (preserves caller order).
    return userIds.map<TeamProgressEntry>((userId) => {
      const agg = aggregateByUser.get(userId);
      const lastLogin = lastActiveByUser.get(userId) ?? null;
      const totalLessons = agg?.totalLessons ?? 0;
      const completedLessons = completedByUser.get(userId) ?? 0;
      const completionRate = totalLessons > 0 ? Math.min(1, completedLessons / totalLessons) : 0;

      return {
        userId,
        assignedPaths: agg?.assignedPaths ?? 0,
        completedLessons,
        totalLessons,
        completionRate,
        lastActiveAt: lastLogin ? lastLogin.toISOString() : null,
      };
    });
  }

  // -------------------------------------------------------------------------
  // MUTATIONS
  // -------------------------------------------------------------------------

  /**
   * SEV-7 fix: lesson state transitions must be gated on path assignment so an
   * unassigned learner cannot self-issue a Certificate by walking the lesson
   * complete endpoint for any global / org-visible path. ADMIN and MANAGER are
   * allowed through (so admins can verify paths via the same flow without
   * fabricating a fake LearningPathAssignment row).
   *
   * On rejection we throw a 403 with code NOT_ASSIGNED and emit a
   * `progress.assignment_denied` audit log row keyed by the offending lesson
   * and the user's role.
   */
  private async assertAssigned(
    user: SessionPayload,
    lessonId: string,
    learningPathId: string,
  ): Promise<void> {
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return;

    const exists = await this.prisma.learningPathAssignment.findUnique({
      where: {
        learningPathId_userId: {
          learningPathId,
          userId: user.userId,
        },
      },
      select: { id: true },
    });

    if (!exists) {
      await this.prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action: 'progress.assignment_denied',
          targetType: 'Lesson',
          targetId: lessonId,
          metadata: { learningPathId, role: user.role },
        },
      });

      throw new ForbiddenException({
        error: {
          code: 'NOT_ASSIGNED',
          message: 'You must be assigned to this learning path before progressing.',
        },
      });
    }
  }

  /** Mark a lesson IN_PROGRESS (idempotent, won't downgrade COMPLETED) */
  async startLesson(lessonId: string, user: SessionPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { learningPath: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const orgOk =
      lesson.learningPath.organizationId === user.organizationId ||
      lesson.learningPath.organizationId === null;
    if (!orgOk) throw new NotFoundException('Lesson not found');

    await this.assertAssigned(user, lessonId, lesson.learningPathId);

    const existing = await this.prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
    });

    // Never downgrade COMPLETED → IN_PROGRESS
    if (existing?.status === LessonStatus.COMPLETED) {
      return existing;
    }

    const progress = await this.prisma.userProgress.upsert({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
      create: {
        userId: user.userId,
        lessonId,
        status: LessonStatus.IN_PROGRESS,
      },
      update: {
        status: LessonStatus.IN_PROGRESS,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'progress.start',
        targetType: 'Lesson',
        targetId: lessonId,
        metadata: { lessonTitle: lesson.title },
      },
    });

    return progress;
  }

  /**
   * Mark a lesson COMPLETED. Sets completedAt.
   * Checks for path completion → Certificate.
   * Awards first-lesson Badge if applicable.
   */
  async completeLesson(
    lessonId: string,
    user: SessionPayload,
    score?: number,
  ): Promise<{
    progress: { id: string; status: LessonStatus; completedAt: Date | null };
    certificateCreated: boolean;
    badgeAwarded: boolean;
  }> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { learningPath: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const orgOk =
      lesson.learningPath.organizationId === user.organizationId ||
      lesson.learningPath.organizationId === null;
    if (!orgOk) throw new NotFoundException('Lesson not found');

    await this.assertAssigned(user, lessonId, lesson.learningPathId);

    const now = new Date();

    // Snapshot prior state so we can decide whether this completion is the
    // user's *first* ever pass on this specific lesson — re-completing the
    // same lesson is a no-op for XP purposes (the @@unique on XpEvent makes
    // it idempotent anyway, but we want to surface the LESSON_FIRST_TIME
    // bonus only on the very first global completion across all lessons).
    const priorProgress = await this.prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
      select: { status: true },
    });
    const wasAlreadyCompleted = priorProgress?.status === LessonStatus.COMPLETED;

    const priorCompletedCount = await this.prisma.userProgress.count({
      where: { userId: user.userId, status: LessonStatus.COMPLETED },
    });
    const isFirstEverLesson = !wasAlreadyCompleted && priorCompletedCount === 0;

    const progress = await this.prisma.userProgress.upsert({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
      create: {
        userId: user.userId,
        lessonId,
        status: LessonStatus.COMPLETED,
        completedAt: now,
        ...(score !== undefined && { score }),
      },
      update: {
        status: LessonStatus.COMPLETED,
        completedAt: now,
        ...(score !== undefined && { score }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'progress.complete',
        targetType: 'Lesson',
        targetId: lessonId,
        metadata: { lessonTitle: lesson.title, score },
      },
    });

    // Fire-and-forget analytics — must never throw into the caller.
    track.lessonCompleted({
      organizationId: user.organizationId,
      userId: user.userId,
      lessonId,
      pathId: lesson.learningPathId,
      firstTime: !wasAlreadyCompleted,
    });

    // Check if this is the user's first ever completed lesson → award badge
    const badgeAwarded = await this.maybeAwardFirstLessonBadge(user);

    // Award XP for the lesson completion. Idempotent — re-completing the
    // same lesson hits the @@unique([userId, kind, sourceId]) and returns 0.
    if (!wasAlreadyCompleted) {
      await this.gameService.awardXp({
        userId: user.userId,
        organizationId: user.organizationId,
        kind: 'LESSON_COMPLETED',
        sourceType: 'Lesson',
        sourceId: lessonId,
      });
      if (isFirstEverLesson) {
        await this.gameService.awardXp({
          userId: user.userId,
          organizationId: user.organizationId,
          kind: 'LESSON_FIRST_TIME',
          sourceType: 'Lesson',
          // sourceId pinned to user — there is exactly one "first lesson"
          // ever per user, so this is naturally idempotent.
          sourceId: user.userId,
        });
      }
      await this.gameService.incrementQuestProgress(user.userId, 'lesson', 1);
    }

    // Check if all lessons in the path are now complete
    const certificateCreated = await this.maybeCreateCertificate(lesson.learningPathId, user);

    if (certificateCreated) {
      await this.gameService.awardXp({
        userId: user.userId,
        organizationId: user.organizationId,
        kind: 'PATH_COMPLETED',
        sourceType: 'LearningPath',
        sourceId: lesson.learningPathId,
      });
    }

    return {
      progress: {
        id: progress.id,
        status: progress.status,
        completedAt: progress.completedAt,
      },
      certificateCreated,
      badgeAwarded,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async maybeAwardFirstLessonBadge(user: SessionPayload): Promise<boolean> {
    const completedCount = await this.prisma.userProgress.count({
      where: { userId: user.userId, status: LessonStatus.COMPLETED },
    });

    // completedCount is already incremented by the upsert above
    if (completedCount !== 1) return false;

    try {
      await this.prisma.badge.create({
        data: {
          userId: user.userId,
          slug: FIRST_LESSON_BADGE_SLUG,
          label: 'First Lesson Completed',
        },
      });
      return true;
    } catch {
      // Unique constraint violation — badge already exists; swallow silently
      return false;
    }
  }

  private async maybeCreateCertificate(
    learningPathId: string,
    user: SessionPayload,
  ): Promise<boolean> {
    // Get all lessons in the path
    const allLessons = await this.prisma.lesson.findMany({
      where: { learningPathId },
      select: { id: true },
    });

    if (allLessons.length === 0) return false;

    const lessonIds = allLessons.map((l) => l.id);

    const completedCount = await this.prisma.userProgress.count({
      where: {
        userId: user.userId,
        lessonId: { in: lessonIds },
        status: LessonStatus.COMPLETED,
      },
    });

    if (completedCount < allLessons.length) return false;

    // All lessons completed — create Certificate row (idempotent via unique constraint).
    // Use the keyed HMAC so the public verification endpoint can prove provenance.
    const issuedAt = new Date();
    const signedHash = signCertificate({ userId: user.userId, learningPathId, issuedAt });

    try {
      await this.prisma.certificate.create({
        data: {
          userId: user.userId,
          learningPathId,
          signedHash,
          issuedAt,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action: 'progress.path_complete',
          targetType: 'LearningPath',
          targetId: learningPathId,
          metadata: { totalLessons: allLessons.length },
        },
      });

      // Fire-and-forget analytics capture.
      captureEvent('path_completed', {
        organizationId: user.organizationId,
        userId: user.userId,
        pathId: learningPathId,
        totalLessons: allLessons.length,
      });

      return true;
    } catch {
      // Unique constraint violation — certificate already exists
      return false;
    }
  }

  /** Exposed for QuizzesService to call on a passing attempt */
  async completeLessonFromQuiz(lessonId: string, user: SessionPayload, score: number) {
    if (score < PASS_THRESHOLD) return;

    // SEV-7 defense in depth: the assignment gate also lives inside
    // completeLesson, but enforcing here means an unassigned user who passes a
    // quiz on a path they were never assigned to gets a clean 403 from this
    // entry point too (and an explicit audit row), rather than relying solely
    // on the inner call.
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { learningPathId: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertAssigned(user, lessonId, lesson.learningPathId);

    await this.completeLesson(lessonId, user, score);
  }
}
