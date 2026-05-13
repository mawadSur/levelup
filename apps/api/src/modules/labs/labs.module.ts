import { Module } from '@nestjs/common';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';
import { LabsRateLimitGuard } from './labs-rate-limit.guard';

/**
 * LabsModule wires the LabsController + LabsService.
 *
 * The rate limit guard is provided (not APP_GUARD-bound) so it applies only
 * to the routes that opt in via @UseGuards — the list / detail / history
 * routes are not rate-limited because they're free reads.
 *
 * GameService is consumed from the @Global() GameModule and resolves via DI
 * without an explicit import here.
 */
@Module({
  controllers: [LabsController],
  providers: [LabsService, LabsRateLimitGuard],
  exports: [LabsService],
})
export class LabsModule {}
