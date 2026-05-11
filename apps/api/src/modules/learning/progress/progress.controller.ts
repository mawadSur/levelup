import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { getTeamProgressBodySchema, type GetTeamProgressBody } from '@levelup/types';
import type { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(RoleGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /** GET /progress/me */
  @Get('me')
  getMyProgress(@CurrentUser() user: SessionPayload) {
    return this.progressService.getMyProgress(user);
  }

  /** GET /progress/me/paths/:pathId */
  @Get('me/paths/:pathId')
  getMyPathProgress(@Param('pathId') pathId: string, @CurrentUser() user: SessionPayload) {
    return this.progressService.getMyPathProgress(pathId, user);
  }

  /** POST /progress/lessons/:lessonId/start */
  @Post('lessons/:lessonId/start')
  startLesson(@Param('lessonId') lessonId: string, @CurrentUser() user: SessionPayload) {
    return this.progressService.startLesson(lessonId, user);
  }

  /** POST /progress/lessons/:lessonId/complete */
  @Post('lessons/:lessonId/complete')
  completeLesson(@Param('lessonId') lessonId: string, @CurrentUser() user: SessionPayload) {
    return this.progressService.completeLesson(lessonId, user);
  }

  /** GET /progress/users/:userId — ADMIN/MANAGER */
  @Get('users/:userId')
  @Roles('MANAGER')
  getUserProgress(@Param('userId') userId: string, @CurrentUser() user: SessionPayload) {
    return this.progressService.getUserProgress(userId, user);
  }

  /**
   * POST /progress/team — ADMIN/MANAGER bulk progress fetch.
   *
   * POST (not GET) because the userIds array can exceed practical URL length
   * caps. Caps at 200 ids per call (validated by the schema). Returns one
   * `TeamProgressEntry` per requested id; ids outside the caller's org appear
   * with zeros so the client never has to special-case missing rows.
   */
  @Post('team')
  @Roles('MANAGER')
  getTeamProgress(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(getTeamProgressBodySchema))
    dto: GetTeamProgressBody,
  ) {
    return this.progressService.getTeamProgress(user, dto.userIds);
  }
}
