/**
 * governance-report job handler.
 *
 * Builds an evidence-style PDF report covering the requested period:
 *   - Section A: Executive posture (4 KPIs over the period)
 *   - Section B: Risk by department (top-N rows by risk score)
 *   - Section C: Top-10 trigger categories
 *   - Section D: Training completion by published path
 *
 * The document is uploaded to Supabase Storage (or the local filesystem in
 * stub mode) under the `governance-reports` bucket, key = `<orgId>/<jobId>.pdf`.
 *
 * Audit log:
 *   - On success: `governance.report_generated` with byteLength + storagePath.
 *   - On failure: parent BullMQ retry policy applies (attempts: 2). The DLQ
 *     listener wired in main.ts captures terminal failures.
 */

import type { Job } from 'bullmq';
import type { GovernanceReportInput, GovernanceReportOutput } from '@levelup/queue';
import { prisma } from '@levelup/db';
import { uploadGovernanceReport } from '@levelup/storage';
import { logger } from '../logger.js';
import { generateGovernanceReportPdf } from '../governance/pdf.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function handleGovernanceReport(
  job: Job<GovernanceReportInput>,
): Promise<GovernanceReportOutput> {
  const log = logger.withJobId(job.id ?? 'unknown');
  const start = Date.now();
  const { requestId, organizationId, actorId, periodStart, periodEnd, periodLabel } = job.data;

  log.info('governance-report: starting', { requestId, organizationId });

  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);
  const windowDays = Math.max(
    1,
    Math.round((periodEndDate.getTime() - periodStartDate.getTime()) / DAY_MS),
  );

  // -------------------------------------------------------------------------
  // Roll-ups (mirror the API getPosture / getRiskByDept queries, but execute
  // them against the worker's prisma client without a SessionPayload).
  // -------------------------------------------------------------------------

  const [
    organization,
    coachInteractions,
    sensitiveAuditCount,
    highRiskUserGroups,
    totalEmployees,
    completers,
    triggerCategories,
    departmentRows,
    publishedPaths,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.aiCoachSession.count({
      where: { organizationId, createdAt: { gte: periodStartDate, lt: periodEndDate } },
    }),
    prisma.auditLog.count({
      where: {
        organizationId,
        action: 'coach.sensitive_data_detected',
        createdAt: { gte: periodStartDate, lt: periodEndDate },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['actorId'],
      where: {
        organizationId,
        action: 'coach.sensitive_data_detected',
        createdAt: { gte: periodStartDate, lt: periodEndDate },
        actorId: { not: null },
      },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    }),
    prisma.user.count({ where: { organizationId, deactivatedAt: null } }),
    prisma.user.count({
      where: {
        organizationId,
        deactivatedAt: null,
        progress: { some: { status: 'COMPLETED' } },
      },
    }),
    prisma.aiCoachSession.groupBy({
      by: ['category'],
      where: {
        organizationId,
        sensitiveDataDetected: true,
        createdAt: { gte: periodStartDate, lt: periodEndDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.department.findMany({
      where: { organizationId },
      select: { id: true, name: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.learningPath.findMany({
      where: {
        isPublished: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: {
        id: true,
        title: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { orderIndex: 'asc' },
      take: 6,
    }),
  ]);

  const policyCoveragePct =
    totalEmployees === 0 ? 0 : Math.round((completers / totalEmployees) * 100);

  // -------------------------------------------------------------------------
  // Per-dept stats: aggregate triggers + completion at the worker side. The
  // counts are small (≤ a few hundred rows of grouped data) so a simple loop
  // is adequate; the API service does the heavy SQL roll-up because its
  // request is interactive — here we accept ~50–150ms total.
  // -------------------------------------------------------------------------

  const userToDept = new Map<string, string | null>();
  const allUsers = await prisma.user.findMany({
    where: { organizationId, deactivatedAt: null },
    select: { id: true, departmentId: true },
  });
  for (const u of allUsers) userToDept.set(u.id, u.departmentId);

  const triggersByActor = await prisma.auditLog.groupBy({
    by: ['actorId'],
    where: {
      organizationId,
      action: 'coach.sensitive_data_detected',
      createdAt: { gte: periodStartDate, lt: periodEndDate },
    },
    _count: { id: true },
  });
  const triggersByDept = new Map<string | null, number>();
  for (const t of triggersByActor) {
    const dept = t.actorId ? (userToDept.get(t.actorId) ?? null) : null;
    triggersByDept.set(dept, (triggersByDept.get(dept) ?? 0) + t._count.id);
  }

  const sessionsByUser = await prisma.aiCoachSession.groupBy({
    by: ['userId'],
    where: { organizationId, createdAt: { gte: periodStartDate, lt: periodEndDate } },
    _count: { id: true },
  });
  const sessionsByDept = new Map<string | null, number>();
  for (const s of sessionsByUser) {
    const dept = userToDept.get(s.userId) ?? null;
    sessionsByDept.set(dept, (sessionsByDept.get(dept) ?? 0) + s._count.id);
  }

  const deptRows = departmentRows
    .map((d) => {
      const triggers = triggersByDept.get(d.id) ?? 0;
      const sessions = sessionsByDept.get(d.id) ?? 0;
      return {
        name: d.name,
        headcount: d._count.users,
        sessions,
        triggers,
      };
    })
    .filter((r) => r.headcount > 0)
    .sort((a, b) => b.triggers - a.triggers || b.headcount - a.headcount)
    .slice(0, 10);

  // -------------------------------------------------------------------------
  // Render PDF
  // -------------------------------------------------------------------------

  const pdfBuffer = await generateGovernanceReportPdf({
    organizationName: organization?.name ?? 'Your organisation',
    periodLabel: periodLabel ?? defaultPeriodLabel(periodStartDate, periodEndDate),
    periodStart: periodStartDate,
    periodEnd: periodEndDate,
    windowDays,
    posture: {
      totalAiInteractions: coachInteractions,
      sensitiveDataTriggers: sensitiveAuditCount,
      highRiskUsers: highRiskUserGroups.length,
      policyCoveragePct,
    },
    deptRows,
    triggerCategories: triggerCategories
      .filter((c) => c.category)
      .map((c) => ({
        category: (c.category ?? 'GENERAL').toUpperCase(),
        count: c._count.id,
      })),
    paths: publishedPaths.map((p) => ({
      title: p.title,
      lessonCount: p._count.lessons,
    })),
  });

  log.debug('governance-report: pdf rendered', {
    requestId,
    byteLength: pdfBuffer.byteLength,
  });

  // -------------------------------------------------------------------------
  // Upload + audit log
  // -------------------------------------------------------------------------

  const { storagePath, signedUrl } = await uploadGovernanceReport(
    organizationId,
    requestId,
    pdfBuffer,
  );

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorId: actorId ?? null,
      action: 'governance.report_generated',
      targetType: 'GovernanceReport',
      targetId: requestId,
      metadata: {
        requestId,
        storagePath,
        byteLength: pdfBuffer.byteLength,
        windowDays,
        periodStart: periodStartDate.toISOString(),
        periodEnd: periodEndDate.toISOString(),
        durationMs: Date.now() - start,
      },
    },
  });

  log.info('governance-report: completed', {
    requestId,
    storagePath,
    byteLength: pdfBuffer.byteLength,
    durationMs: Date.now() - start,
  });

  return { storagePath, signedUrl, byteLength: pdfBuffer.byteLength };
}

function defaultPeriodLabel(start: Date, end: Date): string {
  const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', fmt)} – ${end.toLocaleDateString('en-US', fmt)}`;
}
