import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma';
import { planSeatsFor, isWithinSeatLimit } from '@levelup/billing';
import type { Plan } from '@levelup/db';

// ---------------------------------------------------------------------------
// Return shapes
// ---------------------------------------------------------------------------

export interface CurrentBillingResult {
  plan: Plan;
  planSeats: number;
  usedSeats: number;
  isOverLimit: boolean;
  customerId: string | null;
  subscriptionId: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate billing state for an org: plan, seat counts, Stripe IDs.
   */
  async getCurrentBilling(orgId: string): Promise<CurrentBillingResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        planSeats: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const usedSeats = await this.prisma.user.count({
      where: { organizationId: orgId },
    });

    const planSeats = org.planSeats > 0 ? org.planSeats : planSeatsFor(org.plan);

    const isOverLimit = !isWithinSeatLimit(org.plan, usedSeats);

    return {
      plan: org.plan,
      planSeats,
      usedSeats,
      isOverLimit,
      customerId: org.stripeCustomerId ?? null,
      subscriptionId: org.stripeSubscriptionId ?? null,
    };
  }

  /**
   * Persist a plan change (and optional subscription/customer update) onto the
   * org row.  Idempotent: calling it twice with the same values is safe — Prisma
   * will issue an UPDATE but nothing changes in the DB.
   */
  async recordPlanChange(
    orgId: string,
    newPlan: Plan,
    customerId?: string | null,
    subscriptionId?: string | null,
  ): Promise<void> {
    this.logger.log(
      `recordPlanChange orgId=${orgId} plan=${newPlan} ` +
        `customerId=${customerId ?? 'unchanged'} ` +
        `subscriptionId=${subscriptionId ?? 'unchanged'}`,
    );

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: newPlan,
        ...(customerId !== undefined && { stripeCustomerId: customerId }),
        ...(subscriptionId !== undefined && {
          stripeSubscriptionId: subscriptionId,
        }),
      },
    });
  }
}
