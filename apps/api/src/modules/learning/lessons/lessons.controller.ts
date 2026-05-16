import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { LessonsService } from './lessons.service';
import { upsertLessonSchema } from './dto/upsert-lesson.dto';
import { UpsertLessonDto } from './dto/upsert-lesson.dto';

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

  /**
   * GET /lessons/:lessonId/quiz
   *
   * Returns the (at most one) quiz attached to a lesson in the learner-facing
   * shape consumed by `<QuizRunner>` — `correctIndex` is stripped from every
   * question. Responds 404 when the lesson has no quiz, which the consumer
   * uses to fall through to the Mark-as-read CTA.
   *
   * Org-scoping mirrors `getLesson`: the lesson's path must be either owned
   * by the caller's org or a global (organizationId === null) path.
   */
  @Get('lessons/:lessonId/quiz')
  getLessonQuiz(@Param('lessonId') lessonId: string, @CurrentUser() user: SessionPayload) {
    return this.lessonsService.getLessonQuiz(lessonId, user);
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
