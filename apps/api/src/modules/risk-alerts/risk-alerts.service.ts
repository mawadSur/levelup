import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { enqueueEmail } from '@levelup/queue';

/**
 * Threshold: if a user has hit this many `coach.sensitive_data_detected`
 * events in the last 30 days we classify it as HIGH risk and notify managers.
 */
const HIGH_RISK_COUNT_THRESHOLD = 3;

/** Period window in days for both the risk count and the dedup guard. */
const WINDOW_DAYS = 30;

/** Maximum number of managers to fan-out to when no dept match is found. */
const MAX_ORG_MANAGER_FANOUT = 5;

@Injectable()
export class RiskAlertsService {
  private readonly logger = new Logger(RiskAlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Counts the user's `coach.sensitive_data_detected` audit events in the last
   * 30 days; if the count has just reached/crossed the HIGH threshold (3),
   * fire one notification to each MANAGER in the user's department (falling
   * back to all org managers, capped at 5).
   *
   * Idempotent — uses a `risk_alert.email_sent` audit log entry to avoid
   * re-emailing within the same 30-day window.
   */
  async checkAndNotify(userId: string): Promise<void> {
    const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // 1. Load user profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    if (!user) {
      this.logger.warn(`RiskAlertsService: user ${userId} not found`);
      return;
    }

    // 2. Count sensitive-data events in the last 30 days
    const sensitiveCount = await this.prisma.auditLog.count({
      where: {
        actorId: userId,
        action: 'coach.sensitive_data_detected',
        createdAt: { gte: windowStart },
      },
    });

    if (sensitiveCount < HIGH_RISK_COUNT_THRESHOLD) {
      return;
    }

    // 3. Deduplicate: check for an existing risk_alert.email_sent event in the window
    const alreadySent = await this.prisma.auditLog.findFirst({
      where: {
        actorId: userId,
        action: 'risk_alert.email_sent',
        createdAt: { gte: windowStart },
      },
      select: { id: true },
    });

    if (alreadySent) {
      return; // Already notified within this 30-day window
    }

    // 4. Find managers in the user's org (prefer same-dept managers)
    const allOrgManagers = await this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: 'MANAGER',
        deactivatedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
      },
    });

    let targetManagers = user.departmentId
      ? allOrgManagers.filter((m) => m.departmentId === user.departmentId)
      : [];

    // Fall back to all org managers (capped) when no dept-level managers found
    if (targetManagers.length === 0) {
      targetManagers = allOrgManagers.slice(0, MAX_ORG_MANAGER_FANOUT);
    }

    if (targetManagers.length === 0) {
      this.logger.warn(
        `RiskAlertsService: no managers found to notify for user ${userId} in org ${user.organizationId}`,
      );
      return;
    }

    const departmentName = user.department?.name ?? null;
    const managerIds: string[] = [];

    // 5. Enqueue one email per manager
    for (const manager of targetManagers) {
      try {
        await enqueueEmail({
          to: manager.email,
          templateKey: 'risk-alert-email',
          data: {
            managerName: manager.name,
            learnerName: user.name,
            learnerEmail: user.email,
            departmentName: departmentName ?? 'N/A',
            sensitiveCount,
            periodDays: WINDOW_DAYS,
            organizationId: user.organizationId,
          },
        });
        managerIds.push(manager.id);
      } catch (err) {
        this.logger.error(
          `RiskAlertsService: failed to enqueue email for manager ${manager.id}`,
          err,
        );
      }
    }

    // 6. Audit log: risk_alert.email_sent
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: userId,
        action: 'risk_alert.email_sent',
        targetType: 'User',
        targetId: userId,
        metadata: {
          count: sensitiveCount,
          managerIds,
          periodDays: WINDOW_DAYS,
        },
      },
    });

    this.logger.log(
      `RiskAlertsService: notified ${managerIds.length} manager(s) about user ${userId} (${sensitiveCount} events)`,
    );
  }
}
