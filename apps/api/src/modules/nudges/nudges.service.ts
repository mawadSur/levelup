import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SessionPayload } from '@levelup/auth-client';
import type { Prisma } from '@levelup/db';
import {
  COACH_NUDGE_ACTIVE_WINDOW_DAYS,
  COACH_NUDGE_VISIBLE_CAP,
  type CoachNudgeDto,
} from '@levelup/types';
import { track } from '@levelup/analytics';
import { PrismaService } from '../prisma';

/**
 * NudgesService — read + lifecycle (dismiss / acted-on) for `CoachNudge` rows.
 *
 * Generation lives in the worker (`generate-coach-nudges` BullMQ job). The API
 * surface here is intentionally tiny: list active nudges for the caller, mark
 * one dismissed, mark one acted-on. All writes are org-scoped via the
 * caller's session — never trust the row's `organizationId` on its own.
 */
@Injectable()
export class NudgesService {
  private readonly logger = new Logger(NudgesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List the active nudges for the calling user. A nudge is "active" when:
   *   - It belongs to the caller (userId + organizationId)
   *   - dismissedAt is NULL
   *   - generatedAt is within the last COACH_NUDGE_ACTIVE_WINDOW_DAYS days
   *
   * The per-user visible cap is enforced here as defence-in-depth even though
   * the generator already trims to the cap at write time.
   */
  async listMyActive(sessionUser: SessionPayload): Promise<CoachNudgeDto[]> {
    const windowStart = new Date(Date.now() - COACH_NUDGE_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.coachNudge.findMany({
      where: {
        userId: sessionUser.userId,
        organizationId: sessionUser.organizationId,
        dismissedAt: null,
        generatedAt: { gte: windowStart },
      },
      orderBy: { generatedAt: 'desc' },
      take: COACH_NUDGE_VISIBLE_CAP,
      select: {
        id: true,
        kind: true,
        body: true,
        suggestedTemplate: true,
        generatedAt: true,
        dismissedAt: true,
        actedOnAt: true,
      },
    });

    // Fire the analytics event for "shown" once per list response. We do this
    // server-side so a malicious client cannot inflate the metric.
    for (const row of rows) {
      track.coachNudgeShown({
        organizationId: sessionUser.organizationId,
        userId: sessionUser.userId,
        nudgeId: row.id,
        kind: row.kind,
      });
    }

    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      body: r.body,
      suggestedTemplate: r.suggestedTemplate,
      generatedAt: r.generatedAt.toISOString(),
      dismissedAt: r.dismissedAt ? r.dismissedAt.toISOString() : null,
      actedOnAt: r.actedOnAt ? r.actedOnAt.toISOString() : null,
    }));
  }

  /**
   * Mark a nudge as dismissed. Owner-only — we authorise via (id, userId,
   * organizationId) on the WHERE clause so a malicious caller cannot dismiss
   * another user's nudge even if they guess the cuid.
   *
   * Idempotent: re-dismissing a row that is already dismissed is a no-op
   * (returns the existing dismissedAt instead of overwriting it).
   */
  async dismiss(
    sessionUser: SessionPayload,
    id: string,
  ): Promise<{ id: string; dismissedAt: string }> {
    const existing = await this.loadOwn(sessionUser, id);
    if (existing.dismissedAt) {
      return { id, dismissedAt: existing.dismissedAt.toISOString() };
    }

    const now = new Date();
    await this.prisma.coachNudge.update({
      where: { id },
      data: { dismissedAt: now },
    });

    await this.writeAudit(sessionUser, 'nudge.dismissed', id, { kind: existing.kind });

    track.coachNudgeDismissed({
      organizationId: sessionUser.organizationId,
      userId: sessionUser.userId,
      nudgeId: id,
      kind: existing.kind,
    });

    return { id, dismissedAt: now.toISOString() };
  }

  /**
   * Mark a nudge as acted-on. Used when the user taps "Try it" and we
   * navigate them to the coach with the suggested template prefilled.
   *
   * Acting on a nudge does NOT dismiss it — we keep it on the strip with
   * `actedOnAt` set so the UI can render a "you tried this" affordance and
   * the row still counts toward the visible cap. The 7-day active window
   * eventually retires it.
   */
  async actedOn(
    sessionUser: SessionPayload,
    id: string,
  ): Promise<{ id: string; actedOnAt: string }> {
    const existing = await this.loadOwn(sessionUser, id);
    if (existing.actedOnAt) {
      return { id, actedOnAt: existing.actedOnAt.toISOString() };
    }

    const now = new Date();
    await this.prisma.coachNudge.update({
      where: { id },
      data: { actedOnAt: now },
    });

    await this.writeAudit(sessionUser, 'nudge.acted_on', id, { kind: existing.kind });

    track.coachNudgeActedOn({
      organizationId: sessionUser.organizationId,
      userId: sessionUser.userId,
      nudgeId: id,
      kind: existing.kind,
    });

    return { id, actedOnAt: now.toISOString() };
  }

  /**
   * Load a nudge that MUST belong to the calling user. Throws 404 on miss
   * and 403 if the row exists but is owned by someone else (the two-error
   * shape matches `CoachService` for consistency in the audit trail).
   */
  private async loadOwn(
    sessionUser: SessionPayload,
    id: string,
  ): Promise<{
    id: string;
    userId: string;
    organizationId: string;
    kind: string;
    dismissedAt: Date | null;
    actedOnAt: Date | null;
  }> {
    const row = await this.prisma.coachNudge.findFirst({
      where: { id, organizationId: sessionUser.organizationId },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        kind: true,
        dismissedAt: true,
        actedOnAt: true,
      },
    });
    if (!row) throw new NotFoundException('Nudge not found');
    if (row.userId !== sessionUser.userId) {
      throw new ForbiddenException('Not the owner of this nudge');
    }
    return row;
  }

  private async writeAudit(
    sessionUser: SessionPayload,
    action: 'nudge.dismissed' | 'nudge.acted_on',
    nudgeId: string,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: sessionUser.organizationId,
          actorId: sessionUser.userId,
          action,
          targetType: 'CoachNudge',
          targetId: nudgeId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Audit writes must never block the parent operation — the user has
      // already mutated their own state and a degraded audit trail is better
      // than a 500. Log and swallow.
      this.logger.warn(`auditLog write failed for ${action}`, err as Error);
    }
  }
}
