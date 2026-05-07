/**
 * ReportingController — T2.14
 *
 * All endpoints require at least MANAGER role (enforced via @Roles('MANAGER')).
 * ADMIN also satisfies this since RoleGuard uses hierarchical role comparison.
 *
 * Base path: /reports
 */

import { Controller, Get, Post, Query, Body, Res, UseGuards, UsePipes } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { ReportingService } from './reporting.service';
import {
  completionFiltersSchema,
  aggregateJobSchema,
  type CompletionFiltersDto,
  type AggregateJobDto,
} from './dto/report-filters.dto';
import { buildCsv } from './csv';

@Controller('reports')
@UseGuards(AuthGuard, RoleGuard)
@Roles('MANAGER')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // --------------------------------------------------------------------------
  // GET /reports/completion
  // --------------------------------------------------------------------------

  @Get('completion')
  getCompletion(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(completionFiltersSchema)) filters: CompletionFiltersDto,
  ) {
    return this.reportingService.getCompletionReport(user, filters);
  }

  // --------------------------------------------------------------------------
  // GET /reports/completion.csv
  // Note: NestJS matches this path before any param route — the literal ".csv"
  // in the path ensures no collision with :id style routes.
  // --------------------------------------------------------------------------

  @Get('completion.csv')
  async getCompletionCsv(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(completionFiltersSchema)) filters: CompletionFiltersDto,
    @Res() res: Response,
  ) {
    const report = await this.reportingService.getCompletionReport(user, filters);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `completion-${user.organizationId}-${dateStr}.csv`;

    const headers = [
      'Name',
      'Role',
      'Department',
      'Lessons Completed',
      'Total Lessons',
      'Completion Rate (%)',
    ];

    const rows = report.byUser.map((row) => [
      row.name,
      row.role,
      row.departmentName ?? '',
      row.completed,
      row.total,
      row.completionRate,
    ]);

    const csv = buildCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // --------------------------------------------------------------------------
  // GET /reports/skills/heatmap
  // --------------------------------------------------------------------------

  @Get('skills/heatmap')
  getSkillsHeatmap(@CurrentUser() user: SessionPayload) {
    return this.reportingService.getSkillsHeatmap(user);
  }

  // --------------------------------------------------------------------------
  // GET /reports/risk-flags
  // --------------------------------------------------------------------------

  @Get('risk-flags')
  getRiskFlags(@CurrentUser() user: SessionPayload) {
    return this.reportingService.getRiskFlags(user);
  }

  // --------------------------------------------------------------------------
  // POST /reports/aggregate
  // --------------------------------------------------------------------------

  @Post('aggregate')
  @Roles('ADMIN')
  enqueueAggregate(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(aggregateJobSchema)) dto: AggregateJobDto,
  ) {
    return this.reportingService.enqueueAggregate(user, dto);
  }
}
