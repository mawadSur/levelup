import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { LessonsService } from './lessons.service';
import { upsertLessonSchema } from './dto/upsert-lesson.dto';
import type { UpsertLessonDto } from './dto/upsert-lesson.dto';

const reorderSchema = z.object({
  lessonIds: z.array(z.string().cuid()).min(1),
});
type ReorderDto = z.infer<typeof reorderSchema>;

@Controller()
@UseGuards(RoleGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  /** GET /paths/:pathId/lessons */
  @Get('paths/:pathId/lessons')
  listLessons(@Param('pathId') pathId: string, @CurrentUser() user: SessionPayload) {
    return this.lessonsService.listLessons(pathId, user);
  }

  /** GET /lessons/:id */
  @Get('lessons/:id')
  getLesson(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.lessonsService.getLesson(id, user);
  }

  /** POST /paths/:pathId/lessons */
  @Post('paths/:pathId/lessons')
  @Roles('MANAGER')
  createLesson(
    @Param('pathId') pathId: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(upsertLessonSchema)) dto: UpsertLessonDto,
  ) {
    return this.lessonsService.createLesson(pathId, user, dto);
  }

  /** PATCH /lessons/:id */
  @Patch('lessons/:id')
  @Roles('MANAGER')
  updateLesson(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(upsertLessonSchema)) dto: UpsertLessonDto,
  ) {
    return this.lessonsService.updateLesson(id, user, dto);
  }

  /** DELETE /lessons/:id */
  @Delete('lessons/:id')
  @Roles('ADMIN')
  deleteLesson(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.lessonsService.deleteLesson(id, user);
  }

  /** POST /paths/:pathId/lessons/reorder */
  @Post('paths/:pathId/lessons/reorder')
  @Roles('MANAGER')
  reorderLessons(
    @Param('pathId') pathId: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(reorderSchema)) dto: ReorderDto,
  ) {
    return this.lessonsService.reorderLessons(pathId, user, dto.lessonIds);
  }
}
