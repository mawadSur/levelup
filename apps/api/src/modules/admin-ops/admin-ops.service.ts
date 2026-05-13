/**
 * AdminOpsService — dead-letter queue management + audit log viewer.
 *
 * DLQ retry job-name → enqueue helper mapping:
 *   'cert-pdf'            → enqueueCertPdf(data)
 *   'report-aggregate'    → enqueueReportAggregate(data)
 *   'embed-content'       → enqueueEmbedContent(data)
 *   'send-email'          → enqueueEmail(data)
 *   'data-export'         → enqueueDataExport(data)
 *   'audit-cleanup'       → enqueueAuditCleanup(data)
 *   'manager-digest-cron' → enqueueManagerDigestCron(data)
 *
 * Any unknown jobName → 400 BadRequestException.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SessionPayload } from '@levelup/auth-client';
import {
  enqueueCertPdf,
  enqueueReportAggregate,
  enqueueEmbedContent,
  enqueueEmail,
  enqueueDataExport,
  enqueueAuditCleanup,
  enqueueManagerDigestCron,
} from '@levelup/queue';
import {
  CertPdfInput,
  ReportAggregateInput,
  EmbedContentInput,
  SendEmailInput,
  DataExportInput,
  AuditCleanupInput,
  ManagerDigestCronInput,
  JobName,
} from '@levelup/queue';
import { DlqListParams, AuditListParams } from '@levelup/types';
import { Prisma } from '@levelup/db';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type JobData = Record<string, unknown>;

/**
 * Re-enqueue a previously failed job by routing its `jobName` to the
 * corresponding typed enqueue helper. Throws 400 for unknown names.
 *
 * We cast through `unknown` first to satisfy TypeScript's overlap check —
 * `JobData` (Record<string, unknown>) cannot be directly cast to specific
 * input interfaces that require concrete required fields. At runtime the data
 * stored in the DLQ row *was* validated by the original producer, so the
 * shape is correct; we just need the type system to accept the reassertion.
 */
async function reEnqueue(jobName: string, data: JobData): Promise<string> {
  const d = data as unknown;
  switch (jobName as JobName) {
    case 'cert-pdf':
      return assertJobId((await enqueueCertPdf(d as CertPdfInput)).id);
    case 'report-aggregate':
      return assertJobId((await enqueueReportAggregate(d as ReportAggregateInput)).id);
    case 'embed-content':
      return assertJobId((await enqueueEmbedContent(d as EmbedContentInput)).id);
    case 'send-email':
      return assertJobId((await enqueueEmail(d as SendEmailInput)).id);
    case 'data-export':
      return assertJobId((await enqueueDataExport(d as DataExportInput)).id);
    case 'audit-cleanup':
      return assertJobId((await enqueueAuditCleanup(d as AuditCleanupInput)).id);
    case 'manager-digest-cron':
      return assertJobId((await enqueueManagerDigestCron(d as ManagerDigestCronInput)).id);
    default:
      throw new BadRequestException(`Unknown jobName "${jobName}"; cannot re-enqueue`);
  }
}

/**
 * BullMQ's `Job.id` is typed as `string | undefined` because a job
 * that has never been added has no id yet.  After a successful `queue.add()`
 * the id is always present; we guard with an error rather than propagating
 * the `undefined` possibility upward.
 */
function assertJobId(id: string | undefined): string {
  if (!id) throw new Error('BullMQ returned a job with no id');
  return id;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AdminOpsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // DLQ — list
  // --------------------------------------------------------------------------

  async listDlq(params: DlqListParams) {
    const { jobName, since, limit } = params;

    const rows = await this.prisma.deadLetterJob.findMany({
      where: {
        ...(jobName ? { jobName } : {}),
        ...(since ? { createdAt: { gte: new Date(since) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => ({
      ...r,
      data: r.data as unknown,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // --------------------------------------------------------------------------
  // DLQ — get single
  // --------------------------------------------------------------------------

  async getDlqRow(id: string) {
    const row = await this.prisma.deadLetterJob.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`DLQ row ${id} not found`);
    return {
      ...row,
      data: row.data as unknown,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // DLQ — retry
  // --------------------------------------------------------------------------

  async retryDlqRow(id: string, actor: SessionPayload): Promise<{ newJobId: string }> {
    const row = await this.prisma.deadLetterJob.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`DLQ row ${id} not found`);

    const newJobId = await reEnqueue(row.jobName, row.data as JobData);

    await this.writeAudit({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'dlq.retry',
      targetType: 'DeadLetterJob',
      targetId: id,
      metadata: { jobName: row.jobName, originalJobId: row.jobId, newJobId },
    });

    return { newJobId };
  }

  // --------------------------------------------------------------------------
  // DLQ — delete
  // --------------------------------------------------------------------------

  async deleteDlqRow(id: string, actor: SessionPayload): Promise<void> {
    const row = await this.prisma.deadLetterJob.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`DLQ row ${id} not found`);

    await this.prisma.deadLetterJob.delete({ where: { id } });

    await this.writeAudit({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'dlq.delete',
      targetType: 'DeadLetterJob',
      targetId: id,
      metadata: { jobName: row.jobName, originalJobId: row.jobId },
    });
  }

  // --------------------------------------------------------------------------
  // Audit — list (org-scoped + cursor pagination)
  // --------------------------------------------------------------------------

  async listAudit(actor: SessionPayload, params: AuditListParams) {
    const { action, actorId, targetType, since, until, limit, cursor } = params;

    // Decode cursor: base64-encoded JSON { createdAt, id }
    let cursorFilter: { createdAt: Date; id: string } | undefined;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as {
          createdAt: string;
          id: string;
        };
        cursorFilter = { createdAt: new Date(decoded.createdAt), id: decoded.id };
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }

    const rows = await this.prisma.auditLog.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(action ? { action } : {}),
        ...(actorId ? { actorId } : {}),
        ...(targetType ? { targetType } : {}),
        ...(since || until
          ? {
              createdAt: {
                ...(since ? { gte: new Date(since) } : {}),
                ...(until ? { lte: new Date(until) } : {}),
              },
            }
          : {}),
        // Cursor: rows created before (or at the same time but with smaller id)
        ...(cursorFilter
          ? {
              OR: [
                { createdAt: { lt: cursorFilter.createdAt } },
                { createdAt: cursorFilter.createdAt, id: { lt: cursorFilter.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // fetch one extra to determine if there's a next page
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = pageRows[pageRows.length - 1];

    const nextCursor =
      hasMore && lastRow
        ? Buffer.from(
            JSON.stringify({
              createdAt: lastRow.createdAt.toISOString(),
              id: lastRow.id,
            }),
          ).toString('base64')
        : null;

    return {
      rows: pageRows.map((r) => ({
        ...r,
        metadata: r.metadata as Record<string, unknown> | null,
        createdAt: r.createdAt.toISOString(),
        actor: r.actor ? { id: r.actor.id, name: r.actor.name ?? '', email: r.actor.email } : null,
      })),
      nextCursor,
    };
  }

  // --------------------------------------------------------------------------
  // Audit — distinct actions (for filter dropdown)
  // --------------------------------------------------------------------------

  async listAuditActions(actor: SessionPayload): Promise<string[]> {
    const results = await this.prisma.auditLog.findMany({
      where: { organizationId: actor.organizationId },
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
      take: 200,
    });
    return results.map((r) => r.action);
  }

  // --------------------------------------------------------------------------
  // Private helper: write audit log
  // --------------------------------------------------------------------------

  private async writeAudit(params: {
    organizationId: string;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
