import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionPayload } from '@levelup/auth-client';
import { isWithinSeatLimit, planSeatsFor } from '@levelup/billing';
import type { PrismaService } from '../prisma';

/**
 * PlanEnforcementGuard
 *
 * Blocks a request when the organisation has already reached or exceeded the
 * seat limit for its current plan.  Apply with `@UseGuards(PlanEnforcementGuard)`
 * on any endpoint that consumes a seat (e.g. invite, bulk-import).
 *
 * Returns HTTP 403 with a structured error body so the UI can prompt an
 * upgrade rather than showing a generic error page:
 *
 *   { "error": { "code": "PLAN_LIMIT", "upgradeUrl": "/billing/checkout" } }
 */
@Injectable()
export class PlanEnforcementGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: SessionPayload }>();

    const user = request.user;
    if (!user) {
      // AuthGuard should have already rejected unauthenticated requests;
      // bail out gracefully just in case of guard ordering issues.
      throw new ForbiddenException('Not authenticated');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true, planSeats: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Derive effective seat cap: custom override first, plan default second.
    const effectiveCap = org.planSeats > 0 ? org.planSeats : planSeatsFor(org.plan);

    const currentCount = await this.prisma.user.count({
      where: { organizationId: user.organizationId },
    });

    // isWithinSeatLimit uses the plan's default cap; if the org has a custom
    // override we compare against that directly.
    const withinLimit =
      org.planSeats > 0 ? currentCount < effectiveCap : isWithinSeatLimit(org.plan, currentCount);

    if (!withinLimit) {
      throw new ForbiddenException({
        error: {
          code: 'PLAN_LIMIT',
          upgradeUrl: '/billing/checkout',
        },
      });
    }

    return true;
  }
}
