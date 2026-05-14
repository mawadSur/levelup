/**
 * BenchmarksController — CR.EXP4 (cross-tenant industry benchmarks).
 *
 * Two surfaces:
 *   - GET  /api/benchmarks/me                    — MANAGER+
 *   - PATCH /api/orgs/me/benchmark-opt-out       — ADMIN only
 *
 * The opt-out toggle lives under /orgs/me to match the broader org-settings
 * URL space rather than nest control plane mutations under /benchmarks.
 */

import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BenchmarksService } from './benchmarks.service';
import { updateBenchmarkOptOutSchema, type UpdateBenchmarkOptOutDto } from './dto/benchmarks.dto';

@Controller('benchmarks')
@UseGuards(AuthGuard, RoleGuard)
@Roles('MANAGER')
export class BenchmarksController {
  constructor(private readonly benchmarksService: BenchmarksService) {}

  @Get('me')
  getMyOrgBenchmarks(@CurrentUser() user: SessionPayload) {
    return this.benchmarksService.getForMyOrg(user);
  }
}

@Controller('orgs/me')
@UseGuards(AuthGuard, RoleGuard)
export class BenchmarkOptOutController {
  constructor(private readonly benchmarksService: BenchmarksService) {}

  @Patch('benchmark-opt-out')
  @Roles('ADMIN')
  updateOptOut(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(updateBenchmarkOptOutSchema)) dto: UpdateBenchmarkOptOutDto,
  ) {
    return this.benchmarksService.setOptOut(user, dto.optOut);
  }
}
