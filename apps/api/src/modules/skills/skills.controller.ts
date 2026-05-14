import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { SkillSummary, TeamSkillHeatmap, UserSkillRow } from '@levelup/types';
import { SkillsService } from './skills.service';
import { createSkillSchema, type CreateSkillDto } from './dto/create-skill.dto';

@Controller()
@UseGuards(AuthGuard, RoleGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('skills')
  list(@CurrentUser() user: SessionPayload): Promise<SkillSummary[]> {
    return this.skillsService.listVisibleSkills(user);
  }

  @Get('skills/me')
  me(@CurrentUser() user: SessionPayload): Promise<UserSkillRow[]> {
    return this.skillsService.listMySkills(user);
  }

  @Get('skills/:slug')
  bySlug(@CurrentUser() user: SessionPayload, @Param('slug') slug: string): Promise<SkillSummary> {
    return this.skillsService.getSkillBySlug(user, slug);
  }

  @Get('admin/skills/team')
  @Roles('MANAGER')
  team(
    @CurrentUser() user: SessionPayload,
    @Query('limit') limit?: string,
  ): Promise<TeamSkillHeatmap> {
    const parsed = limit ? parseInt(limit, 10) : undefined;
    return this.skillsService.getTeamHeatmap(user, {
      limit: Number.isFinite(parsed) ? (parsed as number) : undefined,
    });
  }

  @Post('admin/skills')
  @Roles('ADMIN')
  create(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createSkillSchema)) dto: CreateSkillDto,
  ): Promise<SkillSummary> {
    return this.skillsService.createOrgSkill(user, dto);
  }
}
