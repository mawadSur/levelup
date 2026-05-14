import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionPayload } from '@levelup/auth-client';
import { Role } from '@levelup/db';
import type {
  CurrentWeekResponse,
  GenerateStudyPlanResponse,
  TeamStudyPlanResponse,
  UpcomingPlansResponse,
} from '@levelup/types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { StudyPlanService } from './study-plan.service';
import { generateStudyPlanInputSchema, type GenerateStudyPlanDto } from './dto/generate.dto';

/**
 * StudyPlan routes.
 *
 * Learner endpoints sit under /study-plan/me, the manager view under
 * /admin/study-plan to match the existing admin-ops convention. AuthGuard +
 * RoleGuard run globally as APP_GUARDs, but we keep the explicit @UseGuards
 * here so the routes are still protected when tested in isolation.
 */
@ApiTags('study-plan')
@UseGuards(AuthGuard, RoleGuard)
@Controller()
export class StudyPlanController {
  constructor(private readonly service: StudyPlanService) {}

  @Get('study-plan/me/current-week')
  getCurrentWeek(@CurrentUser() user: SessionPayload): Promise<CurrentWeekResponse> {
    return this.service.getCurrentWeek(user);
  }

  @Get('study-plan/me/upcoming')
  getUpcoming(@CurrentUser() user: SessionPayload): Promise<UpcomingPlansResponse> {
    return this.service.getUpcoming(user);
  }

  /**
   * POST /study-plan/me/generate
   * Idempotent — if a current-week plan already exists this returns the
   * existing plans with alreadyExists=true. Pass { force: true } to replace.
   */
  @Post('study-plan/me/generate')
  generate(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(generateStudyPlanInputSchema)) dto: GenerateStudyPlanDto,
  ): Promise<GenerateStudyPlanResponse> {
    return this.service.generateFourWeekPlan(user, { force: dto.force });
  }

  /**
   * GET /admin/study-plan/team
   * Manager / admin view. Returns one row per direct-report with their
   * current-week progress + a pace indicator.
   */
  @Get('admin/study-plan/team')
  @Roles(Role.MANAGER)
  team(@CurrentUser() user: SessionPayload): Promise<TeamStudyPlanResponse> {
    return this.service.getTeamCurrentWeek(user);
  }
}
