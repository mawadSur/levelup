/**
 * ReportingService — T2.14
 *
 * All data-access methods are scoped to the caller's organizationId.
 *
 * In-memory cache strategy:
 *   - A plain Map keyed by `${orgId}:${md5-of-filters}` stores results with a
 *     60-second TTL.
 *   - This is a **per-process** cache. In a multi-instance deployment, each
 *     replica will cache independently; consider Redis for distributed caching.
 *   - The cache is used for the `/completion` and `/skills/heatmap` endpoints
 *     which involve heavier GROUP BY queries.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma';
import type { SessionPayload } from '@levelup/auth-client';
import { AiLevel, LessonStatus } from '@levelup/db';
import type { CompletionFiltersDto, AggregateJobDto } from './dto/report-filters.dto';
import { enqueueReportAggregate } from '@levelup/queue';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Cache types
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 s

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface DepartmentCompletionRow {
  departmentId: string;
  departmentName: string;
  assigned: number;
  completed: number;
  completionRate: number;
}

export interface PathCompletionRow {
  pathId: string;
  pathTitle: string;
  assigned: number;
  completed: number;
  completionRate: number;
}

export interface UserCompletionRow {
  userId: string;
  name: string;
  role: string;
  departmentName?: string;
  completed: number;
  total: number;
  completionRate: number;
}

export interface CompletionReport {
  overall: {
    assigned: number;
    started: number;
    completed: number;
    completionRate: number;
  };
  byDepartment: DepartmentCompletionRow[];
  byPath: PathCompletionRow[];
  byUser: UserCompletionRow[];
  truncated?: true;
}

export interface HeatmapReport {
  departments: string[];
  levels: AiLevel[];
  cells: number[][];
  totals: { byDepartment: number[]; byLevel: number[] };
}

export interface RiskFlag {
  userId: string;
  name: string;
  departmentName?: string;
  role: string;
  severity: 'low' | 'med' | 'high';
  reason: string;
}

export interface RiskFlagsReport {
  flags: RiskFlag[];
}

export interface AggregateJobResult {
  jobId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cacheKey(orgId: string, filters: object): string {
  const hash = createHash('md5').update(JSON.stringify(filters)).digest('hex');
  return `${orgId}:${hash}`;
}

function rate(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  // Per-process in-memory caches (separate maps for different report types)
  private readonly completionCache = new Map<string, CacheEntry<CompletionReport>>();
  private readonly heatmapCache = new Map<string, CacheEntry<HeatmapReport>>();

  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // GET /reports/completion
  // --------------------------------------------------------------------------

  async getCompletionReport(
    user: SessionPayload,
    filters: CompletionFiltersDto,
  ): Promise<CompletionReport> {
    const key = cacheKey(user.organizationId, filters);
    const cached = this.completionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.computeCompletionReport(user.organizationId, filters);
    this.completionCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  private async computeCompletionReport(
    orgId: string,
    filters: CompletionFiltersDto,
  ): Promise<CompletionReport> {
    const MAX_USERS = 500;

    // Base where clause for users in this org (+ optional dept filter)
    const userWhere = {
      organizationId: orgId,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    };

    // All users in scope
    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
      take: MAX_USERS + 1, // fetch one extra to detect truncation
    });

    const truncated = users.length > MAX_USERS;
    const scopedUsers = truncated ? users.slice(0, MAX_USERS) : users;
    const userIds = scopedUsers.map((u) => u.id);

    // Assignment query — optionally scoped to a path
    const assignmentWhere = {
      userId: { in: userIds },
      ...(filters.pathId ? { learningPathId: filters.pathId } : {}),
      ...(filters.from || filters.to
        ? {
            assignedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const assignments = await this.prisma.learningPathAssignment.findMany({
      where: assignmentWhere,
      select: {
        userId: true,
        learningPathId: true,
        learningPath: { select: { id: true, title: true, lessons: { select: { id: true } } } },
      },
    });

    // Progress rows for all lessons in scope
    const allLessonIds = [
      ...new Set(assignments.flatMap((a) => a.learningPath.lessons.map((l) => l.id))),
    ];

    const progressRows = await this.prisma.userProgress.findMany({
      where: {
        userId: { in: userIds },
        lessonId: { in: allLessonIds },
        status: LessonStatus.COMPLETED,
      },
      select: { userId: true, lessonId: true },
    });

    // Build completion set: Set<`${userId}:${lessonId}`>
    const completedSet = new Set(progressRows.map((p) => `${p.userId}:${p.lessonId}`));

    // In-progress indicator: users who have started but not completed a path
    const inProgressUsers = new Set(
      (
        await this.prisma.userProgress.findMany({
          where: {
            userId: { in: userIds },
            status: LessonStatus.IN_PROGRESS,
          },
          select: { userId: true },
          distinct: ['userId'],
        })
      ).map((p) => p.userId),
    );

    // --- Overall counts ---
    let overallAssigned = 0;
    let overallCompleted = 0;

    // Per-path accumulators
    const pathMap = new Map<
      string,
      { title: string; assigned: Set<string>; completed: Set<string>; lessonIds: string[] }
    >();

    // Per-department accumulators
    const deptMap = new Map<
      string,
      { name: string; assigned: Set<string>; completed: Set<string> }
    >();

    // Per-user accumulators (total lessons across all assigned paths, completed)
    const userTotals = new Map<string, { total: number; completed: number }>();

    const userDeptMap = new Map(scopedUsers.map((u) => [u.id, u.department?.name ?? undefined]));
    const userRoleMap = new Map(scopedUsers.map((u) => [u.id, u.role as string]));
    const userNameMap = new Map(scopedUsers.map((u) => [u.id, u.name]));

    for (const a of assignments) {
      const pathId = a.learningPath.id;
      const lessonIds = a.learningPath.lessons.map((l) => l.id);
      const userId = a.userId;

      if (!pathMap.has(pathId)) {
        pathMap.set(pathId, {
          title: a.learningPath.title,
          assigned: new Set(),
          completed: new Set(),
          lessonIds,
        });
      }
      const pm = pathMap.get(pathId)!;
      pm.assigned.add(userId);

      // A user "completed" a path if all its lessons are COMPLETED
      const allDone = lessonIds.every((lid) => completedSet.has(`${userId}:${lid}`));
      if (allDone && lessonIds.length > 0) {
        pm.completed.add(userId);
        overallCompleted++;
      }
      overallAssigned++;

      // Dept
      const deptName = userDeptMap.get(userId);
      if (deptName) {
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, { name: deptName, assigned: new Set(), completed: new Set() });
        }
        const dm = deptMap.get(deptName)!;
        dm.assigned.add(userId);
        if (allDone && lessonIds.length > 0) dm.completed.add(userId);
      }

      // User totals
      const prev = userTotals.get(userId) ?? { total: 0, completed: 0 };
      const completedForPath = lessonIds.filter((lid) =>
        completedSet.has(`${userId}:${lid}`),
      ).length;
      userTotals.set(userId, {
        total: prev.total + lessonIds.length,
        completed: prev.completed + completedForPath,
      });
    }

    // Build unique started-users count (has at least one IN_PROGRESS or COMPLETED lesson)
    const startedUserIds = new Set([...progressRows.map((p) => p.userId), ...inProgressUsers]);

    const byDepartment: DepartmentCompletionRow[] = [...deptMap.entries()].map(([, d]) => ({
      departmentId: '', // dept names used as keys; id not tracked here
      departmentName: d.name,
      assigned: d.assigned.size,
      completed: d.completed.size,
      completionRate: rate(d.completed.size, d.assigned.size),
    }));

    // Fetch dept IDs for the department rows
    const deptNamesList = [...deptMap.keys()];
    if (deptNamesList.length > 0) {
      const depts = await this.prisma.department.findMany({
        where: { organizationId: orgId, name: { in: deptNamesList } },
        select: { id: true, name: true },
      });
      const deptIdMap = new Map(depts.map((d) => [d.name, d.id]));
      for (const row of byDepartment) {
        row.departmentId = deptIdMap.get(row.departmentName) ?? '';
      }
    }

    const byPath: PathCompletionRow[] = [...pathMap.entries()].map(([pathId, p]) => ({
      pathId,
      pathTitle: p.title,
      assigned: p.assigned.size,
      completed: p.completed.size,
      completionRate: rate(p.completed.size, p.assigned.size),
    }));

    const byUser: UserCompletionRow[] = [];
    for (const [userId, totals] of userTotals.entries()) {
      byUser.push({
        userId,
        name: userNameMap.get(userId) ?? userId,
        role: userRoleMap.get(userId) ?? 'EMPLOYEE',
        departmentName: userDeptMap.get(userId),
        completed: totals.completed,
        total: totals.total,
        completionRate: rate(totals.completed, totals.total),
      });
    }

    const report: CompletionReport = {
      overall: {
        assigned: overallAssigned,
        started: startedUserIds.size,
        completed: overallCompleted,
        completionRate: rate(overallCompleted, overallAssigned),
      },
      byDepartment,
      byPath,
      byUser,
    };

    if (truncated) {
      report.truncated = true;
    }

    return report;
  }

  // --------------------------------------------------------------------------
  // GET /reports/skills/heatmap
  // --------------------------------------------------------------------------

  async getSkillsHeatmap(user: SessionPayload): Promise<HeatmapReport> {
    const key = cacheKey(user.organizationId, {});
    const cached = this.heatmapCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.computeSkillsHeatmap(user.organizationId);
    this.heatmapCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  private async computeSkillsHeatmap(orgId: string): Promise<HeatmapReport> {
    const ORDERED_LEVELS: AiLevel[] = [
      AiLevel.BEGINNER,
      AiLevel.PRACTITIONER,
      AiLevel.POWER_USER,
      AiLevel.CHAMPION,
    ];

    // Group users by (departmentId, aiLevel)
    const grouped = await this.prisma.user.groupBy({
      by: ['departmentId', 'aiLevel'],
      where: { organizationId: orgId, departmentId: { not: null } },
      _count: { _all: true },
    });

    // Also fetch users without a department for a generic "(No Dept)" row
    const noDeptGrouped = await this.prisma.user.groupBy({
      by: ['aiLevel'],
      where: { organizationId: orgId, departmentId: null },
      _count: { _all: true },
    });

    // Gather all dept IDs
    const deptIds = [
      ...new Set(grouped.map((r) => r.departmentId).filter((id): id is string => id !== null)),
    ];

    const departments = await this.prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const deptNames = departments.map((d) => d.name);
    const deptIndexMap = new Map(departments.map((d, i) => [d.id, i]));

    const hasNoDept = noDeptGrouped.length > 0;
    if (hasNoDept) deptNames.push('(No Department)');

    // Build matrix[dept][level]
    const cells: number[][] = Array.from({ length: deptNames.length }, () =>
      new Array<number>(ORDERED_LEVELS.length).fill(0),
    );

    for (const row of grouped) {
      const deptIdx = row.departmentId ? deptIndexMap.get(row.departmentId) : undefined;
      if (deptIdx === undefined) continue;
      const levelIdx = ORDERED_LEVELS.indexOf(row.aiLevel);
      if (levelIdx === -1) continue;
      cells[deptIdx]![levelIdx] = row._count._all;
    }

    if (hasNoDept) {
      const noDeptIdx = deptNames.length - 1;
      for (const row of noDeptGrouped) {
        const levelIdx = ORDERED_LEVELS.indexOf(row.aiLevel);
        if (levelIdx === -1) continue;
        cells[noDeptIdx]![levelIdx] = row._count._all;
      }
    }

    // Totals
    const byDepartment = cells.map((row) => row.reduce((s, v) => s + v, 0));
    const byLevel = ORDERED_LEVELS.map((_, li) => cells.reduce((s, row) => s + (row[li] ?? 0), 0));

    return {
      departments: deptNames,
      levels: ORDERED_LEVELS,
      cells,
      totals: { byDepartment, byLevel },
    };
  }

  // --------------------------------------------------------------------------
  // GET /reports/risk-flags
  // --------------------------------------------------------------------------

  async getRiskFlags(user: SessionPayload): Promise<RiskFlagsReport> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orgId = user.organizationId;

    const [sensitiveDataUsers, staleAssignments, usersWithAssessments, allOrgUsers] =
      await Promise.all([
        // HIGH: 3+ sensitive-data events in last 30 days
        // We fetch all grouped rows then filter in JS — the row set is bounded
        // by the number of org users × event frequency so this stays small.
        this.prisma.auditLog.groupBy({
          by: ['actorId'],
          where: {
            organizationId: orgId,
            action: 'coach.sensitive_data_detected',
            createdAt: { gte: thirtyDaysAgo },
            actorId: { not: null },
          },
          _count: { _all: true },
        }),

        // MED: assigned 30+ days ago, 0 lessons completed
        this.prisma.learningPathAssignment.findMany({
          where: {
            assignedAt: { lte: thirtyDaysAgo },
            user: { organizationId: orgId },
          },
          select: {
            userId: true,
            learningPathId: true,
            learningPath: { select: { lessons: { select: { id: true } } } },
          },
        }),

        // LOW: never taken baseline assessment (we'll diff against all org users)
        this.prisma.assessment.findMany({
          where: { organizationId: orgId, type: 'BASELINE' },
          select: { userId: true },
          distinct: ['userId'],
        }),

        // Fetch all org users for name/dept lookup
        this.prisma.user.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            name: true,
            role: true,
            department: { select: { name: true } },
          },
        }),
      ]);

    const userMap = new Map(
      allOrgUsers.map((u) => [
        u.id,
        { name: u.name, role: u.role as string, departmentName: u.department?.name },
      ]),
    );

    const flags: RiskFlag[] = [];

    // --- HIGH: filter in JS for >= 3 events ---
    for (const row of sensitiveDataUsers) {
      if (row._count._all < 3) continue;
      const uid = row.actorId;
      if (!uid) continue;
      const meta = userMap.get(uid);
      if (!meta) continue;
      flags.push({
        userId: uid,
        name: meta.name,
        departmentName: meta.departmentName,
        role: meta.role,
        severity: 'high',
        reason: `${row._count._all} sensitive-data events in the last 30 days`,
      });
    }

    const highFlaggedIds = new Set(flags.map((f) => f.userId));

    // --- MED: users with stale assignments and 0 progress ---
    // Collect all progress for these users
    const staleUserIds = [...new Set(staleAssignments.map((a) => a.userId))];

    const staleProgressCounts = await this.prisma.userProgress.groupBy({
      by: ['userId'],
      where: {
        userId: { in: staleUserIds },
        status: LessonStatus.COMPLETED,
      },
      _count: { _all: true },
    });

    const userCompletedCountMap = new Map(
      staleProgressCounts.map((r) => [r.userId, r._count._all]),
    );

    // Check per-assignment: if user has no completed lessons for *any* lesson in the path
    const medFlaggedIds = new Set<string>();

    for (const assignment of staleAssignments) {
      const uid = assignment.userId;
      if (highFlaggedIds.has(uid) || medFlaggedIds.has(uid)) continue;

      const lessonIds = assignment.learningPath.lessons.map((l) => l.id);
      if (lessonIds.length === 0) continue;

      // Check if user has completed 0 lessons across ALL their assignments
      const completedCount = userCompletedCountMap.get(uid) ?? 0;
      if (completedCount === 0) {
        medFlaggedIds.add(uid);
        const meta = userMap.get(uid);
        if (meta) {
          flags.push({
            userId: uid,
            name: meta.name,
            departmentName: meta.departmentName,
            role: meta.role,
            severity: 'med',
            reason: 'Assigned to a path 30+ days ago with 0 lessons completed',
          });
        }
      }
    }

    // --- LOW: never taken baseline assessment ---
    const usersWithBaselineSet = new Set(usersWithAssessments.map((a) => a.userId));

    for (const u of allOrgUsers) {
      if (highFlaggedIds.has(u.id)) continue;
      if (medFlaggedIds.has(u.id)) continue;
      if (usersWithBaselineSet.has(u.id)) continue;

      flags.push({
        userId: u.id,
        name: u.name,
        departmentName: u.department?.name,
        role: u.role as string,
        severity: 'low',
        reason: 'Has never taken the baseline assessment',
      });
    }

    // Sort: high → med → low, cap at 100
    const severityOrder: Record<string, number> = { high: 0, med: 1, low: 2 };
    flags.sort((a, b) => severityOrder[a.severity]! - severityOrder[b.severity]!);

    return { flags: flags.slice(0, 100) };
  }

  // --------------------------------------------------------------------------
  // POST /reports/aggregate
  // --------------------------------------------------------------------------

  async enqueueAggregate(user: SessionPayload, dto: AggregateJobDto): Promise<AggregateJobResult> {
    const job = await enqueueReportAggregate({
      organizationId: user.organizationId,
      ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
      periodStart: dto.periodStart.toISOString(),
      periodEnd: dto.periodEnd.toISOString(),
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'report.aggregate_requested',
        targetType: 'Organization',
        targetId: user.organizationId,
        metadata: {
          jobId: job.id,
          departmentId: dto.departmentId ?? null,
          periodStart: dto.periodStart.toISOString(),
          periodEnd: dto.periodEnd.toISOString(),
        },
      },
    });

    return { jobId: job.id ?? 'unknown' };
  }
}
