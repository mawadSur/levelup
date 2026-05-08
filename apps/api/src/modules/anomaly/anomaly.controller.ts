import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { AnomalyService } from './anomaly.service';
import { listAnomaliesQuerySchema } from '@levelup/types';

@Controller('anomalies')
@UseGuards(RoleGuard)
export class AnomalyController {
  constructor(private readonly anomalyService: AnomalyService) {}

  /**
   * GET /anomalies
   * Returns paginated anomaly alerts scoped to the caller's org.
   * Query params: severity, kind, since, unacknowledged, cursor, limit.
   */
  @Get()
  @Roles('MANAGER')
  listAlerts(@CurrentUser() user: SessionPayload, @Query() rawQuery: Record<string, string>) {
    const query = listAnomaliesQuerySchema.parse(rawQuery);
    return this.anomalyService.listAlerts(user, query);
  }

  /**
   * GET /anomalies/unack-count
   * Returns the count of unacknowledged alerts for the nav badge.
   */
  @Get('unack-count')
  @Roles('MANAGER')
  countUnacknowledged(@CurrentUser() user: SessionPayload) {
    return this.anomalyService.countUnacknowledged(user.organizationId);
  }

  /**
   * POST /anomalies/:id/acknowledge
   * Marks an alert as acknowledged. Audited.
   */
  @Post(':id/acknowledge')
  @Roles('MANAGER')
  acknowledge(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.anomalyService.acknowledge(id, user);
  }
}
