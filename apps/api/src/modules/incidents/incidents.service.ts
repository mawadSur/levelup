import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@levelup/db';
import { IncidentKind, IncidentSeverity, IncidentStatus, Role, type Incident } from '@levelup/db';
import type { SensitiveResult } from '@levelup/llm';
import type { SessionPayload } from '@levelup/auth-client';
import { enqueueEmail } from '@levelup/queue';
import { PrismaService } from '../prisma';
import { classifyIncidentSeverity } from './severity-rules';

export interface IncidentDto {
  id: string;
  organizationId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  kind: IncidentKind;
  severity: IncidentSeverity;
  status: IncidentStatus;
  triggeredBy: string;
  signal: Prisma.JsonValue;
  assignedRemediationLabId: string | null;
  assignedRemediationLabSlug: string | null;
  assignedRemediationLabTitle: string | null;
  slaDueAt: string | null;
  openedAt: string;
  resolvedAt: string | null;
}

export interface IncidentDetail extends IncidentDto {
  /** Chronological audit-log trail of state changes for this incident. */
  history: Array<{
    id: string;
    action: string;
    actorId: string | null;
    actorName: string | null;
    metadata: Prisma.JsonValue;
    createdAt: string;
  }>;
}

export interface ListIncidentsFilter {
  severity?: IncidentSeverity[];
  status?: IncidentStatus[];
  includeResolvedSinceDays?: number;
  limit?: number;
}

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Detection — invoked by CoachService when classifySensitive triggers.
  // ---------------------------------------------------------------------------

  /**
   * Inspect a sensitive-data signal and (if it crosses a severity threshold)
   * open a new Incident row + enqueue the CISO email for HIGH/CRITICAL.
   *
   * Safe to call on every sensitive-data trigger — LOW signals are filtered
   * out and return null. Failures are swallowed and logged so this never
   * blocks the coach response.
   */
  async maybeOpenIncident(args: {
    organizationId: string;
    userId: string;
    signal: SensitiveResult;
    userInput: string;
    triggeredBy: 'coach' | 'lab' | 'slack' | 'manual';
  }): Promise<Incident | null> {
    try {
      const classification = classifyIncidentSeverity(args.signal, args.userInput);
      if (!classification) return null;

      const labId = classification.assignedLabSlug
        ? await this.resolveLabId(classification.assignedLabSlug, args.organizationId)
        : null;

      const status =
        classification.severity === IncidentSeverity.MEDIUM
          ? IncidentStatus.SUGGESTED
          : IncidentStatus.OPEN;

      const incident = await this.prisma.incident.create({
        data: {
          organizationId: args.organizationId,
          userId: args.userId,
          kind: classification.kind,
          severity: classification.severity,
          status,
          triggeredBy: args.triggeredBy,
          signal: {
            classification: {
              reason: classification.reason,
              assignedLabSlug: classification.assignedLabSlug,
            },
            sensitive: {
              categories: args.signal.categories,
              reason: args.signal.reason ?? null,
            },
            // Truncate the input snippet so audit/diagnostic payload stays bounded
            // and we never leak the entire raw prompt back into the admin UI.
            inputSnippet: args.userInput.slice(0, 240),
          } as Prisma.InputJsonValue,
          assignedRemediationLabId: labId,
        },
      });

      await this.writeAudit({
        organizationId: args.organizationId,
        actorId: args.userId,
        action: 'incident.opened',
        incidentId: incident.id,
        metadata: {
          kind: incident.kind,
          severity: incident.severity,
          triggeredBy: args.triggeredBy,
          assignedLabSlug: classification.assignedLabSlug,
        },
      });

      if (
        incident.severity === IncidentSeverity.HIGH ||
        incident.severity === IncidentSeverity.CRITICAL
      ) {
        await this.notifyAdmins(incident, classification.reason);
      }

      return incident;
    } catch (err) {
      this.logger.error('IncidentsService.maybeOpenIncident failed', err);
      return null;
    }
  }

  /**
   * Auto-resolution hook — invoked from LabsService.submitAttempt when an
   * attempt passes. Marks any matching OPEN/ACKNOWLEDGED/SUGGESTED incidents
   * as REMEDIATED.
   *
   * Match criteria: `assignedRemediationLabId === passedLabId` AND
   * `userId === actorId`. Multi-tenant scoped by organizationId.
   */
  async tryAutoResolveFromLabAttempt(args: {
    organizationId: string;
    userId: string;
    labId: string;
  }): Promise<number> {
    try {
      const candidates = await this.prisma.incident.findMany({
        where: {
          organizationId: args.organizationId,
          userId: args.userId,
          assignedRemediationLabId: args.labId,
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.SUGGESTED],
          },
        },
        select: { id: true },
      });

      if (candidates.length === 0) return 0;

      const now = new Date();
      await this.prisma.incident.updateMany({
        where: { id: { in: candidates.map((c) => c.id) } },
        data: { status: IncidentStatus.REMEDIATED, resolvedAt: now },
      });

      for (const c of candidates) {
        await this.writeAudit({
          organizationId: args.organizationId,
          actorId: args.userId,
          action: 'incident.remediated',
          incidentId: c.id,
          metadata: { source: 'lab-attempt', labId: args.labId, auto: true },
        });
      }
      return candidates.length;
    } catch (err) {
      this.logger.error('IncidentsService.tryAutoResolveFromLabAttempt failed', err);
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Listing / detail
  // ---------------------------------------------------------------------------

  async list(
    sessionUser: SessionPayload,
    filter: ListIncidentsFilter,
  ): Promise<{ items: IncidentDto[] }> {
    const limit = Math.min(200, Math.max(1, filter.limit ?? 100));

    const where: Prisma.IncidentWhereInput = { organizationId: sessionUser.organizationId };
    if (filter.severity && filter.severity.length > 0) {
      where.severity = { in: filter.severity };
    }
    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status };
    } else if (filter.includeResolvedSinceDays !== undefined) {
      const since = new Date(Date.now() - filter.includeResolvedSinceDays * 24 * 60 * 60 * 1000);
      where.OR = [
        {
          status: {
            in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.SUGGESTED],
          },
        },
        {
          status: { in: [IncidentStatus.REMEDIATED, IncidentStatus.DISMISSED] },
          openedAt: { gte: since },
        },
      ];
    }

    const rows = await this.prisma.incident.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedRemediationLab: { select: { id: true, slug: true, title: true } },
      },
    });

    return { items: rows.map(rowToDto) };
  }

  async get(sessionUser: SessionPayload, id: string): Promise<IncidentDetail> {
    const row = await this.prisma.incident.findFirst({
      where: { id, organizationId: sessionUser.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedRemediationLab: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!row) throw new NotFoundException('Incident not found');

    // RBAC: visible to actor user + MANAGER+.
    const isElevated = sessionUser.role === Role.MANAGER || sessionUser.role === Role.ADMIN;
    if (!isElevated && row.userId !== sessionUser.userId) {
      throw new ForbiddenException('Not authorised to view this incident');
    }

    const auditRows = await this.prisma.auditLog.findMany({
      where: {
        organizationId: sessionUser.organizationId,
        targetType: 'Incident',
        targetId: id,
      },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true } } },
    });

    const history = auditRows.map((a) => ({
      id: a.id,
      action: a.action,
      actorId: a.actorId,
      actorName: a.actor?.name ?? null,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    }));

    return { ...rowToDto(row), history };
  }

  // ---------------------------------------------------------------------------
  // State transitions (MANAGER+ only — enforced at controller layer)
  // ---------------------------------------------------------------------------

  async acknowledge(sessionUser: SessionPayload, id: string): Promise<IncidentDto> {
    return this.transition(sessionUser, id, {
      action: 'incident.acknowledged',
      allowedFrom: [IncidentStatus.OPEN, IncidentStatus.SUGGESTED],
      next: { status: IncidentStatus.ACKNOWLEDGED },
    });
  }

  async promote(sessionUser: SessionPayload, id: string): Promise<IncidentDto> {
    return this.transition(sessionUser, id, {
      action: 'incident.promoted',
      allowedFrom: [IncidentStatus.SUGGESTED],
      next: { status: IncidentStatus.OPEN },
    });
  }

  async dismiss(sessionUser: SessionPayload, id: string, reason: string): Promise<IncidentDto> {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('Dismiss reason is required.');
    }
    return this.transition(sessionUser, id, {
      action: 'incident.dismissed',
      allowedFrom: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.SUGGESTED],
      next: {
        status: IncidentStatus.DISMISSED,
        resolvedAt: new Date(),
      },
      auditMetadata: { reason: trimmed },
    });
  }

  async remediated(sessionUser: SessionPayload, id: string): Promise<IncidentDto> {
    return this.transition(sessionUser, id, {
      action: 'incident.remediated',
      allowedFrom: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.SUGGESTED],
      next: {
        status: IncidentStatus.REMEDIATED,
        resolvedAt: new Date(),
      },
      auditMetadata: { source: 'manual' },
    });
  }

  // ---------------------------------------------------------------------------
  // Manager digest helper — exported for cross-module reuse.
  // ---------------------------------------------------------------------------

  async getOpenIncidentsForOrg(organizationId: string, sinceDate: Date): Promise<IncidentDto[]> {
    const rows = await this.prisma.incident.findMany({
      where: {
        organizationId,
        openedAt: { gte: sinceDate },
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.SUGGESTED],
        },
      },
      orderBy: { openedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedRemediationLab: { select: { id: true, slug: true, title: true } },
      },
    });
    return rows.map(rowToDto);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async transition(
    sessionUser: SessionPayload,
    id: string,
    spec: {
      action:
        | 'incident.acknowledged'
        | 'incident.promoted'
        | 'incident.dismissed'
        | 'incident.remediated';
      allowedFrom: IncidentStatus[];
      next: { status: IncidentStatus; resolvedAt?: Date };
      auditMetadata?: Record<string, unknown>;
    },
  ): Promise<IncidentDto> {
    const existing = await this.prisma.incident.findFirst({
      where: { id, organizationId: sessionUser.organizationId },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('Incident not found');
    if (!spec.allowedFrom.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot ${spec.action} from status ${existing.status}. Allowed: ${spec.allowedFrom.join(', ')}`,
      );
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: spec.next.status,
        ...(spec.next.resolvedAt ? { resolvedAt: spec.next.resolvedAt } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedRemediationLab: { select: { id: true, slug: true, title: true } },
      },
    });

    await this.writeAudit({
      organizationId: sessionUser.organizationId,
      actorId: sessionUser.userId,
      action: spec.action,
      incidentId: id,
      metadata: {
        from: existing.status,
        to: spec.next.status,
        ...(spec.auditMetadata ?? {}),
      },
    });

    return rowToDto(updated);
  }

  private async resolveLabId(slug: string, organizationId: string): Promise<string | null> {
    const lab = await this.prisma.lab.findFirst({
      where: {
        slug,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: { id: true },
    });
    return lab?.id ?? null;
  }

  private async notifyAdmins(incident: Incident, reason: string): Promise<void> {
    const [admins, actor] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          organizationId: incident.organizationId,
          role: Role.ADMIN,
          deactivatedAt: null,
        },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: incident.userId },
        select: { name: true, email: true },
      }),
    ]);

    if (admins.length === 0) {
      this.logger.warn(
        `IncidentsService.notifyAdmins: no admins to notify for org ${incident.organizationId}`,
      );
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? '';
    const incidentUrl = appUrl
      ? `${appUrl.replace(/\/$/, '')}/admin/incidents/${incident.id}`
      : `/admin/incidents/${incident.id}`;

    for (const admin of admins) {
      try {
        await enqueueEmail({
          to: admin.email,
          templateKey: 'incident-opened',
          data: {
            adminName: admin.name,
            learnerName: actor?.name ?? 'Unknown user',
            learnerEmail: actor?.email ?? '',
            severity: incident.severity,
            kind: incident.kind,
            triggeredBy: incident.triggeredBy,
            reason,
            incidentUrl,
            organizationId: incident.organizationId,
          },
        });
      } catch (err) {
        this.logger.error(
          `IncidentsService.notifyAdmins: failed to enqueue email for admin ${admin.id}`,
          err,
        );
      }
    }
  }

  private async writeAudit(args: {
    organizationId: string;
    actorId: string | null;
    action: string;
    incidentId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: args.organizationId,
          actorId: args.actorId,
          action: args.action,
          targetType: 'Incident',
          targetId: args.incidentId,
          metadata: args.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error(`IncidentsService.writeAudit(${args.action}) failed`, err);
    }
  }
}

type IncidentRow = Incident & {
  user: { id: string; name: string; email: string } | null;
  assignedRemediationLab: { id: string; slug: string; title: string } | null;
};

function rowToDto(row: IncidentRow): IncidentDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
    kind: row.kind,
    severity: row.severity,
    status: row.status,
    triggeredBy: row.triggeredBy,
    signal: row.signal,
    assignedRemediationLabId: row.assignedRemediationLabId,
    assignedRemediationLabSlug: row.assignedRemediationLab?.slug ?? null,
    assignedRemediationLabTitle: row.assignedRemediationLab?.title ?? null,
    slaDueAt: row.slaDueAt ? row.slaDueAt.toISOString() : null,
    openedAt: row.openedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}
