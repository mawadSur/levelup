/**
 * AnomalyService — read-only access to AnomalyAlert rows for admin triage.
 *
 * Only the worker writes new alerts. This service lets admin/manager roles
 * query and acknowledge them.
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SessionPayload } from '@levelup/auth-client';
import { ListAnomaliesQuery, AnomalyAlertDto, ListAnomaliesResponse } from '@levelup/types';
import { Prisma } from '@levelup/db';

@Injectable()
export class AnomalyService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  async listAlerts(
    user: SessionPayload,
    query: ListAnomaliesQuery,
  ): Promise<ListAnomaliesResponse> {
    const where: Prisma.AnomalyAlertWhereInput = {
      organizationId: user.organizationId,
    };

    if (query.severity) where.severity = query.severity;
    if (query.kind) where.kind = query.kind;
    if (query.since) where.createdAt = { gte: new Date(query.since) };
    if (query.unacknowledged === true) where.acknowledgedAt = null;

    // Cursor-based pagination
    const take = query.limit + 1; // fetch one extra to detect nextCursor
    const cursor = query.cursor ? { id: query.cursor } : undefined;

    const [items, total] = await Promise.all([
      this.prisma.anomalyAlert.findMany({
        where,
        take,
        skip: cursor ? 1 : 0,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.anomalyAlert.count({ where }),
    ]);

    let nextCursor: string | null = null;
    const pageItems = items;
    if (items.length > query.limit) {
      pageItems.splice(query.limit);
      nextCursor = pageItems[pageItems.length - 1]?.id ?? null;
    }

    return {
      items: pageItems.map((a) => this.toDto(a)),
      nextCursor,
      total,
    };
  }

  // ---------------------------------------------------------------------------
  // Unacknowledged count (for the nav badge)
  // ---------------------------------------------------------------------------

  async countUnacknowledged(organizationId: string): Promise<number> {
    return this.prisma.anomalyAlert.count({
      where: { organizationId, acknowledgedAt: null },
    });
  }

  // ---------------------------------------------------------------------------
  // Acknowledge
  // ---------------------------------------------------------------------------

  async acknowledge(id: string, user: SessionPayload): Promise<AnomalyAlertDto> {
    const alert = await this.prisma.anomalyAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Anomaly alert not found');
    if (alert.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot acknowledge alert outside your organization');
    }

    const updated = await this.prisma.anomalyAlert.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: user.userId,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.userId,
        action: 'anomaly.acknowledged',
        targetType: 'AnomalyAlert',
        targetId: id,
        metadata: {
          kind: alert.kind,
          severity: alert.severity,
          userId: alert.userId,
        },
      },
    });

    return this.toDto(updated);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toDto(
    alert: Prisma.AnomalyAlertGetPayload<{
      include: { user: { select: { name: true; email: true } } };
    }>,
  ): AnomalyAlertDto {
    return {
      id: alert.id,
      organizationId: alert.organizationId,
      userId: alert.userId,
      kind: alert.kind,
      severity: alert.severity,
      signal: alert.signal as Record<string, unknown>,
      acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
      acknowledgedBy: alert.acknowledgedBy,
      createdAt: alert.createdAt.toISOString(),
      userName: alert.user?.name ?? null,
      userEmail: alert.user?.email ?? null,
    };
  }
}
