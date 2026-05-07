import { Module } from '@nestjs/common';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  controllers: [CoachController],
  providers: [
    CoachService,
    // Provided (not APP_GUARD-bound) so it only applies to the controller's
    // routes that explicitly opt in via @UseGuards(RateLimitGuard). The
    // session/listing endpoints intentionally are not rate-limited; only the
    // expensive LLM endpoints are.
    RateLimitGuard,
  ],
  exports: [CoachService],
})
export class CoachModule {}
