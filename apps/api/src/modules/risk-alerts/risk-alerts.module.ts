import { Global, Module } from '@nestjs/common';
import { RiskAlertsService } from './risk-alerts.service';

/**
 * `@Global()` so any module that imports `RiskAlertsModule` (or any module in
 * the app that gets it registered globally) can inject `RiskAlertsService`
 * without needing to import `RiskAlertsModule` themselves. `CoachModule` just
 * needs it registered in `AppModule`.
 */
@Global()
@Module({
  providers: [RiskAlertsService],
  exports: [RiskAlertsService],
})
export class RiskAlertsModule {}
