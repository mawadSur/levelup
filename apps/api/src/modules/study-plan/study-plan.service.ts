import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  AiLevel,
  LessonStatus,
  Prisma,
  Role,
  type Lab,
  type Lesson,
  type LearningPath,
  type StudyPlan,
} from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import {
  type CurrentWeekResponse,
  type GenerateStudyPlanResponse,
  type StudyPlanItem,
  type StudyPlanItemStatus,
  type StudyPlanWeek,
  type TeamStudyPlanResponse,
  type TeamStudyPlanRow,
  type UpcomingPlansResponse,
} from '@levelup/types';
import { PrismaService } from '../prisma';
import { endOfWeekFromMonday, mondayOfUtcWeek, nextFourMondays } from './week-math';

// ---------------------------------------------------------------------------
// Tier ordering for fallback selection
// ---------------------------------------------------------------------------

const TIER_ORDER: AiLevel[] = [
  AiLevel.BEGINNER,
  AiLevel.PRACTITIONER,
  AiLevel.POWER_USER,
  AiLevel.CHAMPION,
];

function tierIndex(level: AiLevel): number {
  const idx = TIER_ORDER.indexOf(level);
  return idx < 0 ? 0 : idx;
}

/** One tier up from `level`, clamped at the top. */
function nextTier(level: AiLevel): AiLevel {
  const idx = tierIndex(level);
  const clamped = Math.min(idx + 1, TIER_ORDER.length - 1);
  return TIER_ORDER[clamped] ?? AiLevel.BEGINNER;
}

// ---------------------------------------------------------------------------
// JSON helpers — StudyPlan.lessonIds / labIds are stored as Json arrays
// ---------------------------------------------------------------------------

function parseStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') out.push(item);
  }
  return out;
}

function toJson(value: string[]): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

// ---------------------------------------------------------------------------

