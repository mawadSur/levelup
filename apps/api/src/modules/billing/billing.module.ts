import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

/**
 * BillingModule
 *
 * Exposes BillingService so other modules (e.g. WebhooksModule) can import it
 * without re-declaring the service as a provider.
 */
@Module({
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
