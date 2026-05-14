import { Module } from '@nestjs/common';
import { AdminOpsController, AdminOrgController } from './admin-ops.controller';
import { AdminOpsService } from './admin-ops.service';

@Module({
  controllers: [AdminOpsController, AdminOrgController],
  providers: [AdminOpsService],
  exports: [AdminOpsService],
})
export class AdminOpsModule {}
