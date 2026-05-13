import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { verifyWebhook, parseEvent, isStubMode } from '@levelup/billing';
import { Prisma } from '@levelup/db';
import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma';

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
      case 'subscription.created':
      case 'subscription.updated': {
        // Treat created and updated identically — both arrive as a fully
        // resolved subscription state, and Stripe is not consistent about
        // which one fires first on initial checkout. Idempotent updates
        // mean replays are safe.
        await this.billingService.recordSubscriptionChange({
          orgId: parsed.organizationId,
          plan: parsed.plan,
          billingInterval: parsed.interval,
          planSeats: parsed.quantity,
          ...(parsed.type === 'subscription.created' && { customerId: parsed.customerId }),
          subscriptionId: parsed.subscriptionId,
          stripePriceId: parsed.priceId,
          subscriptionStatus: parsed.status,
        });
        // Stop the trial-expiry job from processing this org now that they
        // have a paid subscription on file.
        await this.prisma.organization
          .update({
            where: { id: parsed.organizationId },
            data: { trialEndsAt: null },
          })
          .catch(() => undefined);
        await this.auditWebhook(parsed.organizationId, 'billing.subscription_synced', {
          eventType: parsed.type,
          subscriptionId: parsed.subscriptionId,
          plan: parsed.plan,
          interval: parsed.interval,
          quantity: parsed.quantity,
          priceId: parsed.priceId,
          status: parsed.status,
          ...(parsed.type === 'subscription.created' && { customerId: parsed.customerId }),
        });
        break;
      }

      case 'subscription.deleted': {
        // Don't archive immediately — give the customer a 7-day grace
        // window to reactivate via the billing portal. archivedAt is set
        // to now()+7d; the trial-expiry worker treats archivedAt as a
        // hard cutoff for reads.
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.organization
          .update({
            where: { id: parsed.organizationId },
            data: {
              subscriptionStatus: 'canceled',
              archivedAt: sevenDaysFromNow,
            },
          })
          .catch(() => undefined);
        await this.auditWebhook(parsed.organizationId, 'billing.subscription_canceled', {
          subscriptionId: parsed.subscriptionId,
          archivedAt: sevenDaysFromNow.toISOString(),
          gracePeriodDays: 7,
        });
        break;
      }

      case 'checkout.completed': {
        const org = await this.prisma.organization.findUnique({
          where: { id: parsed.organizationId },
          select: { stripeCustomerId: true },
        });
        const customerUpdate = !org?.stripeCustomerId ? parsed.customerId : undefined;
        await this.billingService.recordSubscriptionChange({
          orgId: parsed.organizationId,
          plan: parsed.plan,
          billingInterval: parsed.interval,
          ...(customerUpdate !== undefined && { customerId: customerUpdate }),
        });
        await this.auditWebhook(parsed.organizationId, 'webhook.stripe.checkout.completed', {
          plan: parsed.plan,
          interval: parsed.interval,
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
        // Set status + flag so the dunning UI can surface it; org is not
        // archived here — the customer should be given a chance to retry.
        await this.prisma.organization
          .update({
            where: { id: parsed.organizationId },
            data: {
              subscriptionStatus: 'past_due',
              paymentFailed: true,
              paymentFailedAt: new Date(),
            },
          })
          .catch(() => undefined);
        await this.auditWebhook(parsed.organizationId, 'billing.payment_failed', {
          subscriptionId: parsed.subscriptionId,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        // Clear the failed flag if a previous payment_failed had set it.
        // Use updateMany so the no-op case (org never failed) doesn't
        // throw on unique-fk mismatch — it just affects 0 rows.
        await this.prisma.organization
          .updateMany({
            where: {
              id: parsed.organizationId,
              paymentFailed: true,
            },
            data: {
              paymentFailed: false,
              paymentFailedAt: null,
            },
          })
          .catch(() => undefined);
        await this.auditWebhook(parsed.organizationId, 'billing.payment_succeeded', {
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
