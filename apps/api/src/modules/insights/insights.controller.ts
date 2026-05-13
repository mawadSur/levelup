/**
 * InsightsController — CR.37
 *
 * All endpoints require at least MANAGER role (enforced via @Roles('MANAGER')).
 * ADMIN also satisfies this since RoleGuard uses hierarchical role comparison.
 *
 * Base path: /insights
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InsightsService } from './insights.service';
import {
  topPromptsQuerySchema,
  usageTrendQuerySchema,
  categoryMixQuerySchema,
  type TopPromptsQueryDto,
  type UsageTrendQueryDto,
  type CategoryMixQueryDto,
} from './dto/insights-query.dto';

@Controller('insights')
@UseGuards(AuthGuard, RoleGuard)
@Roles('MANAGER')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  // --------------------------------------------------------------------------
  // GET /insights/top-prompts?period=week|month|all&limit=10
  // --------------------------------------------------------------------------

  @Get('top-prompts')
  getTopPrompts(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(topPromptsQuerySchema)) query: TopPromptsQueryDto,
  ) {
    return this.insightsService.getTopPrompts(user, query);
  }

  // --------------------------------------------------------------------------
  // GET /insights/top-saved-prompts?period=week|month|all&limit=10
  // --------------------------------------------------------------------------

  @Get('top-saved-prompts')
  getTopSavedPrompts(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(topPromptsQuerySchema)) query: TopPromptsQueryDto,
  ) {
    return this.insightsService.getTopSavedPrompts(user, query);
  }

  // --------------------------------------------------------------------------
  // GET /insights/usage-trend?period=30|90|365&interval=day|week
  // --------------------------------------------------------------------------

  @Get('usage-trend')
  getUsageTrend(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(usageTrendQuerySchema)) query: UsageTrendQueryDto,
  ) {
    return this.insightsService.getUsageTrend(user, query);
  }

  // --------------------------------------------------------------------------
  // GET /insights/saves-prevented
  // --------------------------------------------------------------------------

  @Get('saves-prevented')
  getSavesPrevented(@CurrentUser() user: SessionPayload) {
    return this.insightsService.getSavesPrevented(user);
  }

  // --------------------------------------------------------------------------
  // GET /insights/category-mix?period=week|month|all
  // --------------------------------------------------------------------------

  @Get('category-mix')
  getCategoryMix(
    @CurrentUser() user: SessionPayload,
    @Query(new ZodValidationPipe(categoryMixQuerySchema)) query: CategoryMixQueryDto,
  ) {
    return this.insightsService.getCategoryMix(user, query);
  }
}
