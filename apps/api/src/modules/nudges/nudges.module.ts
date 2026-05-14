import { Module } from '@nestjs/common';
import { NudgesController } from './nudges.controller';
import { NudgesService } from './nudges.service';

@Module({
  controllers: [NudgesController],
  providers: [NudgesService],
  exports: [NudgesService],
})
export class NudgesModule {}