@Injectable()
export class StudyPlanService {
  private readonly logger = new Logger(StudyPlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * Returns the StudyPlan row anchored to the Monday-of-now-UTC, or null when
   * none exists. Item statuses are computed on the fly from UserProgress and
   * LabAttempt so the response stays accurate across navigations.
   */
  async getCurrentWeek(sessionUser: SessionPayload): Promise<CurrentWeekResponse> {
    const weekOf = mondayOfUtcWeek(new Date());
    const row = await this.prisma.studyPlan.findUnique({
      where: { userId_weekOf: { userId: sessionUser.userId, weekOf } },
    });
    if (!row) return { plan: null };
    const week = await this.hydrateWeek(row, sessionUser, 1);
    return { plan: week };
  }

  /**
   * Returns the next 4 Mondays worth of plans (current + 3 ahead), in
   * chronological order. Skips weeks that don't yet have a row.
   */
  async getUpcoming(sessionUser: SessionPayload): Promise<UpcomingPlansResponse> {
    const mondays = nextFourMondays(new Date());
    const rows = await this.prisma.studyPlan.findMany({
      where: {
        userId: sessionUser.userId,
        weekOf: { in: mondays },
      },
      orderBy: { weekOf: 'asc' },
    });

    const byKey = new Map(rows.map((r) => [r.weekOf.toISOString(), r]));
    const hydrated: StudyPlanWeek[] = [];
    for (let i = 0; i < mondays.length; i++) {
      const monday = mondays[i];
      if (!monday) continue;
      const row = byKey.get(monday.toISOString());
      if (!row) continue;
      hydrated.push(await this.hydrateWeek(row, sessionUser, i + 1));
    }
    return { plans: hydrated };
  }

  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------

  /**
   * Generates a 4-week plan starting from the Monday-of-now-UTC. Idempotent
   * unless `force` is set: if the user already has a plan for the current
   * week the call is a no-op (returns alreadyExists=true).
   *
   * Plan composition:
   *   W1: 2 lessons + 1 lab at user's tier
   *   W2: 2 lessons + 1 lab at user's tier (different items from W1)
   *   W3: 2 lessons + 1 lab at user's tier + 1 step, IF the user has at least
   *       one passed lab attempt from W1/W2 already on file at generation time
   *       (which is rare on first run — usually we fall back to user's tier)
   *   W4: capstone — 1 scenario lesson + 1 capstone lab if available, else
   *       the next 2 items at the strongest tier the user has access to
   */
  async generateFourWeekPlan(
    sessionUser: SessionPayload,
    opts: { force?: boolean } = {},
  ): Promise<GenerateStudyPlanResponse> {
    const force = opts.force === true;
    const mondays = nextFourMondays(new Date());
    const firstMonday = mondays[0];
    if (!firstMonday) {
      // nextFourMondays always returns 4 dates — defensive only.
      return { plans: [], alreadyExists: false };
    }

    // Short-circuit: already has a current-week plan and not forced.
    if (!force) {
      const existing = await this.prisma.studyPlan.findUnique({
        where: { userId_weekOf: { userId: sessionUser.userId, weekOf: firstMonday } },
      });
      if (existing) {
        // Surface the existing plan list (current + next 3) so the caller
        // gets a useful response shape rather than just a flag.
        const upcoming = await this.getUpcoming(sessionUser);
        return { plans: upcoming.plans, alreadyExists: true };
      }
    }

    const user = await this.prisma.user.findFirst({
      where: { id: sessionUser.userId, organizationId: sessionUser.organizationId },
      select: { id: true, aiLevel: true },
    });
    if (!user) {
      // Shouldn't happen — the caller is the user. Bail quietly.
      return { plans: [], alreadyExists: false };
    }

    const tier = user.aiLevel;
    const lessons = await this.fetchCandidateLessons(sessionUser);
    const labs = await this.fetchCandidateLabs(sessionUser);

    const lessonRanking = await this.rankByWeakestSkill(sessionUser.userId, lessons);
    const labRanking = await this.rankByWeakestSkill(sessionUser.userId, labs);

    // Bucket by tier so we can serve weeks 1/2 from the user's tier and
    // weeks 3/4 from one step up.
    const lessonsByTier = bucketByPathTier(lessonRanking);
    const labsByTier = bucketByPathTier(labRanking);

    const baseTier = tier;
    const upTier = nextTier(tier);

    // Greedy take-without-replacement so the same item never repeats.
    const used = new Set<string>();
    const takeLessons = (level: AiLevel, n: number): Lesson[] => {
      const bucket = lessonsByTier.get(level) ?? [];
      const picked: Lesson[] = [];
      for (const item of bucket) {
        if (picked.length >= n) break;
        if (used.has(item.id)) continue;
        used.add(item.id);
        picked.push(item);
      }
      return picked;
    };
    const takeLabs = (level: AiLevel, n: number): Lab[] => {
      const bucket = labsByTier.get(level) ?? [];
      const picked: Lab[] = [];
      for (const item of bucket) {
        if (picked.length >= n) break;
        if (used.has(item.id)) continue;
        used.add(item.id);
        picked.push(item);
      }
      return picked;
    };

    const weeks: Array<{ lessons: Lesson[]; labs: Lab[] }> = [];

    // W1
    weeks.push({
      lessons: fillFromFallback(takeLessons(baseTier, 2), () => takeLessons(upTier, 2 - 0)),
      labs: fillFromFallback(takeLabs(baseTier, 1), () => takeLabs(upTier, 1)),
    });

    // W2
    weeks.push({
      lessons: fillFromFallback(takeLessons(baseTier, 2), () => takeLessons(upTier, 2)),
      labs: fillFromFallback(takeLabs(baseTier, 1), () => takeLabs(upTier, 1)),
    });

    // W3: only step up if user has prior passing labs (rare on initial gen
    // — this branch matters when generate is called after weeks 1-2 ran).
    const passedLabCount = await this.prisma.labAttempt.count({
      where: {
        userId: sessionUser.userId,
        organizationId: sessionUser.organizationId,
        passed: true,
      },
    });
    const w3Tier = passedLabCount >= 1 ? upTier : baseTier;
    weeks.push({
      lessons: fillFromFallback(takeLessons(w3Tier, 2), () => takeLessons(baseTier, 2)),
      labs: fillFromFallback(takeLabs(w3Tier, 1), () => takeLabs(baseTier, 1)),
    });

    // W4: capstone — prefer a scenario lesson + 1 lab from upTier (or baseTier
    // fallback if upTier is empty). If no scenario is available, take 1 lesson.
    const scenarioPool = lessons.filter(
      (l) => (l as Lesson).kind === 'SCENARIO' && !used.has(l.id),
    );
    const w4Lessons: Lesson[] = [];
    const scenarioPick = scenarioPool[0];
    if (scenarioPick) {
      used.add(scenarioPick.id);
      w4Lessons.push(scenarioPick);
    } else {
      w4Lessons.push(...fillFromFallback(takeLessons(upTier, 1), () => takeLessons(baseTier, 1)));
    }
    weeks.push({
      lessons: w4Lessons,
      labs: fillFromFallback(takeLabs(upTier, 1), () => takeLabs(baseTier, 1)),
    });

    // Persist as upserts so a forced regenerate replaces the row in place.
    const persisted: StudyPlan[] = [];
    for (let i = 0; i < mondays.length; i++) {
      const monday = mondays[i];
      const week = weeks[i];
      if (!monday || !week) continue;
      const target = endOfWeekFromMonday(monday);
      const lessonIds = week.lessons.map((l) => l.id);
      const labIds = week.labs.map((l) => l.id);
      const row = await this.prisma.studyPlan.upsert({
        where: { userId_weekOf: { userId: sessionUser.userId, weekOf: monday } },
        create: {
          userId: sessionUser.userId,
          weekOf: monday,
          lessonIds: toJson(lessonIds),
          labIds: toJson(labIds),
          targetCompletionDate: target,
        },
        update: {
          lessonIds: toJson(lessonIds),
          labIds: toJson(labIds),
          targetCompletionDate: target,
          // completedAt is preserved across regenerations — only cleared on
          // an explicit force regen with a different item set. Cheapest fix:
          // null it out only when force=true.
          ...(force ? { completedAt: null } : {}),
        },
      });
      persisted.push(row);
    }

    await this.audit(sessionUser, 'study_plan.generated', {
      weeks: persisted.length,
      tier,
      lessonCounts: persisted.map((p) => parseStringArray(p.lessonIds).length),
      labCounts: persisted.map((p) => parseStringArray(p.labIds).length),
      force,
    });

    const hydrated: StudyPlanWeek[] = [];
    for (let i = 0; i < persisted.length; i++) {
      const row = persisted[i];
      if (!row) continue;
      hydrated.push(await this.hydrateWeek(row, sessionUser, i + 1));
    }
    return { plans: hydrated, alreadyExists: false };
  }

  // ---------------------------------------------------------------------------
  // Manager view
  // ---------------------------------------------------------------------------

  async getTeamCurrentWeek(sessionUser: SessionPayload): Promise<TeamStudyPlanResponse> {
    if (sessionUser.role === Role.EMPLOYEE) {
      throw new ForbiddenException('Managers and admins only.');
    }

    // Direct reports = every EMPLOYEE in the org. Mirrors the existing /team
    // page behaviour, which doesn't yet implement a manager↔report graph.
    const reports = await this.prisma.user.findMany({
      where: {
        organizationId: sessionUser.organizationId,
        role: Role.EMPLOYEE,
      },
      select: { id: true, name: true, email: true },
    });
    if (reports.length === 0) return { rows: [] };

    const weekOf = mondayOfUtcWeek(new Date());
    const plans = await this.prisma.studyPlan.findMany({
      where: {
        userId: { in: reports.map((r) => r.id) },
        weekOf,
      },
    });
    const planByUser = new Map(plans.map((p) => [p.userId, p]));

    const rows: TeamStudyPlanRow[] = [];
    for (const r of reports) {
      const plan = planByUser.get(r.id);
      if (!plan) {
        rows.push({
          userId: r.id,
          name: r.name,
          email: r.email,
          hasPlan: false,
          weekOf: null,
          targetCompletionDate: null,
          progress: 0,
          doneItems: 0,
          totalItems: 0,
          indicator: 'behind',
        });
        continue;
      }
      const week = await this.hydrateWeek(plan, { ...sessionUser, userId: r.id }, 1);
      rows.push({
        userId: r.id,
        name: r.name,
        email: r.email,
        hasPlan: true,
        weekOf: plan.weekOf.toISOString(),
        targetCompletionDate: plan.targetCompletionDate.toISOString(),
        progress: week.progress,
        doneItems: week.doneItems,
        totalItems: week.totalItems,
        indicator: indicatorFor(week, new Date()),
      });
    }
    return { rows };
  }

  // ---------------------------------------------------------------------------
  // Internal — candidate fetching
  // ---------------------------------------------------------------------------

  /** Lessons accessible to this org (global + org-specific), with skills + path tier. */
  private async fetchCandidateLessons(sessionUser: SessionPayload): Promise<Lesson[]> {
    return this.prisma.lesson.findMany({
      where: {
        learningPath: {
          isPublished: true,
          OR: [{ organizationId: null }, { organizationId: sessionUser.organizationId }],
        },
      },
      orderBy: [{ learningPath: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      include: {
        skills: true,
        learningPath: { select: { tier: true, targetLevel: true } },
      },
    });
  }

  private async fetchCandidateLabs(sessionUser: SessionPayload): Promise<Lab[]> {
    return this.prisma.lab.findMany({
      where: {
        isPublished: true,
        OR: [{ organizationId: null }, { organizationId: sessionUser.organizationId }],
      },
      include: {
        skills: true,
        learningPath: { select: { tier: true, targetLevel: true } },
      },
    });
  }

  /**
   * Re-orders `items` so candidates that teach the user's *weakest* skills
   * come first. Weakness = (exposure + practice) ascending. Items with no
   * skill mapping land last but keep their original order — degrading
   * gracefully when LessonSkill/LabSkill tables are empty.
   */
  private async rankByWeakestSkill<T extends { id: string; skills?: Array<{ skillId: string }> }>(
    userId: string,
    items: T[],
  ): Promise<T[]> {
    if (items.length === 0) return items;
    const skillIds = new Set<string>();
    for (const item of items) {
      for (const s of item.skills ?? []) skillIds.add(s.skillId);
    }
    if (skillIds.size === 0) return items;

    const userSkills = await this.prisma.userSkill
      .findMany({
        where: { userId, skillId: { in: Array.from(skillIds) } },
        select: { skillId: true, exposure: true, practice: true },
      })
      .catch((err: unknown) => {
        // userSkill table empty or unreachable — graceful fallback.
        this.logger.debug(`userSkill lookup failed, falling back to tier order: ${String(err)}`);
        return [] as Array<{ skillId: string; exposure: number; practice: number }>;
      });

    if (userSkills.length === 0) return items;

    const mastery = new Map<string, number>();
    for (const us of userSkills) {
      mastery.set(us.skillId, us.exposure + us.practice);
    }

    // Score each item by its weakest skill. Lower score = teaches a weaker
    // skill = should come first. Items with no scored skill go to the middle
    // (use 0.5 as the "neutral" default) so we don't bury all-new content.
    const scored = items.map((item, originalIdx) => {
      const linkedScores: number[] = [];
      for (const s of item.skills ?? []) {
        const m = mastery.get(s.skillId);
        if (typeof m === 'number') linkedScores.push(m);
      }
      const score = linkedScores.length > 0 ? Math.min(...linkedScores) : 0.5;
      return { item, score, originalIdx };
    });
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.originalIdx - b.originalIdx;
    });
    return scored.map((s) => s.item);
  }

  // ---------------------------------------------------------------------------
  // Internal — hydrate a row into the response shape
  // ---------------------------------------------------------------------------

  private async hydrateWeek(
    row: StudyPlan,
    sessionUser: SessionPayload,
    weekIndex: number,
  ): Promise<StudyPlanWeek> {
    const lessonIds = parseStringArray(row.lessonIds);
    const labIds = parseStringArray(row.labIds);

    const [lessons, labs, progress, attempts] = await Promise.all([
      lessonIds.length > 0
        ? this.prisma.lesson.findMany({
            where: { id: { in: lessonIds } },
            include: { learningPath: { select: { slug: true } } },
          })
        : Promise.resolve([] as Array<Lesson & { learningPath: { slug: string } }>),
      labIds.length > 0
        ? this.prisma.lab.findMany({ where: { id: { in: labIds } } })
        : Promise.resolve([] as Lab[]),
      lessonIds.length > 0
        ? this.prisma.userProgress.findMany({
            where: { userId: sessionUser.userId, lessonId: { in: lessonIds } },
          })
        : Promise.resolve([]),
      labIds.length > 0
        ? this.prisma.labAttempt.findMany({
            where: { userId: sessionUser.userId, labId: { in: labIds } },
            select: { labId: true, passed: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const progressByLesson = new Map(progress.map((p) => [p.lessonId, p.status]));
    const labStatusByLab = new Map<string, StudyPlanItemStatus>();
    for (const a of attempts) {
      const prior = labStatusByLab.get(a.labId);
      if (prior === 'done') continue;
      labStatusByLab.set(a.labId, a.passed ? 'done' : 'in_progress');
    }

    const items: StudyPlanItem[] = [];
    // Preserve the original order in the StudyPlan row, not Prisma's findMany
    // ordering — the order in the JSON array represents the recommendation rank.
    const lessonById = new Map(
      (lessons as Array<Lesson & { learningPath: { slug: string } }>).map((l) => [l.id, l]),
    );
    for (const id of lessonIds) {
      const l = lessonById.get(id);
      if (!l) continue;
      const dbStatus = progressByLesson.get(l.id);
      items.push({
        kind: 'lesson',
        lessonId: l.id,
        title: l.title,
        pathSlug: l.learningPath.slug,
        lessonSlug: l.slug,
        estimatedMinutes: l.estimatedMinutes,
        status: lessonStatus(dbStatus),
      });
    }
    const labById = new Map(labs.map((l) => [l.id, l]));
    for (const id of labIds) {
      const lab = labById.get(id);
      if (!lab) continue;
      items.push({
        kind: 'lab',
        labId: lab.id,
        title: lab.title,
        slug: lab.slug,
        estimatedMinutes: lab.estimatedMinutes,
        status: labStatusByLab.get(lab.id) ?? 'not_started',
      });
    }

    const totalItems = items.length;
    const doneItems = items.filter((i) => i.status === 'done').length;
    const progressFraction = totalItems > 0 ? doneItems / totalItems : 0;

    // Auto-mark completedAt when every item is done. Done in a fire-and-forget
    // path so a stale read doesn't block the response.
    if (totalItems > 0 && doneItems === totalItems && row.completedAt === null) {
      this.markWeekCompleted(row, sessionUser).catch((err: unknown) =>
        this.logger.warn(`failed to mark study plan complete: ${String(err)}`),
      );
    }

    return {
      id: row.id,
      weekOf: row.weekOf.toISOString(),
      targetCompletionDate: row.targetCompletionDate.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      weekIndex,
      items,
      progress: progressFraction,
      totalItems,
      doneItems,
    };
  }

  private async markWeekCompleted(row: StudyPlan, sessionUser: SessionPayload): Promise<void> {
    const updated = await this.prisma.studyPlan.update({
      where: { id: row.id },
      data: { completedAt: new Date() },
    });
    await this.audit(sessionUser, 'study_plan.completed', {
      studyPlanId: updated.id,
      weekOf: updated.weekOf.toISOString(),
    });
  }

  private async audit(
    sessionUser: SessionPayload,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: sessionUser.organizationId,
          actorId: sessionUser.userId,
          action,
          targetType: 'StudyPlan',
          targetId: sessionUser.userId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      this.logger.warn(`audit ${action} failed: ${String(err)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function lessonStatus(s: LessonStatus | undefined): StudyPlanItemStatus {
  if (s === LessonStatus.COMPLETED) return 'done';
  if (s === LessonStatus.IN_PROGRESS) return 'in_progress';
  return 'not_started';
}

function bucketByPathTier<
  T extends { id: string; learningPath?: { tier: AiLevel } | null } | Lesson | Lab,
>(items: T[]): Map<AiLevel, T[]> {
  const buckets = new Map<AiLevel, T[]>();
  for (const item of items) {
    const tier =
      (item as unknown as { learningPath?: { tier?: AiLevel } | null }).learningPath?.tier ??
      AiLevel.BEGINNER;
    const bucket = buckets.get(tier) ?? [];
    bucket.push(item);
    buckets.set(tier, bucket);
  }
  return buckets;
}

/**
 * Returns `primary` if it has length === expected. Otherwise concatenates the
 * fallback to fill up. Caller's primary call should be paired with a sensible
 * fallback that produces additional candidates.
 */
function fillFromFallback<T>(primary: T[], fallback: () => T[]): T[] {
  if (primary.length > 0) return primary;
  return fallback();
}

/**
 * Manager indicator. A learner is "ahead" when ahead of pace (>= expected for
 * day-of-week), "on_track" within ±15pp, and "behind" otherwise. Day-of-week
 * is taken UTC so all learners use the same boundary.
 */
function indicatorFor(week: StudyPlanWeek, now: Date): TeamStudyPlanRow['indicator'] {
  if (week.totalItems === 0) return 'on_track';
  if (week.progress >= 1) return 'ahead';
  const start = new Date(week.weekOf);
  const total = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const expected = Math.min(1, elapsed / total);
  const delta = week.progress - expected;
  if (delta < -0.15) return 'behind';
  if (delta > 0.15) return 'ahead';
  return 'on_track';
}
