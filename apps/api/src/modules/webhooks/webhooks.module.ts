import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { BillingModule } from '../billing/billing.module';

/**
 * WebhooksModule
 *
 * Handles inbound webhooks from Stripe and WorkOS.
 * Imports BillingModule to access BillingService for plan state changes.
 * PrismaService is available globally via PrismaModule.
 */
@Module({
  imports: [BillingModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
