import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import type { AiLevel, Role } from '@levelup/db';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { UsersService } from './users.service';
import { updateProfileSchema } from './dto/update-profile.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { updateRoleSchema } from './dto/update-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { setAiLevelSchema } from './dto/set-ai-level.dto';
import type { SetAiLevelDto } from './dto/set-ai-level.dto';
import { leaderboardOptOutSchema, type LeaderboardOptOutInput } from '@levelup/types';
import { z } from 'zod';
import { Role as RoleEnum, AiLevel as AiLevelEnum } from '@levelup/db';

const updateDepartmentSchema = z.object({
  departmentId: z.string().cuid(),
});

@Controller('users')
@UseGuards(AuthGuard, RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('MANAGER')
  listUsers(
    @CurrentUser() user: SessionPayload,
    @Query('role') role?: string,
    @Query('departmentId') departmentId?: string,
    @Query('aiLevel') aiLevel?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.listUsers(user, {
      role: role && Object.values(RoleEnum).includes(role as Role) ? (role as Role) : undefined,
      departmentId,
      aiLevel:
        aiLevel && Object.values(AiLevelEnum).includes(aiLevel as AiLevel)
          ? (aiLevel as AiLevel)
          : undefined,
      q,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('me')
  getMyProfile(@CurrentUser() user: SessionPayload) {
    return this.usersService.getMyProfile(user);
  }

  @Get('me/badges')
  getMyBadges(@CurrentUser() user: SessionPayload) {
    return this.usersService.listMyBadges(user.userId);
  }

  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMyProfile(user, dto);
  }

  @Patch('me/leaderboard-opt-out')
  updateLeaderboardOptOut(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(leaderboardOptOutSchema)) dto: LeaderboardOptOutInput,
  ) {
    return this.usersService.updateLeaderboardOptOut(user, dto);
  }

  @Get(':id/activity')
  getUserActivity(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.usersService.listUserActivity(user, id);
  }

  @Get(':id')
  @Roles('MANAGER')
  getUserById(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.usersService.getUserById(user, id);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  updateUserRole(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) dto: UpdateRoleDto,
  ) {
    return this.usersService.updateUserRole(user, id, dto);
  }

  @Patch(':id/department')
  @Roles('MANAGER')
  updateUserDepartment(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDepartmentSchema)) body: { departmentId: string },
  ) {
    return this.usersService.updateUserDepartment(user, id, body.departmentId);
  }

  @Patch(':id/ai-level')
  updateUserAiLevel(
    @CurrentUser() user: SessionPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setAiLevelSchema)) dto: SetAiLevelDto,
  ) {
    // Access control is handled inside the service (self OR ADMIN/MANAGER)
    return this.usersService.updateUserAiLevel(user, id, dto);
  }

  @Post(':id/deactivate')
  @Roles('ADMIN')
  deactivateUser(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.usersService.deactivateUser(user, id);
  }
}
