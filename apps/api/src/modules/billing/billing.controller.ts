import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Plan as PlanEnum, BillingInterval as BillingIntervalEnum } from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import {
  ensureCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  previewSeatProration,
  updateSubscriptionQuantity,
  getPlanLimit,
  getPlanConfig,
  isPerSeat,
  requiresSales,
  isWithinSeatLimit,
} from '@levelup/billing';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma';
import { BillingService } from './billing.service';
import {
  createCheckoutSessionBodySchema,
  type CreateCheckoutSessionBodyDto,
  addSeatsBodySchema,
  type AddSeatsBodyDto,
  previewSeatsQuerySchema,
  type PreviewSeatsQueryDto,
} from './dto/create-checkout-session.dto';
import { track } from '@levelup/analytics';

const previewPlanBodySchema = z.object({
  plan: z.nativeEnum(PlanEnum),
});
type PreviewPlanBodyDto = z.infer<typeof previewPlanBodySchema>;

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('billing')
@UseGuards(AuthGuard, RoleGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  // -------------------------------------------------------------------------
  // POST /billing/checkout — ADMIN only
  // -------------------------------------------------------------------------

  @Post('checkout')
  @Roles('ADMIN')
  async startCheckout(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createCheckoutSessionBodySchema))
    dto: CreateCheckoutSessionBodyDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const interval = dto.interval ?? BillingIntervalEnum.MONTHLY;

    // TRIAL: caller should hit POST /billing/trial instead — checkout is a
    // no-op. We return a 400 so the UI surfaces the wrong-flow gracefully.
    if (dto.plan === PlanEnum.TRIAL) {
      throw new BadRequestException(
        'TRIAL plans do not go through checkout. Use the trial-init endpoint.',
      );
    }

    // ENTERPRISE: sales-led — UI should redirect to a sales contact form.
    if (requiresSales(dto.plan)) {
      return {
        url: null,
        sessionId: null,
        salesLed: true,
        contactEmail: 'hello@ailevel.app',
      };
    }

    // Per-seat tiers must include a quantity within the configured range.
    let quantity: number | undefined;
    if (isPerSeat(dto.plan)) {
      const cfg = getPlanConfig(dto.plan);
      if (!cfg.perSeat) throw new Error('unreachable');
      if (typeof dto.quantity !== 'number') {
        throw new BadRequestException(`quantity is required for per-seat plan "${dto.plan}".`);
      }
      if (dto.quantity < cfg.minSeats || dto.quantity > cfg.maxSeats) {
        throw new BadRequestException(
          `quantity ${dto.quantity} outside allowed range [${cfg.minSeats}..${cfg.maxSeats}] for plan "${dto.plan}".`,
        );
      }
      quantity = dto.quantity;
    }

    // 1. Resolve or create a Stripe customer for this org.
    const { customerId, created } = await ensureCustomer({
      organizationId: org.id,
      email: user.email,
      name: org.name,
      existingCustomerId: org.stripeCustomerId ?? null,
    });

    // 2. Persist the new customer ID when Stripe just created it.
    if (created) {
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // 3. Create the hosted checkout session.
    const result = await createCheckoutSession({
      organizationId: org.id,
      customerId,
      plan: dto.plan,
      interval,
      ...(quantity !== undefined && { quantity }),
    });

    if (!result) {
      // Should be unreachable given the salesLed/TRIAL short circuits above.
      throw new BadRequestException(
        `Plan ${dto.plan} cannot be purchased via self-serve checkout.`,
      );
    }

    // 4. Audit log.
    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: user.userId,
        action: 'billing.checkout_started',
        targetType: 'Organization',
        targetId: org.id,
        metadata: {
          plan: dto.plan,
          interval,
          quantity: quantity ?? null,
          sessionId: result.sessionId,
          customerId,
        },
      },
    });

    // Fire-and-forget analytics — must never throw into the caller.
    // Analytics enum still uses the original 3-tier shape; map per-seat
    // tiers down to the closest legacy bucket so the event still fires.
    const legacyPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE' =
      dto.plan === PlanEnum.STARTER
        ? 'STARTER'
        : dto.plan === PlanEnum.ENTERPRISE
          ? 'ENTERPRISE'
          : 'GROWTH';
    track.checkoutStarted({
      organizationId: org.id,
      userId: user.userId,
      plan: legacyPlan,
    });

    return { url: result.url, sessionId: result.sessionId };
  }

  // -------------------------------------------------------------------------
  // POST /billing/portal — ADMIN only
  // -------------------------------------------------------------------------

  @Post('portal')
  @Roles('ADMIN')
  async openPortal(@CurrentUser() user: SessionPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeCustomerId: true, id: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (!org.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer attached to this organisation. ' + 'Complete a checkout session first.',
      );
    }

    const { url } = await createBillingPortalSession({
      customerId: org.stripeCustomerId,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: user.userId,
        action: 'billing.portal_opened',
        targetType: 'Organization',
        targetId: org.id,
        metadata: { customerId: org.stripeCustomerId },
      },
    });

    return { url };
  }

  // -------------------------------------------------------------------------
  // GET /billing/me — ADMIN or MANAGER
  // -------------------------------------------------------------------------

  @Get('me')
  @Roles('MANAGER')
  async getBillingInfo(@CurrentUser() user: SessionPayload) {
    return this.billingService.getCurrentBilling(user.organizationId);
  }

  // -------------------------------------------------------------------------
  // GET /billing/seats/preview?delta=N — ADMIN only
  // -------------------------------------------------------------------------
  //
  // Returns a prorated cost preview for adding (or removing) `delta` seats.
  // The UI shows the dollar amount in a confirmation modal before committing
  // via POST /billing/seats/add.

  @Get('seats/preview')
  @Roles('ADMIN')
  async previewSeats(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(previewSeatsQuerySchema)) query: PreviewSeatsQueryDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeSubscriptionId: true, planSeats: true, plan: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.stripeSubscriptionId) {
      throw new BadRequestException(
        'No active subscription. Start a paid plan via /billing/checkout first.',
      );
    }

    const newQuantity = Math.max(1, org.planSeats + query.delta);
    const planMax = getPlanLimit(org.plan);
    if (newQuantity > planMax) {
      throw new BadRequestException(
        `New quantity ${newQuantity} exceeds plan maximum ${planMax}. Upgrade plan first.`,
      );
    }

    const preview = await previewSeatProration({
      subscriptionId: org.stripeSubscriptionId,
      newQuantity,
    });

    return preview;
  }

  // -------------------------------------------------------------------------
  // POST /billing/seats/add — ADMIN only
  // -------------------------------------------------------------------------
  //
  // Updates the Stripe subscription's quantity to the requested total and
  // invoices the prorated difference immediately. The webhook handler then
  // reflects the new quantity onto Organization.planSeats.

  @Post('seats/add')
  @Roles('ADMIN')
  async addSeats(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(addSeatsBodySchema)) dto: AddSeatsBodyDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeSubscriptionId: true, planSeats: true, plan: true, id: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.stripeSubscriptionId) {
      throw new BadRequestException(
        'No active subscription. Start a paid plan via /billing/checkout first.',
      );
    }

    const planMax = getPlanLimit(org.plan);
    if (dto.quantity > planMax) {
      throw new BadRequestException(
        `Quantity ${dto.quantity} exceeds plan maximum ${planMax}. Upgrade plan first.`,
      );
    }

    await updateSubscriptionQuantity({
      subscriptionId: org.stripeSubscriptionId,
      newQuantity: dto.quantity,
    });

    // Update planSeats optimistically; the customer.subscription.updated
    // webhook will re-confirm.
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { planSeats: dto.quantity },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: user.userId,
        action: 'billing.seats_added',
        targetType: 'Organization',
        targetId: org.id,
        metadata: {
          previousSeats: org.planSeats,
          newSeats: dto.quantity,
          delta: dto.quantity - org.planSeats,
        },
      },
    });

    return { newQuantity: dto.quantity };
  }

  // -------------------------------------------------------------------------
  // POST /billing/preview-plan — ADMIN or MANAGER
  // -------------------------------------------------------------------------

  @Post('preview-plan')
  @Roles('MANAGER')
  async previewPlan(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(previewPlanBodySchema)) dto: PreviewPlanBodyDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true, planSeats: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const currentSeats = await this.prisma.user.count({
      where: { organizationId: user.organizationId },
    });

    const seats = getPlanLimit(dto.plan);
    const wouldExceed = !isWithinSeatLimit(dto.plan, currentSeats);

    // Return the named tier rather than dollar amounts; the UI maps tier → price.
    const PLAN_TIER_MAP: Record<PlanEnum, string> = {
      [PlanEnum.TRIAL]: 'trial',
      [PlanEnum.STARTER]: 'starter',
      [PlanEnum.TEAM]: 'team',
      [PlanEnum.GROWTH]: 'growth',
      [PlanEnum.ENTERPRISE]: 'enterprise',
    };
    const monthlyPrice = PLAN_TIER_MAP[dto.plan];

    return {
      plan: dto.plan,
      monthlyPrice,
      seats,
      currentSeats,
      wouldExceed,
    };
  }
}
