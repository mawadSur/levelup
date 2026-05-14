import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AssessmentsService } from './assessments.service';
import { startAssessmentSchema } from './dto/start-assessment.dto';
import { StartAssessmentDto } from './dto/start-assessment.dto';
import { submitAssessmentDtoSchema } from './dto/submit-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { StudyPlanService } from '../study-plan/study-plan.service';
import { AiLevel, Prisma } from '@levelup/db';
import { PrismaService } from '../prisma';

@Controller('assessments')
@UseGuards(AuthGuard, RoleGuard)
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly studyPlan: StudyPlanService,
    private readonly prisma: PrismaService,
  ) {}

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

  /**
   * POST /assessments/skip
   *
   * Skip the forced baseline. Locks the user at BEGINNER level (the default,
   * so usually a no-op) and seeds the 4-week StudyPlan against that level so
   * the first-screen gate stops firing. The user can still take the assessment
   * later via /assessment.
   *
   * We write an audit row so this lever is observable.
   */
  @Post('skip')
  async skip(
    @CurrentUser() user: SessionPayload,
  ): Promise<{ aiLevel: string; planSeeded: boolean }> {
    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.userId, organizationId: user.organizationId },
      select: { aiLevel: true },
    });
    if (dbUser && dbUser.aiLevel !== AiLevel.BEGINNER) {
      // User already has a non-default level — nothing to write.
    } else {
      await this.prisma.user
        .update({
          where: { id: user.userId },
          data: { aiLevel: AiLevel.BEGINNER },
        })
        .catch(() => {});
    }

    const result = await this.studyPlan.generateFourWeekPlan(user, { force: false });

    await this.prisma.auditLog
      .create({
        data: {
          organizationId: user.organizationId,
          actorId: user.userId,
          action: 'assessment.skipped',
          targetType: 'Assessment',
          targetId: user.userId,
          metadata: {
            planSeeded: !result.alreadyExists,
          } as Prisma.InputJsonValue,
        },
      })
      .catch(() => {});

    return { aiLevel: AiLevel.BEGINNER, planSeeded: !result.alreadyExists };
  }
}
