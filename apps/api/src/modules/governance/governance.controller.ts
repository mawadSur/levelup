/**
 * GovernanceController — admin-only CISO surface.
 *
 * All routes are gated on `@Roles('ADMIN')`. Managers do not see this module
 * (governance has stricter blast radius than operational anomaly triage).
 *
 * Base path: /governance
 */

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GovernanceService } from './governance.service';
import {
  generateReportSchema,
  triggerFeedQuerySchema,
  type GenerateReportDto,
  type TriggerFeedQueryDto,
} from './dto/governance-query.dto';

@Controller('governance')
@UseGuards(AuthGuard, RoleGuard)
@Roles('ADMIN')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  // -------------------------------------------------------------------------
  // GET /governance/posture — top-row KPIs (4 numbers)
  // -------------------------------------------------------------------------
  @Get('posture')
  getPosture(@CurrentUser() user: SessionPayload) {
    return this.governanceService.getPosture(user, 30);
  }

  // -------------------------------------------------------------------------
  // GET /governance/risk-by-dept — risk table data
  // -------------------------------------------------------------------------
  @Get('risk-by-dept')
  getRiskByDept(@CurrentUser() user: SessionPayload) {
    return this.governanceService.getRiskByDept(user, 30);
  }

  // -------------------------------------------------------------------------
  // GET /governance/trigger-feed?limit=50 — sensitive-data feed (redacted)
  // -------------------------------------------------------------------------
  @Get('trigger-feed')
  getTriggerFeed(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(triggerFeedQuerySchema)) query: TriggerFeedQueryDto,
  ) {
    return this.governanceService.getTriggerFeed(user, query);
  }

  // -------------------------------------------------------------------------
  // GET /governance/policy-coverage — (dept × section) completion matrix
  // -------------------------------------------------------------------------
  @Get('policy-coverage')
  getPolicyCoverage(@CurrentUser() user: SessionPayload) {
    return this.governanceService.getPolicyCoverage(user);
  }

  // -------------------------------------------------------------------------
  // POST /governance/report — kicks off a PDF report generation job
  // -------------------------------------------------------------------------
  @Post('report')
  generateReport(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(generateReportSchema)) body: GenerateReportDto,
  ) {
    return this.governanceService.generateReport(user, body);
  }

  // -------------------------------------------------------------------------
  // GET /governance/report/:id — status + signed URL when ready
  // -------------------------------------------------------------------------
  @Get('report/:id')
  getReportStatus(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.governanceService.getReportStatus(user, id);
  }
}
