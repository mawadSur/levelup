import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { SlackController } from './slack.controller';
import { IntegrationsService } from './integrations.service';
import { SlackService } from './slack.service';

@Module({
  controllers: [IntegrationsController, SlackController],
  providers: [IntegrationsService, SlackService],
  exports: [IntegrationsService, SlackService],
})
export class IntegrationsModule {}
