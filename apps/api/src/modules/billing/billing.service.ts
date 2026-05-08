import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { getPlanLimit, isWithinSeatLimit } from '@levelup/billing';
import type { Plan, BillingInterval } from '@levelup/db';

// ---------------------------------------------------------------------------
// Return shapes
// ---------------------------------------------------------------------------

export interface CurrentBillingResult {
  plan: Plan;
  billingInterval: BillingInterval | null;
  planSeats: number;
  usedSeats: number;
  isOverLimit: boolean;
  trialEndsAt: Date | null;
  archivedAt: Date | null;
  subscriptionStatus: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  stripePriceId: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate billing state for an org: plan, seat counts, Stripe IDs, and
   * trial / archive lifecycle markers.
   */
  async getCurrentBilling(orgId: string): Promise<CurrentBillingResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        billingInterval: true,
        planSeats: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        archivedAt: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const usedSeats = await this.prisma.user.count({
      where: { organizationId: orgId },
    });

    const planSeats = org.planSeats > 0 ? org.planSeats : getPlanLimit(org.plan);

    const isOverLimit = !isWithinSeatLimit(org.plan, usedSeats);

    return {
      plan: org.plan,
      billingInterval: org.billingInterval ?? null,
      planSeats,
      usedSeats,
      isOverLimit,
      trialEndsAt: org.trialEndsAt ?? null,
      archivedAt: org.archivedAt ?? null,
      subscriptionStatus: org.subscriptionStatus ?? null,
      customerId: org.stripeCustomerId ?? null,
      subscriptionId: org.stripeSubscriptionId ?? null,
      stripePriceId: org.stripePriceId ?? null,
    };
  }

  /**
   * Persist a plan / subscription state change onto the org row. Idempotent:
   * calling twice with the same values is a no-op DB-side. Used by both the
   * webhook handler (Stripe-initiated changes) and admin tools.
   */
  async recordSubscriptionChange(args: {
    orgId: string;
    plan: Plan;
    billingInterval?: BillingInterval | null;
    planSeats?: number | null;
    customerId?: string | null;
    subscriptionId?: string | null;
    stripePriceId?: string | null;
    subscriptionStatus?: string | null;
  }): Promise<void> {
    const {
      orgId,
      plan,
      billingInterval,
      planSeats,
      customerId,
      subscriptionId,
      stripePriceId,
      subscriptionStatus,
    } = args;

    this.logger.log(
      `recordSubscriptionChange orgId=${orgId} plan=${plan} interval=${billingInterval ?? 'unchanged'} ` +
        `seats=${planSeats ?? 'unchanged'} status=${subscriptionStatus ?? 'unchanged'}`,
    );

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan,
        ...(billingInterval !== undefined && { billingInterval }),
        ...(planSeats !== undefined && planSeats !== null && { planSeats }),
        ...(customerId !== undefined && { stripeCustomerId: customerId }),
        ...(subscriptionId !== undefined && { stripeSubscriptionId: subscriptionId }),
        ...(stripePriceId !== undefined && { stripePriceId }),
        ...(subscriptionStatus !== undefined && { subscriptionStatus }),
      },
    });
  }

  /**
   * Legacy alias — older webhook code paths still call recordPlanChange. New
   * code should call recordSubscriptionChange directly.
   */
  async recordPlanChange(
    orgId: string,
    newPlan: Plan,
    customerId?: string | null,
    subscriptionId?: string | null,
  ): Promise<void> {
    await this.recordSubscriptionChange({
      orgId,
      plan: newPlan,
      ...(customerId !== undefined && { customerId }),
      ...(subscriptionId !== undefined && { subscriptionId }),
    });
  }
}
