import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { createQuizSchema } from './quizzes.service';
import type { CreateQuizDto, QuizzesService } from './quizzes.service';
import { submitAttemptBodySchema } from './dto/submit-attempt.dto';
import type { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Controller()
@UseGuards(RoleGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  /** GET /lessons/:lessonId/quizzes */
  @Get('lessons/:lessonId/quizzes')
  listQuizzes(@Param('lessonId') lessonId: string, @CurrentUser() user: SessionPayload) {
    return this.quizzesService.listQuizzes(lessonId, user);
  }

  /** GET /quizzes/:id */
  @Get('quizzes/:id')
  getQuiz(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.quizzesService.getQuiz(id, user);
  }

  /** POST /lessons/:lessonId/quizzes */
  @Post('lessons/:lessonId/quizzes')
  @Roles('MANAGER')
  createQuiz(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto,
  ) {
    return this.quizzesService.createQuiz(lessonId, user, dto);
  }

  /** PATCH /quizzes/:id */
  @Patch('quizzes/:id')
  @Roles('MANAGER')
  updateQuiz(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto,
  ) {
    return this.quizzesService.updateQuiz(id, user, dto);
  }

  /** DELETE /quizzes/:id */
  @Delete('quizzes/:id')
  @Roles('ADMIN')
  deleteQuiz(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.quizzesService.deleteQuiz(id, user);
  }

  /** POST /quizzes/:id/attempt */
  @Post('quizzes/:id/attempt')
  submitAttempt(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(submitAttemptBodySchema)) dto: SubmitAttemptDto,
  ) {
    return this.quizzesService.submitAttempt(id, user, dto);
  }

  /** GET /quizzes/:id/my-attempts */
  @Get('quizzes/:id/my-attempts')
  getMyAttempts(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.quizzesService.getMyAttempts(id, user);
  }
}
