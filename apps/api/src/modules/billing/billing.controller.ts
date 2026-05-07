import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Plan as PlanEnum } from '@levelup/db';
import type { SessionPayload } from '@levelup/auth-client';
import {
  ensureCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  planSeatsFor,
  isWithinSeatLimit,
} from '@levelup/billing';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../prisma';
import type { BillingService } from './billing.service';
import {
  createCheckoutSessionBodySchema,
  type CreateCheckoutSessionBodyDto,
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
    const { url, sessionId } = await createCheckoutSession({
      organizationId: org.id,
      customerId,
      plan: dto.plan,
    });

    // 4. Audit log.
    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorId: user.userId,
        action: 'billing.checkout_started',
        targetType: 'Organization',
        targetId: org.id,
        metadata: { plan: dto.plan, sessionId, customerId },
      },
    });

    // Fire-and-forget analytics — must never throw into the caller.
    track.checkoutStarted({
      organizationId: org.id,
      userId: user.userId,
      plan: dto.plan as 'STARTER' | 'GROWTH' | 'ENTERPRISE',
    });

    return { url, sessionId };
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

    const seats = planSeatsFor(dto.plan);
    const wouldExceed = !isWithinSeatLimit(dto.plan, currentSeats);

    // Return the named tier rather than dollar amounts; the UI maps tier → price.
    const PLAN_TIER_MAP: Record<PlanEnum, 'starter' | 'growth' | 'enterprise'> = {
      [PlanEnum.STARTER]: 'starter',
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
