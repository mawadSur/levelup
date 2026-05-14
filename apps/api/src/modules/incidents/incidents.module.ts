import { Global, Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

/**
 * `@Global()` so any module that needs `IncidentsService` (e.g. CoachModule's
 * detection hook, LabsModule's auto-resolution hook, future manager-digest
 * extension) can inject it without an explicit module import.
 */
@Global()
@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
