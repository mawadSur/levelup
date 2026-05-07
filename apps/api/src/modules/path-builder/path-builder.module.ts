import { Module } from '@nestjs/common';
import { PathBuilderController } from './path-builder.controller';
import { PathBuilderService } from './path-builder.service';

/**
 * PathBuilderModule — CR.33 AI-generated learning paths.
 *
 * Mounts the `/path-builder/*` API surface used by the admin "Build with AI"
 * UX. The controller enqueues `path-generation` jobs; the worker handler at
 * apps/worker/src/jobs/path-generation.ts fills in the generated draft. The
 * controller exposes accept/cancel endpoints for the admin review workflow.
 */
@Module({
  controllers: [PathBuilderController],
  providers: [PathBuilderService],
  exports: [PathBuilderService],
})
export class PathBuilderModule {}
