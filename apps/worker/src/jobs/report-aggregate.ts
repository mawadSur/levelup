/**
 * report-aggregate job handler.
 *
 * Computes the same statistics the ReportingModule serves via:
 *   GET /reports/completion
 *   GET /reports/skills/heatmap
 *
 * Persistence:
 *   The computed stats are written to a `ReportSnapshot` row keyed by the
 *   organization (and optional department) and period bounds. The handler
 *   returns the snapshot's id as `reportId` so callers can fetch the payload
 *   later via the admin reports UI.
 *
 *   A short audit log entry is also written (`report.aggregated`) for
 *   traceability — but it carries only a summary, not the full payload (that
 *   lives on ReportSnapshot.payload).
 *
 * Returns: { reportId }
 */

import type { Job } from 'bullmq';
import type { ReportAggregateInput, ReportAggregateOutput } from '@levelup/queue';
import type { Prisma } from '@levelup/db';
import { prisma } from '@levelup/db';
import { logger } from '../logger.js';

interface CompletionStat {
  userId: string;
  lessonId: string;
  completedAt: Date | null;
}

interface SkillHeatmapRow {
  pathTitle: string;
  completionCount: number;
  totalLearners: number;
}

interface ReportPayload {
  organizationId: string;
  departmentId: string | undefined;
  periodStart: string;
  periodEnd: string;
  totalLearners: number;
  completedLearners: number;
  completionPct: number;
  completionsByPath: SkillHeatmapRow[];
  generatedAt: string;
}

export async function handleReportAggregate(
  job: Job<ReportAggregateInput>,
): Promise<ReportAggregateOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const { organizationId, departmentId, periodStart, periodEnd } = job.data;

  log.info('report-aggregate: starting', { organizationId, departmentId, periodStart, periodEnd });
  const start = Date.now();

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // -------------------------------------------------------------------------
  // Resolve learners in scope
  // -------------------------------------------------------------------------
  const usersInScope = await prisma.user.findMany({
    where: {
      organizationId,
      ...(departmentId ? { departmentId } : {}),
    },
    select: { id: true },
  });

  const userIds = usersInScope.map((u) => u.id);
  const totalLearners = userIds.length;

  // -------------------------------------------------------------------------
  // Completion stats for the period
  // -------------------------------------------------------------------------
  const progressRows: CompletionStat[] = await prisma.userProgress.findMany({
    where: {
      userId: { in: userIds },
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      userId: true,
      lessonId: true,
      completedAt: true,
    },
  });

  const uniqueCompletedUsers = new Set(progressRows.map((r) => r.userId));
  const completedLearners = uniqueCompletedUsers.size;
  const completionPct =
    totalLearners > 0 ? Math.round((completedLearners / totalLearners) * 100) : 0;

  // -------------------------------------------------------------------------
  // Skills heatmap — completions grouped by learning path
  // -------------------------------------------------------------------------
  const completedLessonIds = progressRows.map((r) => r.lessonId);

  const lessonPaths = await prisma.lesson.findMany({
    where: { id: { in: completedLessonIds } },
    select: {
      id: true,
      learningPath: {
        select: { title: true },
      },
    },
  });

  const pathCompletions = new Map<string, Set<string>>();
  for (const row of progressRows) {
    const lesson = lessonPaths.find((l) => l.id === row.lessonId);
    const pathTitle = lesson?.learningPath.title ?? 'Unknown';
    if (!pathCompletions.has(pathTitle)) {
      pathCompletions.set(pathTitle, new Set());
    }
    pathCompletions.get(pathTitle)!.add(row.userId);
  }

  const completionsByPath: SkillHeatmapRow[] = Array.from(pathCompletions.entries()).map(
    ([pathTitle, completedUserSet]) => ({
      pathTitle,
      completionCount: completedUserSet.size,
      totalLearners,
    }),
  );

  // Sort by most completions first
  completionsByPath.sort((a, b) => b.completionCount - a.completionCount);

  // -------------------------------------------------------------------------
  // Assemble payload
  // -------------------------------------------------------------------------
  const payload: ReportPayload = {
    organizationId,
    departmentId,
    periodStart,
    periodEnd,
    totalLearners,
    completedLearners,
    completionPct,
    completionsByPath,
    generatedAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------------------
  // Persist as a ReportSnapshot row.
  // -------------------------------------------------------------------------
  const snapshot = await prisma.reportSnapshot.create({
    data: {
      organizationId,
      departmentId: departmentId ?? null,
      periodStart: startDate,
      periodEnd: endDate,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  // Audit trail — short summary, not the full payload (that lives on the
  // snapshot row above).
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorId: null,
      action: 'report.aggregated',
      targetType: 'ReportSnapshot',
      targetId: snapshot.id,
      metadata: {
        snapshotId: snapshot.id,
        departmentId: departmentId ?? null,
        periodStart,
        periodEnd,
        totalLearners,
        completedLearners,
        completionPct,
      } as Prisma.InputJsonValue,
    },
  });

  const durationMs = Date.now() - start;
  log.info('report-aggregate: completed', {
    organizationId,
    departmentId,
    reportId: snapshot.id,
    completionPct,
    durationMs,
  });

  return { reportId: snapshot.id };
}
