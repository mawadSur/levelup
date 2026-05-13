import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import type { SessionPayload } from '@levelup/auth-client';
import { getPlanLimit } from '@levelup/billing';
import { Plan } from '@levelup/db';
import { PrismaService } from '../prisma';

/**
 * PlanEnforcementGuard
 *
 * Blocks a request when the organisation has reached or exceeded the seat
 * limit for its current plan, or when its trial has expired. Apply with
 * `@UseGuards(PlanEnforcementGuard)` on any endpoint that consumes a seat
 * (e.g. invite, bulk-import).
 *
 * Three response shapes:
 *
 *   - At ≥80% of cap (soft warn): sets `X-Plan-Seats-Warning: <count>/<cap>`
 *     header and continues. UI can render a banner on the next render.
 *   - At seat cap: HTTP 403 with `{ error: { code: 'PLAN_LIMIT', upgradeUrl }}`.
 *   - Trial expired: HTTP 403 with `{ error: { code: 'TRIAL_EXPIRED', upgradeUrl }}`.
 *   - Org archived: HTTP 403 with `{ error: { code: 'ORG_ARCHIVED', upgradeUrl }}`.
 */
@Injectable()
export class PlanEnforcementGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request & { user?: SessionPayload }>();
    const response = httpCtx.getResponse<Response>();

    const user = request.user;
    if (!user) {
      // AuthGuard should have already rejected unauthenticated requests;
      // bail out gracefully just in case of guard ordering issues.
      throw new ForbiddenException('Not authenticated');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        plan: true,
        planSeats: true,
        trialEndsAt: true,
        archivedAt: true,
        subscriptionStatus: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Archived orgs (post-trial expiry, no upgrade) — block everything except
    // billing checkout. Routes that need to bypass should mark the controller
    // public or skip this guard.
    if (org.archivedAt) {
      throw new ForbiddenException({
        error: { code: 'ORG_ARCHIVED', upgradeUrl: '/billing/checkout' },
      });
    }

    // Trial expiration — block when trialEndsAt has passed and the org has
    // not transitioned to a paid subscription. We treat any non-null
    // subscriptionStatus that isn't 'canceled' as "paid" for this check.
    if (org.plan === Plan.TRIAL && org.trialEndsAt && org.trialEndsAt.getTime() < Date.now()) {
      const isPaid =
        org.subscriptionStatus !== null &&
        org.subscriptionStatus !== 'canceled' &&
        org.subscriptionStatus !== 'unpaid';
      if (!isPaid) {
        throw new ForbiddenException({
          error: { code: 'TRIAL_EXPIRED', upgradeUrl: '/pricing' },
        });
      }
    }

    // Seat cap: prefer the org's custom override, fall back to the plan's
    // configured maximum.
    const effectiveCap = org.planSeats > 0 ? org.planSeats : getPlanLimit(org.plan);

    const currentCount = await this.prisma.user.count({
      where: { organizationId: user.organizationId },
    });

    // Soft warn at ≥ 80% of cap so the UI can show a banner before the
    // request is rejected outright. Never throws — a warning header is the
    // contract.
    if (effectiveCap > 0 && currentCount >= Math.floor(effectiveCap * 0.8)) {
      response.setHeader('X-Plan-Seats-Warning', `${currentCount}/${effectiveCap}`);
    }

    if (currentCount >= effectiveCap) {
      throw new ForbiddenException({
        error: {
          code: 'PLAN_LIMIT',
          upgradeUrl: '/billing/checkout',
          currentSeats: currentCount,
          maxSeats: effectiveCap,
        },
      });
    }

    return true;
  }
}
