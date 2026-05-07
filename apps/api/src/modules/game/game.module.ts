import { Global, Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';

/**
 * GameModule is `@Global()` so callers (LearningModule, CoachModule,
 * PromptsModule, …) can inject `GameService` without each one importing
 * GameModule. Same pattern PrismaModule uses.
 */
@Global()
@Module({
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
