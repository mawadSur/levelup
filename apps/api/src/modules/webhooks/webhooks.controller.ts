import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { verifyWebhook, parseEvent, isStubMode } from '@levelup/billing';
import { Plan, Prisma } from '@levelup/db';
import type { BillingService } from '../billing/billing.service';
import type { PrismaService } from '../prisma';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  // -------------------------------------------------------------------------
  // POST /webhooks/stripe
  // -------------------------------------------------------------------------
  //
  // Raw body requirement: the Stripe signature is computed over the exact
  // bytes that Stripe sends. NestJS's default JSON body parser re-serialises
  // the object, which breaks the HMAC. main.ts mounts express.raw() on
  // /api/webhooks/stripe BEFORE the json() middleware so this handler can read
  // `req.rawBody`.

  @Post('stripe')
  @Public()
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    if (isStubMode()) {
      this.logger.warn('Stripe webhook received in stub mode — no processing performed.');
      return { received: true };
    }

    if (!signature) {
      throw new UnauthorizedException('Missing Stripe-Signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException(
        'Raw body is missing — ensure express.raw() middleware is wired ' +
          'before the JSON body parser for /api/webhooks routes.',
      );
    }

    let stripeEvent: ReturnType<typeof verifyWebhook>;
    try {
      stripeEvent = verifyWebhook(rawBody, signature);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Stripe webhook signature verification failed: ${message}`);
      throw new UnauthorizedException('Invalid Stripe signature');
    }

    const alreadyProcessed = await this.recordProcessedEvent(
      stripeEvent.id,
      'stripe',
      stripeEvent.type,
    );
    if (alreadyProcessed) {
      this.logger.log(`Stripe webhook ${stripeEvent.id} already processed; skipping.`);
      return { received: true };
    }

    const parsed = parseEvent(stripeEvent);

    switch (parsed.type) {
      case 'subscription.created': {
        await this.billingService.recordPlanChange(
          parsed.organizationId,
          parsed.plan,
          parsed.customerId,
          parsed.subscriptionId,
        );
        await this.auditWebhook(parsed.organizationId, 'webhook.stripe.subscription.created', {
          subscriptionId: parsed.subscriptionId,
          plan: parsed.plan,
          customerId: parsed.customerId,
        });
        break;
      }

      case 'subscription.updated': {
        await this.billingService.recordPlanChange(
          parsed.organizationId,
          parsed.plan,
          undefined,
          parsed.subscriptionId,
        );
        await this.auditWebhook(parsed.organizationId, 'webhook.stripe.subscription.updated', {
          subscriptionId: parsed.subscriptionId,
          plan: parsed.plan,
          status: parsed.status,
        });
        break;
      }

      case 'subscription.deleted': {
        await this.billingService.recordPlanChange(
          parsed.organizationId,
          Plan.STARTER,
          undefined,
          null,
        );
        await this.auditWebhook(parsed.organizationId, 'webhook.stripe.subscription.deleted', {
          subscriptionId: parsed.subscriptionId,
          downgradedTo: Plan.STARTER,
        });
        break;
      }

      case 'checkout.completed': {
        const org = await this.prisma.organization.findUnique({
          where: { id: parsed.organizationId },
          select: { stripeCustomerId: true },
        });
        const customerUpdate = !org?.stripeCustomerId ? parsed.customerId : undefined;
        await this.billingService.recordPlanChange(
          parsed.organizationId,
          parsed.plan,
          customerUpdate,
          undefined,
        );
        await this.auditWebhook(parsed.organizationId, 'webhook.stripe.checkout.completed', {
          plan: parsed.plan,
          customerId: parsed.customerId,
          linkedCustomer: !!customerUpdate,
        });
        break;
      }

      case 'invoice.payment_failed': {
        this.logger.warn(
          `Payment failed for org ${parsed.organizationId} ` +
            `subscriptionId=${parsed.subscriptionId}`,
        );
        await this.auditWebhook(parsed.organizationId, 'webhook.stripe.invoice.payment_failed', {
          subscriptionId: parsed.subscriptionId,
        });
        break;
      }

      case 'unknown': {
        const eventType: string = parsed.raw.type;
        this.logger.log(`Unhandled Stripe event: ${eventType}`);
        const meta = parsed.raw.data.object as unknown as Record<string, unknown>;
        const orgId =
          (meta['metadata'] as Record<string, unknown> | undefined)?.['organizationId'] ??
          (meta['client_reference_id'] as string | undefined);

        if (typeof orgId === 'string') {
          await this.auditWebhook(orgId, `webhook.stripe.unknown`, {
            eventType,
            stripeEventId: parsed.raw.id,
          });
        }
        break;
      }
    }

    return { received: true };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async recordProcessedEvent(id: string, provider: string, type: string): Promise<boolean> {
    try {
      await this.prisma.processedWebhookEvent.create({
        data: { id, provider, type },
      });
      return false;
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return true;
      }
      throw err;
    }
  }

  private async auditWebhook(
    organizationId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          actorId: null,
          action,
          targetType: 'Organization',
          targetId: organizationId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to write audit log for ${action}: ${message}`);
    }
  }
}
