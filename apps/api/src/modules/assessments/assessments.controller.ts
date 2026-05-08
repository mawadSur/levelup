import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AssessmentsService } from './assessments.service';
import { startAssessmentSchema } from './dto/start-assessment.dto';
import type { StartAssessmentDto } from './dto/start-assessment.dto';
import { submitAssessmentDtoSchema } from './dto/submit-assessment.dto';
import type { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@Controller('assessments')
@UseGuards(AuthGuard, RoleGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  /**
   * POST /assessments/start
   * Returns the sampled item set (without correctIndex) and a session fingerprint.
   */
  @Post('start')
  start(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(startAssessmentSchema)) dto: StartAssessmentDto,
  ) {
    return this.assessmentsService.startAssessment(user, dto);
  }

  /**
   * POST /assessments/submit
   * Validates the session fingerprint, scores responses, persists, and returns results.
   */
  @Post('submit')
  submit(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(submitAssessmentDtoSchema)) dto: SubmitAssessmentDto,
  ) {
    return this.assessmentsService.submitAssessment(user, dto);
  }

  /**
   * GET /assessments/me
   * Lists the current user's assessment history (newest first), excluding raw itemResponses.
   */
  @Get('me')
  listMine(@CurrentUser() user: SessionPayload) {
    return this.assessmentsService.listMyAssessments(user);
  }

  /**
   * GET /assessments/me/:id
   * Returns a single past assessment with full itemResponses.
   */
  @Get('me/:id')
  getMine(@CurrentUser() user: SessionPayload, @Param('id') id: string) {
    return this.assessmentsService.getMyAssessment(user, id);
  }
}
